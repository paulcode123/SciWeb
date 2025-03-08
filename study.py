from flask import session
import requests
import openai
import time
from database import get_user_data, post_data, update_data
from langchain.chains import LLMChain, SequentialChain
from langchain.memory import ConversationBufferMemory
from datetime import datetime
import random
from langchain_community.document_loaders import PyPDFLoader
import tempfile
import os
import json
from langchain_core.output_parsers import PydanticOutputParser
from langchain.schema import HumanMessage, SystemMessage, AIMessage
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Union, Any
import logging
import base64

from models import *
from output_processor import clean_llm_response, parse_json_response, create_llm_chain
from prompts import *

# Configure logging
logger = logging.getLogger(__name__)

def init_pydantic():
    """Initialize Pydantic output parsers for various response types"""
    return (
        PydanticOutputParser(pydantic_object=ResponseFormat),
        PydanticOutputParser(pydantic_object=ResponseTypeBloom),
        PydanticOutputParser(pydantic_object=FinalEvaluation)
    )

def get_insights(prompts, format=None):
    from main import init
    vars = init()
    if format is None:
        completion = vars['client'].beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=prompts
        )
        insights = completion.choices[0].message.content
    else:
        completion = vars['client'].beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=prompts,
            response_format=format
        )
        insights = completion.choices[0].message.content
    
    print("insights: "+str(insights))
    return insights

def get_insights_from_file(prompts, format, file_id):
    from main import init
    vars = init()
    assistant = vars['client'].beta.assistants.create(
        name="Worksheet Analyzer",
        instructions="You are an expert at analyzing educational worksheets and creating study materials.",
        model="gpt-4-1106-preview",
        tools=[{"type": "file_search"}]
    )

    thread = vars['client'].beta.threads.create()
    message = vars['client'].beta.threads.messages.create(
        thread_id=thread.id,
        role="user",
        content=prompts[1]['content'],
        file_ids=[file_id]
    )

    run = vars['client'].beta.threads.runs.create(
        thread_id=thread.id,
        assistant_id=assistant.id,
        instructions="Analyze the worksheet and provide insights in JSON format."
    )

    while run.status != 'completed':
        time.sleep(1)
        run = vars['client'].beta.threads.runs.retrieve(thread_id=thread.id, run_id=run.id)

    messages = vars['client'].beta.threads.messages.list(thread_id=thread.id)
    assistant_messages = [msg for msg in messages if msg.role == 'assistant']
    
    if assistant_messages:
        last_message = assistant_messages[-1]
        insights = last_message.content[0].text.value
        print("insights: " + str(insights))
        return format.parse_raw(insights)
    else:
        raise ValueError("No assistant response found")

def chat_with_function_calling(prompt, grades=None):
    from main import init
    vars = init()
    client = vars['client']
    function_definitions = [
        {
            "name": "get_data",
            "description": "Fetches data from the specified sheet in the database",
            "parameters": {
                "type": "object",
                "properties": {
                    "sheet": {
                        "type": "string",
                        "description": "The name of the sheet to fetch data from: Classes, Assignments, Chat, Calendar, Distributions, or Guides",
                    },
                },
                "required": ["sheet"],
            },
        },
        {
            "name": "get_grades",
            "description": "Gets the user's raw grades from the database",
            "parameters": {},
            "required": [], 
        }
    ]

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=prompt,
        functions=function_definitions,
        function_call="auto"
    )
    response = response.to_dict()
    message = response['choices'][0]['message']

    if message.get("function_call"):
        function_name = message["function_call"]["name"]
        arguments = message["function_call"]["arguments"]

        if function_name == "get_data":
            sheet = eval(arguments).get("sheet")
            function_response = get_user_data(sheet)
        elif function_name == "get_grades":
            print("getting grades")
            function_response = grades
            
        follow_up_prompt = {"role": "function", "name": function_name, "content": str(function_response)}
        prompt.append(message)
        prompt.append(follow_up_prompt)
        
        follow_up_response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=prompt
        )

        follow_up_response = follow_up_response.to_dict()
        return follow_up_response['choices'][0]['message']['content']

    return message['content']

