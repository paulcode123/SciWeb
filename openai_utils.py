import os
from openai import OpenAI
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

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
        # Format context from embeddings
        context_text = "Relevant context from the task and its parent nodes:\n\n"
        for node in node_embeddings:
            if node['context']:
                context_text += f"- {node['context']}\n"
        
        # Create system message with context
        system_message = {
            "role": "system",
            "content": f"""You are an AI assistant helping with task management. Use the following context to inform your responses:

{context_text}

When responding:
1. Reference relevant information from the context when appropriate
2. Keep responses focused and practical
3. Provide specific suggestions based on the context
4. Be encouraging and supportive
"""
        }
        
        # Combine messages with system context
        all_messages = [system_message] + messages
        
        # Get response from OpenAI
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=all_messages,
            temperature=0.7,
            max_tokens=500
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        print(f"Error in chat_with_embeddings: {str(e)}")
        raise 