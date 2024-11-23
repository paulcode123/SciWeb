# import session from flask
from flask import session
import requests
import openai
import time
from database import get_user_data
from jupiter import get_grades
from langchain.prompts import ChatPromptTemplate
from langchain.chains import LLMChain, SequentialChain
from pydantic import BaseModel
from typing import List
import json
from langchain_community.document_loaders import PyPDFLoader
from pydantic import BaseModel
from io import BytesIO
import base64
import tempfile
import os
from langchain_core.output_parsers import PydanticOutputParser
from langchain.chains import LLMChain
from langchain.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, SystemMessage
from langchain.memory import ConversationBufferMemory
# Pydantic Models
class MultipleChoiceQuestion(BaseModel):
    question: str
    options: list[str]
    answer: str

class ShortResponseQuestion(BaseModel):
    question: str

class ResponseFormat(BaseModel):
    multiple_choice_questions: list[MultipleChoiceQuestion]
    short_response_questions: list[ShortResponseQuestion]

class QuestionEvaluation(BaseModel):
    understanding_level: str
    key_points: list[str]
    misconceptions: list[str]
    score: int

class FinalEvaluation(BaseModel):
    question_evaluations: list[QuestionEvaluation]
    overall_understanding: str
    strengths: list[str]
    weaknesses: list[str]
    recommendations: list[str]
    composite_score: int

class BloomQuestion(BaseModel):
    question: str
    personalDifficulty: int

class ResponseTypeBloom(BaseModel):
    questions: list[BloomQuestion]

class ScoreBloom(BaseModel):
    score: int
    feedback: str

class ResponseTypeNB(BaseModel):
    topic: str
    notes: list[str]
    practice_questions: list[str]

# Query the LLM API to get insights
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
    # completion = completion.to_dict()
    # print("completion: " + completion)
    insights = completion.choices[0].message.content

  
  
  print("insights: "+str(insights))
  return insights



def get_insights_from_file(prompts, format, file_id):
    from main import init
    vars = init()
    # Create an assistant
    assistant = vars['client'].beta.assistants.create(
        name="Worksheet Analyzer",
        instructions="You are an expert at analyzing educational worksheets and creating study materials.",
        model="gpt-4-1106-preview",
        tools=[{"type": "file_search"}]
    )


    # Create a thread
    thread = vars['client'].beta.threads.create()


    # Add a message to the thread
    message = vars['client'].beta.threads.messages.create(
        thread_id=thread.id,
        role="user",
        content=prompts[1]['content'],
        file_ids=[file_id]
    )


    # Run the assistant
    run = vars['client'].beta.threads.runs.create(
        thread_id=thread.id,
        assistant_id=assistant.id,
        instructions="Analyze the worksheet and provide insights in JSON format."
    )


    # Wait for the run to complete
    while run.status != 'completed':
        time.sleep(1)
        run = vars['client'].beta.threads.runs.retrieve(thread_id=thread.id, run_id=run.id)


    # Retrieve the messages
    messages = vars['client'].beta.threads.messages.list(thread_id=thread.id)


    # Get the last assistant message
    assistant_messages = [msg for msg in messages if msg.role == 'assistant']
    if assistant_messages:
        last_message = assistant_messages[-1]
        insights = last_message.content[0].text.value
        print("insights: " + str(insights))
        return format.parse_raw(insights)
    else:
        raise ValueError("No assistant response found")