def search_youtube(query):
    from main import init
    vars = init()
    api_key = vars['gSheet_api_key']
    search_url = "https://www.googleapis.com/youtube/v3/search"
    
    params = {
        'part': 'snippet',
        'q': query,
        'key': api_key,
        'maxResults': 5,
        'type': 'video'
    }
    
    response = requests.get(search_url, params=params)
    response.raise_for_status()
    data = response.json()
    
    results = []
    for item in data.get('items', []):
        video_id = item['id']['videoId']
        title = item['snippet']['title']
        description = item['snippet']['description']
        url = f"https://www.youtube.com/watch?v={video_id}"
        
        results.append({
            'title': title,
            'description': description,
            'url': url
        })
    
    return results

def run_inspire(user_input, inspire_format):
    prompts = [
        {"role": "system", "content": "You are an expert at generating youtube queries to find inspiring stories about a topic."},
        {"role": "user", "content": user_input}
    ]
    
    youtube_query = get_insights(prompts)
    youtube_results = search_youtube(youtube_query)
    prompts.append({"role": "assistant", "content": str(youtube_query)})
    prompts.append({"role": "user", "content": "choose the best video from the following results: " + str(youtube_results)})
    youtube_video = get_insights(prompts, inspire_format)
    return youtube_video

def generate_practice_questions(llm, mcq_count, written_count, subtopics, practice_questions):
    chain = create_llm_chain(llm, EVALUATE_PROMPT)
    response = chain.invoke({
        "mcq_count": mcq_count,
        "written_count": written_count,
        "topics": subtopics,
        "examples": practice_questions
    })
    
    return parse_json_response(response, ResponseFormat)

def generate_final_evaluation(llm, followup_history):
    chain = create_llm_chain(llm, EVALUATE_EVAL_PROMPT)
    evaluation = chain.run({"history": json.dumps(followup_history)})
    
    parsed_eval = parse_json_response(evaluation, FinalEvaluation)
    post_data("Evaluations", {
        "predicted_success": parsed_eval.predicted_success,
        "followup_history": followup_history,
        "OSIS": session['user_data']['osis'],
        "classID": session['current_class'],
        "unit": session['current_unit']
    })
    return parsed_eval

def generate_followup_question(llm, question, answer, history):
    memory = ConversationBufferMemory()
    for entry in range(0, len(history), 2):
        memory.save_context(
            {"output": str(history[entry]['question'])},
            {"input": str(history[entry+1]['answer'])}
        )

    chain = create_llm_chain(llm, EVALUATE_FOLLOWUP_PROMPT, memory=memory)
    return chain.run({"qa_pair": f"Question: {question}\nAnswer: {answer}"})

def process_pdf_content(llm, pdf_content: bytes) -> ResponseTypeNB:
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
        tmp_file.write(pdf_content)
        tmp_path = tmp_file.name

    try:
        loader = PyPDFLoader(tmp_path)
        pages = loader.load()
        text_content = " ".join([page.page_content for page in pages])

        notebook_prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an expert at analyzing educational worksheets."),
            ("human", "Analyze this worksheet content: {text}")
        ])

        chain = create_llm_chain(llm, notebook_prompt)
        result = chain.run({"text": text_content[:4000]})
        return parse_json_response(result, ResponseTypeNB)

    finally:
        os.unlink(tmp_path)

