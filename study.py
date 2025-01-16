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

from models import *
from output_processor import clean_llm_response, parse_json_response, create_llm_chain
from prompts import *

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
                        "description": "The name of the sheet to fetch data from: Grades, Classes, Assignments, Chat, Calendar, Distributions, or Guides",
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
    padding = len(image_content) % 4
    if padding:
        image_content += '=' * (4 - padding)

    print("IMAGE_ANALYSIS_PROMPT:", IMAGE_ANALYSIS_PROMPT)
    chain = create_llm_chain(llm, IMAGE_ANALYSIS_PROMPT)
    response = chain.invoke({"image_content": image_content, "file_type": file_type})
    print("Response from chain:", response)
    return parse_json_response(response, ResponseTypeNB)

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
    response = WORKSHEET_ANSWER_PROMPT.invoke({"image_content": image_content, "file_type": file_type, "question": question})
    return response.content

def synthesize_unit(notebook_data, llm):
    """Synthesize a unit of study into a concise summary"""
    
    formatted_data = []
    for nb in notebook_data:
        formatted_data.append(f"Topic: {nb['topic']}")
        formatted_data.append("Notes:")
        for note in nb['subtopics']:
            formatted_data.append(f"- {note}")
        formatted_data.append("Practice Questions:")
        for q in nb['practice_questions']:
            formatted_data.append(f"- {q}")
        formatted_data.append("---")
    
    chain = SYNTHESIZE_UNIT_PROMPT | llm
    response = chain.invoke({"notebook_data": "\n".join(formatted_data)})
    
    return response.content
