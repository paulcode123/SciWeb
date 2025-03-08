import os
from openai import OpenAI
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
import re

load_dotenv()



async def generate_embedding(text: str) -> List[float]:
    """
    Generate embeddings for the given text using OpenAI's text-embedding-ada-002 model.
    
    Args:
        text (str): The text to generate embeddings for
        
    Returns:
        List[float]: The embedding vector
    """
    from main import init
    vars = init()
    client = vars['client']
    try:
        response = client.embeddings.create(
            input=text,
            model="text-embedding-ada-002"
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"Error generating embedding: {str(e)}")
        raise

def combine_embeddings(embeddings: List[List[float]]) -> List[float]:
    """
    Combine multiple embeddings by taking their average.
    
    Args:
        embeddings (List[List[float]]): List of embedding vectors
        
    Returns:
        List[float]: The combined embedding vector
    """
    if not embeddings:
        return []
    
    # All embeddings should have the same length
    vector_length = len(embeddings[0])
    num_vectors = len(embeddings)
    
    # Calculate the average of each component
    combined = [sum(vec[i] for vec in embeddings) / num_vectors 
               for i in range(vector_length)]
    
    return combined

def get_node_embeddings(node: Dict[str, Any], nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> List[float]:
    """
    Get the combined embeddings for a node and all its parent nodes.
    
    Args:
        node (Dict): The current node
        nodes (List[Dict]): All nodes in the tree
        edges (List[Dict]): All edges in the tree
        
    Returns:
        List[float]: The combined embedding vector
    """
    # Get all parent nodes
    parent_nodes = []
    current_node = node
    visited = {node['id']}
    
    # Build adjacency list for the graph
    graph = {}
    for edge in edges:
        if edge['from'] not in graph:
            graph[edge['from']] = []
        if edge['to'] not in graph:
            graph[edge['to']] = []
        graph[edge['from']].append(edge['to'])
        graph[edge['to']].append(edge['from'])
    
    # Traverse up the tree to find all parent nodes
    while current_node:
        if current_node.get('context_embedding'):
            parent_nodes.append(current_node)
            
        # Find parent node
        parent = None
        if current_node['id'] in graph:
            for neighbor_id in graph[current_node['id']]:
                if neighbor_id not in visited:
                    neighbor = next((n for n in nodes if n['id'] == neighbor_id), None)
                    if neighbor and neighbor['position']['y'] < current_node['position']['y']:
                        parent = neighbor
                        visited.add(neighbor_id)
                        break
        
        current_node = parent
    
    # Combine embeddings from all parent nodes
    embeddings = [n['context_embedding'] for n in parent_nodes if n.get('context_embedding')]
    return combine_embeddings(embeddings) if embeddings else []

def chat_with_embeddings(messages: List[Dict[str, str]], node_embeddings: List[Dict[str, Any]]) -> str:
    """
    Process chat messages with context embeddings for semantic search.
    
    Args:
        messages (List[Dict[str, str]]): List of chat messages with 'role' and 'content'
        node_embeddings (List[Dict]): List of node embeddings with 'node_id', 'embedding', and 'context'
        
    Returns:
        str: The AI response incorporating semantic context
    """
    from main import init
    vars = init()
    client = OpenAI(api_key=vars['openAIAPI'])
    
    try:
        # Validate and format incoming messages
        formatted_messages = []
        for msg in messages:
            if isinstance(msg, str):
                formatted_messages.append({"role": "user", "content": msg})
            elif isinstance(msg, dict):
                if 'content' in msg:
                    role = msg.get('role', 'user')
                    formatted_messages.append({"role": role, "content": msg['content']})
                elif 'text' in msg:
                    # Convert type to role for consistency
                    role = 'user' if msg.get('type', msg.get('role', '')) == 'user' else 'assistant'
                    formatted_messages.append({"role": role, "content": msg['text']})

        if not formatted_messages:
            return "I apologize, but I couldn't process the message format. Please try rephrasing your message."

        # Get embeddings for the last few messages for better context
        recent_messages = formatted_messages[-10:]  # Consider last 10 messages for context
        query_texts = [msg['content'] for msg in recent_messages]
        
        # Get embeddings for all query texts
        query_embeddings = []
        for text in query_texts:
            response = client.embeddings.create(
                model="text-embedding-ada-002",
                input=text
            )
            query_embeddings.append(response.data[0].embedding)
        
        # Use the average of recent message embeddings as the query
        query_embedding = combine_embeddings(query_embeddings)

        def cosine_similarity(a, b):
            dot_product = sum(x * y for x, y in zip(a, b))
            norm_a = (sum(x * x for x in a) ** 0.5) or 1  # Avoid division by zero
            norm_b = (sum(x * x for x in b) ** 0.5) or 1
            return dot_product / (norm_a * norm_b)

        # Process contexts with sliding windows for longer texts
        WINDOW_SIZE = 3  # Number of sentences per window
        OVERLAP = 1      # Number of sentences overlap between windows
        
        scored_segments = []
        for node in node_embeddings:
            if not (node.get('context') and node.get('embedding')):
                continue
                
            # Split into sentences
            sentences = re.split(r'(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|\!)\s', node['context'])
            sentences = [s.strip() for s in sentences if len(s.strip()) > 10]
            
            # Create overlapping windows of sentences
            for i in range(0, len(sentences), WINDOW_SIZE - OVERLAP):
                window = sentences[i:i + WINDOW_SIZE]
                if not window:
                    continue
                    
                # Combine window sentences
                window_text = ' '.join(window)
                
                # Get embedding for window
                window_response = client.embeddings.create(
                    model="text-embedding-ada-002",
                    input=window_text
                )
                window_embedding = window_response.data[0].embedding
                
                # Calculate similarity
                similarity = cosine_similarity(query_embedding, window_embedding)
                
                # Store with metadata
                scored_segments.append({
                    'text': window_text,
                    'similarity': similarity,
                    'node_id': node['node_id'],
                    'position': i,  # Keep track of position for context
                    'original_node': node  # Store reference to original node
                })

        # Sort by similarity and apply a minimum threshold
        SIMILARITY_THRESHOLD = 0.6
        scored_segments.sort(key=lambda x: x['similarity'], reverse=True)
        relevant_segments = [s for s in scored_segments if s['similarity'] > SIMILARITY_THRESHOLD][:5]

        # Create system message with enhanced context
        if relevant_segments:
            context_text = "Relevant context from the knowledge base:\n\n"
            for i, segment in enumerate(relevant_segments, 1):
                node = segment['original_node']
                context_text += f"{i}. From node {node.get('title', 'Untitled')}:\n"
                context_text += f"{segment['text']}\n"
                context_text += f"(Relevance: {segment['similarity']:.2f})\n\n"
            
            context_text += "\nPlease use this context to provide a detailed and accurate response.\n"
            context_text += "If the context is not directly relevant to the question, rely on your general knowledge instead.\n"
        else:
            context_text = "No highly relevant context found. Providing response based on general knowledge.\n"

        # Prepare messages for chat completion with proper roles
        chat_messages = [
            {"role": "system", "content": context_text}
        ] + formatted_messages
        print(chat_messages)

        # Get chat completion with controlled parameters
        chat_completion = client.chat.completions.create(
            model="gpt-4",
            messages=chat_messages,
            temperature=0.7,  # Balance between creativity and accuracy
            max_tokens=1000,  # Ensure comprehensive responses
            top_p=0.9,       # Slightly reduce randomness
            presence_penalty=0.3,  # Encourage some variety
            frequency_penalty=0.3   # Discourage repetition
        )

        return chat_completion.choices[0].message.content

    except Exception as e:
        print(f"Error in chat_with_embeddings: {str(e)}")
        try:
            # Fallback with simpler context
            simple_messages = [
                {"role": "system", "content": "Please provide a helpful response based on the available information."}
            ] + formatted_messages
            print(simple_messages)
            
            chat_completion = client.chat.completions.create(
                model="gpt-4",
                messages=simple_messages,
                temperature=0.7
            )
            return chat_completion.choices[0].message.content
        except Exception as fallback_error:
            print(f"Fallback error: {str(fallback_error)}")
            return "I apologize, but I encountered an error processing your request. Please try again or rephrase your question." 