def process_image_content(llm, image_content: str, file_type: str) -> ResponseTypeNB:
    """
    Process image content to extract educational content and generate insights.
    
    Args:
        llm: The language model instance to use for analysis
        image_content: Base64 encoded image content
        file_type: MIME type of the image
        
    Returns:
        ResponseTypeNB: Structured response containing topic, notes, and practice questions
        
    Raises:
        ValueError: If image content or file type is invalid
        Exception: For other processing errors
    """
    try:
        logger.info("Starting image content processing")
        
        # Validate inputs
        if not image_content:
            raise ValueError("Image content cannot be empty")
        if not file_type or not file_type.startswith('image/'):
            raise ValueError(f"Invalid file type: {file_type}")
            
        # Handle base64 padding
        try:
            padding = len(image_content) % 4
            if padding:
                logger.debug("Adding base64 padding")
                image_content += '=' * (4 - padding)
        except Exception as e:
            logger.error(f"Error handling base64 padding: {str(e)}")
            raise ValueError("Invalid base64 encoding in image content")

        # Format the image URL with proper error handling
        try:
            image_url = f"data:{file_type};base64,{image_content}"
            
            # Basic validation of the URL format
            if not image_url.startswith('data:image/'):
                raise ValueError("Invalid image URL format")
        except Exception as e:
            logger.error(f"Error formatting image URL: {str(e)}")
            raise ValueError("Failed to format image URL")

        # Prepare messages for the model
        try:
            messages = [
                SystemMessage(content="You are an expert at analyzing educational worksheets."),
                HumanMessage(content=[
                    {"type": "text", "text": VISION_ANALYSIS_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": image_url
                        }
                    }
                ])
            ]
        except Exception as e:
            logger.error(f"Error preparing messages: {str(e)}")
            raise Exception("Failed to prepare analysis messages")

        # Get response from the model with error handling
        try:
            logger.info("Invoking vision model")
            response = llm.invoke(messages)
            logger.debug(f"Vision model response received: {response}")
        except Exception as e:
            logger.error(f"Error invoking vision model: {str(e)}")
            raise Exception("Failed to process image with vision model")

        # Parse the response
        try:
            logger.info("Parsing model response")
            parsed_response = parse_json_response(response, ResponseTypeNB)
            
            # Validate parsed response
            if not parsed_response.topic:
                logger.warning("No topic extracted from response")
            if not parsed_response.notes:
                logger.warning("No notes extracted from response")
            if not parsed_response.practice_questions:
                logger.warning("No practice questions generated")
                
            return parsed_response
            
        except Exception as e:
            logger.error(f"Error parsing model response: {str(e)}")
            raise Exception("Failed to parse model response")

    except ValueError as e:
        logger.error(f"Validation error in process_image_content: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error in process_image_content: {str(e)}")
        raise Exception(f"Failed to process image content: {str(e)}")

def generate_derive_questions(llm, notebook_synthesis: str) -> DeriveQuestions:
    chain = create_llm_chain(llm, DERIVE_PROMPT)
    response = chain.invoke({"synthesis": notebook_synthesis})
    print("derive questions: " + str(response))
    return parse_json_response(response, DeriveQuestions)

def evaluate_derive_answer(llm, question: str, expected_answer: str, user_answer: str) -> DeriveResponse:
    chain = create_llm_chain(llm, DERIVE_EVAL_PROMPT)
    response = chain.invoke({
        "question": question,
        "expected": expected_answer,
        "answer": user_answer
    })
    return parse_json_response(response, DeriveResponse)

def make_explanation_cards(notebook_content, llm, history: List[dict] = None, user_input: str = None) -> List[dict]:
    if history:
        all_green_highlights = []
        all_red_highlights = []
        for prev_expl in history:
            all_green_highlights.extend(prev_expl.get('greenHighlights', []))
            all_red_highlights.extend(prev_expl.get('redHighlights', []))
            
        chain = create_llm_chain(llm, ITERATIVE_EXPLANATION_PROMPT)
        response = chain.invoke({
            "green_highlights": all_green_highlights,
            "red_highlights": all_red_highlights,
            "notebook_content": notebook_content,
            "user_input": user_input or "No specific request provided."
        })
    else:
        chain = create_llm_chain(llm, EXPLANATION_PROMPT)
        response = chain.invoke({
            "notebook_content": notebook_content
        })
    
    return parse_json_response(response)['explanations']

def generate_bloom_questions(llm, level: str, previous_answers: list, notebook_content: str) -> ResponseTypeBloom:
    """Generate Bloom's Taxonomy questions using LangChain"""
    if len(notebook_content) > 4000:
        notebook_content = notebook_content[:4000] + "..."

    chain = create_llm_chain(llm, LEVELS_GENERATE_PROMPT)
    response = chain.invoke({
        "level": level,
        "content": notebook_content,
        "previous": str(previous_answers)
    })
    
    return parse_json_response(response, ResponseTypeBloom)