# Function to communicate with the OpenAI API
def chat_with_function_calling(prompt):
    from main import init
    vars = init()
    client = vars['client']
    # Define a function for get_data(sheet) that the API can call
    function_definitions = [
        {
            "name": "get_data",
            "description": "Fetches data from the specified sheet in the database",
            "parameters": {
                "type": "object",
                "properties": {
                    "sheet": {
                        "type": "string",
                        "description": "The name of the sheet to fetch data from: Assignments, Classes, Leagues(that the user is in), Chat(the user's messages), Notebooks(notes for the user's classes), Goals(that the user has set for themselves), or Profiles",
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

    # Send the initial request with function calling enabled
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=prompt,
        functions=function_definitions,
        function_call="auto"  # allows GPT to decide if it needs to call a function
    )
    # convert response to dictionary
    response = response.to_dict()
    # Check if a function call is required
    print("response: " + str(response))
    message = response['choices'][0]['message']

    if message.get("function_call"):
        function_name = message["function_call"]["name"]
        arguments = message["function_call"]["arguments"]

        # Call the get_data function if requested
        if function_name == "get_data":
            sheet = eval(arguments).get("sheet")  # Extract sheet name
            function_response = get_user_data(sheet)
        elif function_name == "get_grades":
            function_response = get_grades()
        follow_up_prompt = {"role": "function", "name": function_name, "content": str(function_response)}
        # Add message and follow_up_prompt to prompts
        prompt.append(message)
        prompt.append(follow_up_prompt)
        # Send the function result back to OpenAI for a complete response
        follow_up_response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=prompt
        )

        # Return the final response
        follow_up_response = follow_up_response.to_dict()
        print("follow_up_response: " + str(follow_up_response))
        return follow_up_response['choices'][0]['message']['content']

    # If no function call was needed, return the initial response
    return message['content']


def search_youtube(query):
    """
    Searches YouTube for the given query and returns the titles, descriptions, and URLs of the first 5 results.
    
    Parameters:
        query (str): The search query.
    
    Returns:
        list of dict: A list of dictionaries containing 'title', 'description', and 'url' keys.
    """
    from main import init
    vars = init()
    api_key = vars['gSheet_api_key']
    # YouTube Data API endpoint
    search_url = "https://www.googleapis.com/youtube/v3/search"
    
    # Parameters for the API request
    params = {
        'part': 'snippet',
        'q': query,
        'key': api_key,
        'maxResults': 5,
        'type': 'video'  # Ensures that we only get videos, not channels or playlists
    }
    
    # Make the API request
    response = requests.get(search_url, params=params)
    response.raise_for_status()  # Check for HTTP errors
    
    # Parse the response JSON
    data = response.json()
    
    # Extract video details
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
    # take in user_input, which is something the user needs motivation for, such as an assignment or studying for a test
    # call get_insights() to generate a youtube query for a video about an inspiring story about how that topic led to a discovery
    # call search_youtube() to search for videos on youtube, and return the top 5 titles, descriptions, and urls
    # call get_insights() again to pick which video to watch based on the results
    # return the video url

    prompts = [
        {"role": "system", "content": "You are an expert at generating youtube queries to find inspiring stories about a topic. Return the query text in a string."},
        {"role": "user", "content": user_input}
    ]
    
    youtube_query = get_insights(prompts)
    youtube_results = search_youtube(youtube_query)
    prompts.append({"role": "assistant", "content": str(youtube_query)})
    prompts.append({"role": "user", "content": "choose the best video from the following results: " + str(youtube_results)})
    youtube_video = get_insights(prompts, inspire_format)
    return youtube_video

def init_pydantic():
    # Initialize output parsers
    mcq_parser = PydanticOutputParser(pydantic_object=ResponseFormat)
    bloom_parser = PydanticOutputParser(pydantic_object=ResponseTypeBloom)
    eval_parser = PydanticOutputParser(pydantic_object=FinalEvaluation)
    return mcq_parser, bloom_parser, eval_parser

#Endpoints for Evaluate
def generate_practice_questions(llm, mcq_count, written_count, subtopics, practice_questions):
    """Generate practice questions using LangChain"""
    question_prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert educational assessment designer. Generate questions that follow the exact JSON schema provided."),
        ("human", """Please generate {mcq_count} multiple-choice questions and {written_count} short-response questions 
                     based on these topics: {topics} and examples: {examples}.
                     
                     Return the response in this exact JSON format:
                     {{
                         "multiple_choice_questions": [
                             {{
                                 "question": "Question text here",
                                 "options": ["Option A", "Option B", "Option C", "Option D"],
                                 "answer": "Exact text of correct option"
                             }}
                         ],
                         "short_response_questions": [
                             {{
                                 "question": "Short response question text here"
                             }}
                         ]
                     }}
                     
                     Requirements:
                     1. Each MCQ must have exactly 4 options
                     2. The 'answer' field must match one of the options exactly
                     3. Format must match the JSON schema exactly
                     4. If it's an equation, make sure to write it in LaTeX format""")
    ])

    # Create and run the chain with newer syntax
    question_chain = LLMChain(
        llm=llm,
        prompt=question_prompt,
        verbose=True
    )

    try:
        # Use invoke instead of run
        response = question_chain.invoke({
            "mcq_count": mcq_count,
            "written_count": written_count,
            "topics": subtopics,
            "examples": practice_questions
        })
        
        # Extract the content from the response
        result = response.get('text', response)
        
        # Parse the response into our Pydantic model
        try:
            return ResponseFormat.parse_raw(result)
        except Exception as parse_error:
            # If direct parsing fails, try to clean the response
            import json
            import re
            
            # Try to extract JSON from the response
            json_match = re.search(r'\{[\s\S]*\}', result)
            if json_match:
                json_str = json_match.group()
                # Parse and validate the JSON structure
                json_data = json.loads(json_str)
                
                # Ensure the required keys exist
                if not all(key in json_data for key in ['multiple_choice_questions', 'short_response_questions']):
                    raise ValueError("Response missing required keys")
                
                return ResponseFormat.parse_obj(json_data)
            else:
                raise ValueError(f"Could not parse response: {result}")
            
    except Exception as e:
        raise Exception(f"Error generating questions: {str(e)}\nResponse: {response}")


def generate_final_evaluation(llm, followup_history):
    """Generate final evaluation using LangChain"""
    final_prompt = ChatPromptTemplate.from_messages([
        ("system", """
            You are a JSON-only response generator. You must ALWAYS respond with valid JSON.
            
            Analyze the student's overall understanding across all questions and followup responses.
            Provide a detailed evaluation for each individual question, restating the question, the student's answer, and the correct answer, and why the student got it right or wrong.
            Recommend things to work on considering the student's overall performance.
            List the student's strengths and weaknesses in terms of their thinking process and knowledge, in terms of how they approached the question and how they solved it.
            
            Your response MUST be a valid JSON object with EXACTLY this structure:
            {{
                "overall_understanding": "string",
                "strengths": ["string"],
                "weaknesses": ["string"],
                "recommendations": ["string"],
                "composite_score": number,
                "question_evaluations": [
                    {{
                        "understanding_level": "string",
                        "key_points": ["string"],
                        "misconceptions": ["string"],
                        "score": number
                    }}
                ]
            }}

            Do not include any explanatory text before or after the JSON.
            Do not use markdown formatting.
            Use LaTeX for equations.
            The response must be parseable by Python's json.loads().
        """),
        ("human", "Analyze this conversation history: {history}")
    ])

    final_chain = LLMChain(
        llm=llm,
        prompt=final_prompt,
        verbose=True
    )

    try:
        evaluation = final_chain.run({
            "history": json.dumps(followup_history)
        })
        
        # Strip Markdown code block formatting if present
        if evaluation.startswith("```") and evaluation.endswith("```"):
            evaluation = evaluation.strip("```").strip("json").strip()

        # Try to parse as JSON first to catch any format issues
        parsed_json = json.loads(evaluation)
        print("evaluation: " + evaluation)
        return FinalEvaluation.parse_obj(parsed_json)
    except json.JSONDecodeError as e:
        print(f"LLM returned invalid JSON: {evaluation}")
        raise ValueError("Failed to generate valid JSON evaluation") from e
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        raise

def generate_followup_question(llm, question, answer, history):
    """Generate followup question using LangChain with memory"""
    # Initialize memory
    memory = ConversationBufferMemory()

    # Add existing history to memory
    print("history: " + str(history))
    for entry in range(0, len(history), 2):
        
        memory.save_context(
            {"output": str(history[entry]['question'])},
            {"input": str(history[entry+1]['answer'])}
        )

    # Print the memory contents
    print(history, "Memory contents:", memory.buffer)
    # for message in memory.buffer:
    #     print(f"Input: {message['input']}, Output: {message['output']}")


    followup_prompt = ChatPromptTemplate.from_messages([
        ("system", """
            You are an educational AI conducting a Socratic dialogue to deeply understand a student's knowledge. 
            Ask focused follow-up questions based on their responses. The student should be able to answer the question, 
            yet it should reveal something about how they understand the topic. The followups should guide the user towards 
            the correct answer.
            For math problems, ask about how they got their answer, and write the equations in LaTeX format.
            For humanities questions, ask about the reasoning behind their answer, context, and how they came to that conclusion.
        """),
        ("human", "Original question and answer: {qa_pair}\nGenerate a single follow-up question to further query their understanding.")
    ])

    followup_chain = LLMChain(
        llm=llm,
        prompt=followup_prompt,
        memory=memory,  # Attach memory to the chain
        verbose=True
    )

    # Combine question and answer into a single input
    qa_pair = f"Question: {question}\nAnswer: {answer}"

    return followup_chain.run({
        "qa_pair": qa_pair
    })

# Endpoints for Notebooks
def process_pdf_content(llm, pdf_content: bytes) -> ResponseTypeNB:
    """Process PDF content using LangChain"""
    # Create a temporary file to store the PDF
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
        tmp_file.write(pdf_content)
        tmp_path = tmp_file.name

    try:
        # Use LangChain's PDF loader
        loader = PyPDFLoader(tmp_path)
        pages = loader.load()
        
        # Combine text from all pages
        text_content = " ".join([page.page_content for page in pages])

        # Create prompt template
        notebook_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert at analyzing educational worksheets and creating study materials. 
                         Format your response as JSON with keys 'topic', 'notes', and 'practice_questions'."""),
            ("human", """Analyze this worksheet content and provide:
                        1. The main topic of the worksheet
                        2. A complete list of specific notes about the content
                        3. 5 questions that test understanding of the content
                        
                        Content: {text}""")
        ])

        # Create and run the chain
        notebook_chain = LLMChain(
            llm=llm,
            prompt=notebook_prompt,
            verbose=True
        )

        result = notebook_chain.run({"text": text_content[:4000]})  # Limit content length
        return ResponseTypeNB.parse_raw(result)

    finally:
        # Clean up temporary file
        os.unlink(tmp_path)

def process_image_content(llm, image_content: str, file_type: str) -> ResponseTypeNB:
    """Process image content using LangChain's vision capabilities"""
    # Fix base64 padding
    padding = len(image_content) % 4
    if padding:
        image_content += '=' * (4 - padding)

    # Create the messages with the image
    messages = [
        SystemMessage(content="""You are an expert at analyzing educational worksheets and creating study materials.
                               Format your response as JSON with keys 'topic', 'notes', and 'practice_questions'."""),
        HumanMessage(
            content=[
                {
                    "type": "text",
                    "text": """Analyze this worksheet image and provide:
                              1. The main topic of the worksheet
                              2. A complete list of specific notes about the content
                              3. 5 questions that test understanding of the content"""
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{file_type};base64,{image_content}"
                    }
                }
            ]
        )
    ]

    # Get response from the vision model
    response = llm.invoke(messages)
    
    try:
        # Parse the response into our Pydantic model
        return ResponseTypeNB.parse_raw(response.content)
    except Exception as e:
        # If direct parsing fails, try to extract JSON from the response
        import re
        import json
        
        # Try to find JSON-like content in the response
        json_match = re.search(r'\{.*\}', response.content, re.DOTALL)
        if json_match:
            json_str = json_match.group()
            return ResponseTypeNB.parse_raw(json_str)
        else:
            # If no JSON found, create a structured response from the text
            lines = response.content.split('\n')
            topic = ""
            notes = []
            questions = []
            
            current_section = None
            for line in lines:
                if "topic" in line.lower():
                    current_section = "topic"
                    topic = line.split(":", 1)[1].strip() if ":" in line else line.strip()
                elif "notes" in line.lower():
                    current_section = "notes"
                elif "question" in line.lower():
                    current_section = "questions"
                elif line.strip():
                    if current_section == "notes":
                        notes.append(line.strip())
                    elif current_section == "questions":
                        questions.append(line.strip())
            
            return ResponseTypeNB(
                topic=topic or "Unknown Topic",
                notes=notes or ["No notes extracted"],
                practice_questions=questions or ["No questions extracted"]
            )