def evaluate_bloom_answer(llm, question, answer, level, guide=None):
    """Evaluate answer using LangChain"""

    chain = create_llm_chain(llm, LEVELS_EVAL_PROMPT)
    response = chain.invoke({
        "level": level,
        "question": question,
        "answer": answer,
        "guide": guide
    })
    print("bloom eval response: " + str(response))
    
    return parse_json_response(response, ScoreBloom)

def answer_worksheet_question(llm, image_content: str, file_type: str, question: str) -> str:
    """Process image content and answer a specific question about it"""
    padding = len(image_content) % 4
    if padding:
        image_content += '=' * (4 - padding)

    # Format the image URL
    image_url = f"data:{file_type};base64,{image_content}"
    
    messages = [
        SystemMessage(content="You are an expert tutor helping students understand educational content. Number your steps and provide clear explanations."),
        HumanMessage(content=[
            {"type": "text", "text": f"Please answer this question about the worksheet: {question}"},
            {
                "type": "image_url",
                "image_url": {
                    "url": image_url
                }
            }
        ])
    ]
    
    response = llm.invoke(messages)
    return response.content

def map_problems(problems_data, concept_map, llm):
    """Map problems to their required concepts using the concept map"""
    
    # Format the concept map data: for each node in nodes get the id and description
    formatted_concept_map = {node['id']: node['description'] for node in concept_map['nodes']}
    
    # Format the problems data - now using problem IDs
    formatted_problems = []
    for prob in problems_data:
        formatted_problems.append({"problem_id": prob['id'], "text": prob['problem']})
    
    # Create and invoke the chain
    chain = create_llm_chain(llm, PROBLEM_MAPPING_PROMPT)
    response = chain.invoke({
        "concept_map": formatted_concept_map,
        "problems": formatted_problems
    })
    
    # Parse the response using the Pydantic model
    try:
        # First clean the response content to ensure it's valid JSON
        cleaned_content = clean_llm_response(response)
        parsed_response = parse_json_response(cleaned_content, ProblemMappingResponse)
        
        # Update each problem with its concept mappings
        for mapping in parsed_response.problem_mappings:
            for prob in problems_data:
                if prob['id'] == mapping.problem_id:
                    prob['concepts'] = mapping.required_concepts
                    update_data(prob['id'], 'id', prob, "Problems")
        
        return "Successfully mapped problems to concepts"
    except Exception as e:
        print(f"Error parsing response: {e}")
        print(f"Response content: {response}")
        raise

def derive_concept(llm, concept, user_message, chat_history, prerequisites_completed, desmos_state=None):
    """
    Handles the derivation conversation for a specific concept
    
    Args:
        llm: The language model to use
        concept: Dictionary containing concept information (label, description, prerequisites)
        user_message: The user's current message
        chat_history: List of previous messages in the conversation
        prerequisites_completed: List of completed prerequisite concepts
        desmos_state: Optional string containing the current state of the Desmos calculator
        
    Returns:
        AI's response and whether the concept has been successfully derived
    """
    from langchain.schema import HumanMessage, AIMessage, SystemMessage
    
    # Format conversation history for the prompt
    formatted_history = []
    seen_messages = set()  # Track unique messages
    
    for msg in chat_history:
        # Create a unique key for this message
        msg_key = (msg['role'], msg['content'])
        if msg_key not in seen_messages:
            seen_messages.add(msg_key)
            if msg['role'] == 'user':
                formatted_history.append(HumanMessage(content=msg['content']))
            else:
                formatted_history.append(AIMessage(content=msg['content']))
    
    # Add the current message
    # formatted_history.append(HumanMessage(content=user_message))
    
    # Create the system prompt with concept details and Desmos state if available
    desmos_context = f"\nCurrent Desmos graph state:\n{desmos_state}" if desmos_state else ""
    system_prompt = DERIVE_HELP_PROMPT.format(
        concept=f"{concept['label']}: {concept['description']}",
        prerequisites=", ".join(prerequisites_completed),  # Just join the labels
        desmos_state=desmos_context
    )
    
    # Create messages array for the chat model
    messages = [
        SystemMessage(content=system_prompt),
        *formatted_history,
        HumanMessage(content=user_message)  # Add current message
    ]
    
    try:
        # Create chain with the chat model
        chain = create_llm_chain(llm, ChatPromptTemplate.from_messages(messages))
        response = chain.invoke({})
        
        # Extract the actual response text
        if isinstance(response, dict):
            response_text = response.get('text', '')
        elif hasattr(response, 'content'):
            response_text = response.content
        else:
            response_text = str(response)
            
        print("response_text: " + str(response_text))
            
        # Check if the AI signaled that the concept was derived
        derived = "DERIVED=TRUE" in response_text
        
        # Remove the DERIVED signal from the response if present
        response_text = response_text.replace("DERIVED=TRUE", "").strip()
        response_text = response_text.replace("DERIVED=FALSE", "").strip()
        
        return {
            "response": response_text,
            "derived": derived
        }
        
    except Exception as e:
        print(f"Error in derive_concept: {str(e)}")
        raise

def evaluate_student_response(llm, context: Dict[str, Any]) -> Dict[str, Any]:
    """Evaluate student response using LLM with Langchain"""
    try:
        # Format context for prompt, only including essential information
        formatted_context = {
            "problem": context['problem'],
            "answer": context['student_answer'],
            "explanation": context['student_explanation'],
            "unit": context['unit'],
            "attempt_number": context.get('attempt_number', 1),
            "previous_steps": json.dumps(context.get('previous_steps', []))
        }
        
        # Create messages for evaluation
        messages = [
            SystemMessage(content="You are an expert at evaluating student understanding of physics concepts."),
            HumanMessage(content="""Please evaluate this student's response:
            
Problem: {problem}
Student Answer: {answer}
Student Explanation: {explanation}
Unit: {unit}
Attempt Number: {attempt_number}
Previous Steps: {previous_steps}

Break down the problem into logical steps and evaluate the student's response. For each step:
1. Identify what the student did
2. Determine if it was correct
3. Provide the correct approach if needed

Also identify any remaining steps the student needs to complete.

Format your response as a JSON object with the following structure:
{{
    "score": float,  // Overall score between 0 and 1
    "logical_steps": [  // Steps the student has attempted
        {{
            "step_number": int,
            "description": str,  // What the student did
            "is_correct": bool,
            "correct_approach": str  // Only if incorrect
        }}
    ],
    "remaining_steps": [  // Steps not yet attempted
        {{
            "step_number": int,
            "description": str,
            "hint": str
        }}
    ],
    "can_resubmit": bool  // Whether student should try again
}}""".format(**formatted_context))
        ]
        
        # Get response from LLM
        response = llm.invoke(messages)
        
        # Parse response into structured format
        try:
            # Clean the response content to ensure it's valid JSON
            response_text = response.content.strip()
            if response_text.startswith('```json'):
                response_text = response_text[7:-3]
            elif response_text.startswith('```'):
                response_text = response_text[3:-3]
            
            # Parse the JSON response
            evaluation_dict = json.loads(response_text)
            evaluation = EvaluationResponse(**evaluation_dict)
            
            return {
                'score': evaluation.score,
                'logical_steps': [step.model_dump() for step in evaluation.logical_steps],
                'remaining_steps': [step.model_dump() for step in evaluation.remaining_steps],
                'can_resubmit': evaluation.can_resubmit
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {str(e)}")
            logger.error(f"Response content: {response.content}")
            raise ValueError("Invalid response format from LLM")
        
    except Exception as e:
        logger.error(f"Error in evaluate_student_response: {str(e)}")
        raise

def generate_concept_explanation(llm, concept_label: str, concept_description: str) -> dict:
    """Generate a complete explanation for a derived concept
    
    Args:
        llm: The language model to use
        concept_label: The name/label of the concept
        concept_description: Description of the concept
        
    Returns:
        Dictionary containing the explanation
    """
    try:
        # Create chain with the concept explanation prompt
        chain = create_llm_chain(llm, CONCEPT_EXPLANATION_PROMPT)
        
        # Generate the explanation
        response = chain.invoke({
            "concept_label": concept_label,
            "concept_description": concept_description
        })
        
        # Parse and return the response
        return parse_json_response(response)
        
    except Exception as e:
        print(f"Error generating concept explanation: {str(e)}")
        raise
