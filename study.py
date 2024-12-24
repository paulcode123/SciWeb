# import session from flask
from flask import session
import requests
import openai
import time
from database import get_user_data
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
from datetime import datetime
import random
from typing import Union, List, Optional
from pydantic import BaseModel, Field
from langchain.chat_models import ChatOpenAI

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
    predicted_success: str

class BloomQuestion(BaseModel):
    question: str
    personalDifficulty: int

class ResponseTypeBloom(BaseModel):
    questions: list[BloomQuestion]

class ScoreBloom(BaseModel):
    score: int
    feedback: str
    correct_answer: str

class ResponseTypeNB(BaseModel):
    topic: str
    notes: list[str]
    practice_questions: list[str]

class Explanation(BaseModel):
    style: str
    text: str
    score: int = 0  # Default score of 0

class ExplanationResponse(BaseModel):
    explanations: List[Explanation]

# Question Type Models
class FillInBlankQuestion(BaseModel):
    text: str
    blanks: List[str]  # List of correct answers for each blank
    blank_positions: List[int]  # Positions in text where blanks should appear
    explanation: str

class MatchingQuestion(BaseModel):
    terms: List[str]
    definitions: List[str]
    correct_pairs: List[tuple[int, int]]  # Indices of matching pairs
    explanation: str

class OrderingQuestion(BaseModel):
    items: List[str]
    correct_order: List[int]  # Correct order as indices
    explanation: str

class MultipleChoiceQuestion(BaseModel):
    question: str
    options: List[str]
    correct_index: int
    explanation: str

class EquationQuestion(BaseModel):
    problem: str
    steps: List[str]  # Step-by-step solution
    final_answer: str
    latex: bool = True
    explanation: str

# Combined question type
class Question(BaseModel):
    type: str
    content: Union[FillInBlankQuestion, MatchingQuestion, OrderingQuestion, 
                  MultipleChoiceQuestion, EquationQuestion]
    context: str  # Information about how this relates to previous questions
    difficulty: int

class ThoughtProcess(BaseModel):
    steps: List[str]
    misconceptions: List[str]
    comparison: Optional[List[tuple[str, str]]]  # Pairs of [user_thought, correct_thought]

class DeriveQuestion(BaseModel):
    question: str
    expected_answer: str
    category: str

class DeriveQuestions(BaseModel):
    questions: List[DeriveQuestion]

class DeriveResponse(BaseModel):
    status: str
    newLine: Optional[str] = None
    simplifiedQuestion: Optional[str] = None

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
                     4. If it's an equation, make sure to write it in LaTeX format
                    
                     Guidelines:
                     1. The questions should involve multiple steps and critical thinking
                     2. They should be AP style questions""")
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
    from database import post_data
    """Generate final evaluation using LangChain"""
    final_prompt = ChatPromptTemplate.from_messages([
        ("system", """
            You are a JSON-only response generator. You must ALWAYS respond with valid JSON.
            
            Analyze the student's overall understanding across all questions and followup responses.
            Provide a detailed evaluation for each individual question, restating the question, the student's answer, and the correct answer, and why the student got it right or wrong.
            Recommend things to work on considering the student's overall performance.
            List the student's strengths and weaknesses in terms of their thinking process and knowledge, in terms of how they approached the question and how they solved it.
            For predicted success, write 4 sentences about how the student is likely to perform on a test of this material, such that this information can later be used to predict scores.   
         
            Your response MUST be a valid JSON object with EXACTLY this structure:
            {{
                "overall_understanding": "string",
                "strengths": ["string"],
                "weaknesses": ["string"],
                "recommendations": ["string"],
                "composite_score": number,
                "predicted_success": "string",
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
        # post predicted success to the database
        post_data("Evaluations", {"predicted_success": parsed_json['predicted_success'], "followup_history": followup_history, "OSIS": session['user_data']['osis'], "classID": session['current_class'], "unit": session['current_unit']})
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

def _parse_json_response(result: str) -> dict:
    """Helper function to parse JSON response from LLM"""
    import json
    import re
    
    # Remove markdown code blocks if present
    result = re.sub(r'```json\s*|\s*```', '', result)
    
    # Extract JSON object
    json_match = re.search(r'\{[\s\S]*\}', result)
    if not json_match:
        raise ValueError("No JSON object found in response")
    
    # Clean and parse JSON
    json_str = (json_match.group()
                .replace(r'\\', '@LATEX@')  # Temp replace LaTeX backslashes
                .replace(r"\'", "'")        # Fix quotes
                .replace(r'\"', '"')
                .replace('@LATEX@', r'\\')) # Restore LaTeX backslashes
    
    return json.loads(json_str)

def answer_worksheet_question(llm, image_content: str, file_type: str, question: str) -> str:
    """Process image content and answer a specific question about it"""
    # Fix base64 padding
    padding = len(image_content) % 4
    if padding:
        image_content += '=' * (4 - padding)

    # Create the messages with the image and question
    messages = [
        SystemMessage(content="You are an expert tutor helping students understand educational content. Number your steps and use LaTeX for equations."),
        HumanMessage(
            content=[
                {
                    "type": "text",
                    "text": f"Please answer this question about the worksheet: {question}"
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
    return response.content

def synthesize_unit(notebook_data, llm):
    """Synthesize a unit of study into a concise summary"""
    
    # Create prompt template
    template = """You are a test writer making a list containing as diverse of a sample of problems as possible from the notebook data. Should be 10-15 problems, maximum 800 characters.
    Plain list format, get at least 1 problem for each topic covered in the notebook.
    
    
    Worksheet Data:
    {notebook_data}
    
    Synthesis:"""
    
    prompt = ChatPromptTemplate.from_template(template)
    
    # Format notebook data for the prompt
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
    
    # Get response from LLM
    chain = prompt | llm
    response = chain.invoke({"notebook_data": "\n".join(formatted_data)})
    
    return response.content

#Endpoints for Levels
def generate_bloom_questions(llm, level: str, previous_answers: list, notebook_content: str) -> ResponseTypeBloom:
    """Generate Bloom's Taxonomy questions using LangChain"""
    # Clean up the notebook content if it's too long
    if len(notebook_content) > 4000:
        notebook_content = notebook_content[:4000] + "..."

    bloom_prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert at creating educational questions. Return only valid JSON without markdown."),
        ("human", """Create 3 {level}-level questions based on this content:

Content: {content}

Previous questions to avoid: {previous}

Return exactly this JSON structure:
{{
    "questions": [
        {{
            "question": "Question text here (use \\\\( \\\\) for LaTeX math)",
            "personalDifficulty": 3
        }}
    ]
}}

Requirements:
1. Questions must be at the {level} cognitive level
2. Vary difficulty (1-5 scale)
3. Use LaTeX for math: \\\\(x^2\\\\)
4. Questions must be clear and specific""")
    ])

    try:
        # Create and run the chain
        chain = LLMChain(
            llm=llm,
            prompt=bloom_prompt,
            verbose=True
        )
        
        # Generate response
        response = chain.invoke({
            "level": level,
            "content": notebook_content,
            "previous": str(previous_answers)
        })
        
        # Parse response
        result = response.get('text', response)
        json_data = _parse_json_response(result)
        
        return ResponseTypeBloom.parse_obj(json_data)
            
    except Exception as e:
        print(f"Error in generate_bloom_questions: {str(e)}")
        if 'response' in locals():
            print(f"Response received: {response}")
        raise Exception(f"Error generating Bloom's questions: {str(e)}")

def evaluate_bloom_answer(llm, question, answer, level):
    """Evaluate answer using LangChain"""
    eval_prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert at evaluating student responses based on Bloom's Taxonomy.
                     You must respond with ONLY a JSON object. Do not include markdown formatting."""),
        ("human", """For this {level}-level question: {question}
                     Evaluate this answer: {answer}
                     
                     Return this exact JSON structure:
                     {{
                         "score": number from 0-10,
                         "feedback": "Detailed feedback explaining the score",
                         "correct_answer": "The complete correct answer"
                     }}
                     
                     Base the score on:
                     1. Accuracy of the response
                     2. Depth of understanding shown
                     3. Appropriate use of {level}-level thinking""")
    ])

    try:
        # Create and run the chain
        eval_chain = LLMChain(
            llm=llm,
            prompt=eval_prompt,
            verbose=True
        )

        response = eval_chain.invoke({
            "level": level,
            "question": question,
            "answer": answer
        })
        
        # Extract just the text from the response
        result = response['text'] if isinstance(response, dict) else response
        
        # Clean the response to ensure it's valid JSON
        result = result.strip()
        if result.startswith("```json"):
            result = result[7:]
        if result.endswith("```"):
            result = result[:-3]
        result = result.strip()
        
        # Parse JSON
        json_data = json.loads(result)
        
        # Validate JSON structure
        if not all(key in json_data for key in ['score', 'feedback', 'correct_answer']):
            raise ValueError("Response missing required keys")
            
        return ScoreBloom.parse_obj(json_data)
            
    except Exception as e:
        print(f"Error evaluating answer: {str(e)}")
        if 'response' in locals():
            print(f"Raw response received: {response}")
            print(f"Cleaned result: {result if 'result' in locals() else 'No result'}")
        raise Exception(f"Failed to evaluate answer: {str(e)}")

def generate_explanations(llm, question: str, correct_answer: str, level: str, class_id: str) -> List[Explanation]:
    """Generate multiple explanations using different styles based on previous ratings"""
    from database import get_data
    
    # Get sample of previous explanations
    try:
        # Get all explanations for this class
        explanations_data = get_data("Explanations", "OSIS", session['user_data']['osis'])
        # filter by classID
        explanations_data = [d for d in explanations_data if d.get('classID') == class_id]
        samples_text = "No previous explanations available."
        all_explanations = explanations_data[0]['explanations']
        print(len(all_explanations))
        # Sample from all explanations if available
        if all_explanations:
            import random
            sample_size = min(5, len(all_explanations))
            samples = random.sample(all_explanations, sample_size)
            
            # Format samples as text
            samples_text = "\n".join([
                f"Style: {str(exp.get('style', 'Unknown'))}\n"
                f"Explanation: {str(exp.get('text', 'No text'))}\n"
                f"Rating: {str(exp.get('score', 0))}/10"
                for exp in samples
            ])
    except Exception as e:
        print(f"Error fetching previous explanations: {str(e)}")
        samples_text = "Error fetching previous explanations."

    # Rest of the function remains the same...
    explanation_prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert at explaining concepts clearly. 
        You must respond with ONLY a JSON object containing an 'explanations' array.
        Do not include any additional text or formatting."""),
        ("human", """Explain this {level}-level question in three different ways:

Question: {question}
Correct Answer: {answer}

Previous successful explanations:
{samples}

Respond with this exact JSON structure:
{{
    "explanations": [
        {{
            "style": "Visual",
            "text": "explanation using visual imagery..."
        }},
        {{
            "style": "Analogy",
            "text": "explanation using analogies..."
        }},
        {{
            "style": "Step-by-step",
            "text": "explanation using clear steps..."
        }}
    ]
}}""")
    ])

    try:
        chain = LLMChain(
            llm=llm,
            prompt=explanation_prompt,
            verbose=True
        )
        
        # Generate response
        response = chain.invoke({
            "question": question,
            "answer": correct_answer,
            "level": level,
            "samples": samples_text
        })
        
        # Extract just the text from the response
        result = response['text'] if isinstance(response, dict) else response
        
        # Clean the response to ensure it's valid JSON
        result = result.strip()
        if result.startswith("```json"):
            result = result[7:]
        if result.endswith("```"):
            result = result[:-3]
        result = result.strip()
        
        # Parse JSON
        json_data = json.loads(result)
        
        return ExplanationResponse.parse_obj(json_data).explanations
            
    except Exception as e:
        print(f"Error generating explanations: {str(e)}")
        if 'response' in locals():
            print(f"Raw response received: {response}")
            print(f"Cleaned result: {result if 'result' in locals() else 'No result'}")
        raise Exception(f"Failed to generate explanations: {str(e)}")

def save_explanations(class_id: str, osis: str, question: str, level: str, explanations: List[Explanation]):
    """Save rated explanations to the database"""
    from database import post_data, get_data, update_data
    randid = random.randint(0, 1000000)
    osis = session['user_data']['osis']
    # Create explanation entry
    explanation_entry = {
        "question": question,
        "level": level,
        "explanations": explanations,
        "timestamp": datetime.now().isoformat()
    }
    
    try:
        # Try to get existing explanations for this class
        existing_data = get_data("Explanations", "OSIS", osis)
        # filter by classID
        existing_data = [d for d in existing_data if d.get('classID') == class_id]
        
        if len(existing_data) > 0:
            # Append new explanation to existing list
            existing_data[0]['explanations'].append(explanation_entry)
            
            # Update the document
            update_data(
                existing_data[0]['id'],
                "id",
                existing_data[0],
                "Explanations"
            )
        else:
            # Create new document
            post_data("Explanations", {
                "classID": class_id,
                "OSIS": osis,
                "id": randid,
                "explanations": [explanation_entry]
            })
            
    except Exception as e:
        raise Exception(f"Error saving explanations: {str(e)}")

# Function to determine question type and generate appropriate question
def generate_question(llm, notebook_content: str, previous_qa: List[dict]) -> Question:
    """Generate a question using LangChain"""
    
    # First chain: Determine best question type
    type_prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert at creating educational assessments.
                     Analyze the content and previous answers to determine the most effective
                     question type for testing understanding."""),
        ("human", """Content: {content}
                     Previous Q&A: {previous}
                     
                     Choose the most appropriate question type from:
                     - fill_in_blank
                     - matching
                     - ordering
                     - multiple_choice
                     - equation
                     
                     Return only the type as a single word.""")
    ])
    
    type_chain = LLMChain(
        llm=llm,
        prompt=type_prompt,
        verbose=True
    )
    
    # Get question type
    question_type = type_chain.run({
        "content": notebook_content,
        "previous": str(previous_qa)
    }).strip().lower()

    # Question generation prompts for each type
    question_prompts = {
        "fill_in_blank": """Create a fill-in-the-blank question about: {content}
            Format: {{"text": "sentence with ___ for blanks", "blanks": ["answer1", "answer2"], 
            "blank_positions": [position1, position2], "explanation": "why this is correct"}}""",
            
        "matching": """Create a matching question about: {content}
            Format: {{"terms": ["term1", "term2"], "definitions": ["def1", "def2"], 
            "correct_pairs": [[0,1], [1,0]], "explanation": "explanation of matches"}}""",
            
        "ordering": """Create a sequence ordering question about: {content}
            Format: {{"items": ["event1", "event2"], "correct_order": [0,1], 
            "explanation": "why this order is correct"}}""",
            
        "multiple_choice": """Create a multiple choice question about: {content}
            Format: {{"question": "question text", "options": ["A", "B", "C", "D"], 
            "correct_index": 0, "explanation": "why this is correct"}}""",
            
        "equation": """Create a mathematical equation problem about: {content}
            Format: {{"problem": "problem text", "steps": ["step1", "step2"], 
            "final_answer": "answer", "latex": true, "explanation": "detailed explanation"}}"""
    }
    
    # Create question generation chain
    question_prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert at creating educational questions. Use LaTeX for equations."),
        ("human", question_prompts[question_type])
    ])
    
    question_chain = LLMChain(
        llm=llm,
        prompt=question_prompt,
        verbose=True
    )
    
    # Generate question content
    question_content = question_chain.run({
        "content": notebook_content,
        "previous": str(previous_qa)
    })
    
    # Parse the response into appropriate model
    question_models = {
        "fill_in_blank": FillInBlankQuestion,
        "matching": MatchingQuestion,
        "ordering": OrderingQuestion,
        "multiple_choice": MultipleChoiceQuestion,
        "equation": EquationQuestion
    }
    
    parsed_content = json.loads(question_content)
    question_model = question_models[question_type].parse_obj(parsed_content)
    
    # Generate context based on previous questions
    context_chain = LLMChain(
        llm=llm,
        prompt=ChatPromptTemplate.from_messages([
            ("system", "Generate context about how this question relates to previous ones."),
            ("human", "Previous Q&A: {previous}\nNew question: {question}")
        ])
    )
    
    context = context_chain.run({
        "previous": str(previous_qa),
        "question": str(question_model)
    })
    
    return Question(
        type=question_type,
        content=question_model,
        context=context,
        difficulty=calculate_difficulty(previous_qa)
    )

def analyze_thought_process(llm, question: Question, user_answer: str, 
                          previous_qa: List[dict]) -> ThoughtProcess:
    """Analyze user's thought process and identify misconceptions"""
    
    # Chain to reconstruct user's likely thought process
    thought_chain = LLMChain(
        llm=llm,
        prompt=ChatPromptTemplate.from_messages([
            ("system", """Analyze the user's answer to reconstruct their thought process.
                         Identify any misconceptions and compare with correct reasoning."""),
            ("human", """Question: {question}
                        User's Answer: {answer}
                        Previous Answers: {previous}
                        
                        Return JSON with:
                        {{"steps": ["thought1", "thought2"],
                          "misconceptions": ["misconception1"],
                          "comparison": [["user_thought1", "correct_thought1"]]}}""")
        ])
    )
    
    analysis = thought_chain.run({
        "question": str(question),
        "answer": user_answer,
        "previous": str(previous_qa)
    })
    
    return ThoughtProcess.parse_raw(analysis)

def calculate_difficulty(previous_qa: List[dict]) -> int:
    """Calculate appropriate difficulty based on previous answers"""
    if not previous_qa:
        return 3  # Default medium difficulty
    
    # Calculate based on recent performance
    recent_scores = [qa.get('score', 5) for qa in previous_qa[-3:]]
    avg_score = sum(recent_scores) / len(recent_scores)
    
    # Adjust difficulty (1-5 scale)
    if avg_score > 8:
        return min(5, previous_qa[-1].get('difficulty', 3) + 1)
    elif avg_score < 4:
        return max(1, previous_qa[-1].get('difficulty', 3) - 1)
    else:
        return previous_qa[-1].get('difficulty', 3)

def make_explanation_cards(notebook_content, llm, history: List[dict] = None, user_input: str = None) -> List[dict]:
    """Generate explanations based on notebook content and optional history"""
    from langchain.prompts import ChatPromptTemplate
    from langchain.chains import LLMChain
    
    if history:
        # Collect all highlights across explanations
        all_green_highlights = []
        all_red_highlights = []
        for prev_expl in history:
            all_green_highlights.extend(prev_expl.get('greenHighlights', []))
            all_red_highlights.extend(prev_expl.get('redHighlights', []))  
        # Use modified prompt for iterative explanations
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an expert tutor trying to understand how the student perceives the material and explaining in ways that will make sense to them. Return only valid JSON without markdown."),
            ("human", """explanations that resonate with the student (highlighted in green):
            {green_highlights}
            
            explanations that the student found confusing (highlighted in red):
            {red_highlights}
            
            Diverse sample of example problems from the unit:
            {notebook_content}
            
            Student's request/feedback:
            {user_input}
            
            Create three new explanations that:
            1. Build on concepts they understood (green highlights)
            2. Are explaining the same concept, but in different ways
            3. Differ in style from the previous explanations and from each other, but slowly converge to the explanation that will make sense to the student
            4. Use similar language/style from parts they understood
            5. Try both technical and intuitive explanations
            6. Cover all the material
            7. Address the student's specific request/feedback
            8. Use LaTeX for equations
            
            Return in JSON format:
            {{"explanations": [
                {{"text": "first explanation here", "target": "Clarify the concept by using visual analogies and real-world examples"}},
                {{"text": "second explanation here", "target": "Build on the first explanation by connecting it to related concepts"}},
                {{"text": "third explanation here", "target": "Demonstrate practical applications and problem-solving approaches"}}
            ]}}""")
        ])
        
        # Single LLM call with all highlights
        try:
            chain = LLMChain(llm=llm, prompt=prompt, verbose=True)
            response = chain.invoke({
                "green_highlights": all_green_highlights,
                "red_highlights": all_red_highlights,
                "notebook_content": notebook_content,
                "user_input": user_input or "No specific request provided."
            })
            
            # Process response with improved JSON cleaning
            result = response
            if isinstance(response, dict):
                result = response.get('text', response)
            
            if isinstance(result, str):
                # Double escape backslashes for LaTeX before JSON parsing
                result = result.replace('\\', '\\\\')
                # Remove any markdown formatting
                result = result.replace('```json', '').replace('```', '')
                # Fix duplicate braces issue (common in LLM responses)
                result = result.replace('{{\n', '{').replace('}}', '}')
                # Clean up any remaining whitespace
                result = result.strip()
            
            explanation_data = json.loads(result)
            return explanation_data['explanations']
            
        except json.JSONDecodeError as je:
            print(f"JSON parsing error: {je}")
            print(f"Raw response: {result}")
            raise
            
    else:
        # Initial explanation generation prompt
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an expert tutor trying to explain material in various ways that will reveal what sorts of explanations will make sense to the student. Return only valid JSON without markdown."),
            ("human", """Diverse sample of example problems from the unit:
            {notebook_content}
            
            Create three different explanations that:
            1. Start with concepts towards the more challenging end of the material
            2. Try both technical and intuitive explanations
            3. Differ in style from each other, but are explaining the same concept
            4. Use LaTeX for equations
            
            Return in JSON format:
            {{"explanations": [
                {{"text": "first explanation here", "target": "To explain momentum in terms of force and acceleration, use a car and a truck example"}},
                {{"text": "second explanation here", "target": "To explain impulse in terms of momentum, using step-by-step reasoning"}},
                {{"text": "third explanation here", "target": "To explain conservation of momentum in terms of collistions, use a car and a truck example"}}
            ]}}""")
        ])

    try:
        # Create the chain
        chain = LLMChain(
            llm=llm,
            prompt=prompt,
            verbose=True
        )
        
        if history:
            new_explanations = []
            for prev_expl in history:
                response = chain.invoke({
                    "previous_explanation": prev_expl['explanation'],
                    "green_highlights": prev_expl.get('greenHighlights', []),
                    "red_highlights": prev_expl.get('redHighlights', []),
                    "notebook_content": notebook_content
                })
                
                # Clean and parse the response
                try:
                    result = response
                    if isinstance(response, dict):
                        result = response.get('text', response)
                    
                    # Double escape backslashes for LaTeX before JSON parsing
                    if isinstance(result, str):
                        result = result.replace('\\', '\\\\')
                        # Remove any markdown formatting
                        result = result.replace('```json', '').replace('```', '')
                        # Fix duplicate braces issue (common in LLM responses)
                        result = result.replace('{{\n', '{').replace('}}', '}')
                        # Clean up any remaining whitespace
                        result = result.strip()
                    
                    # Ensure it's valid JSON
                    explanation_data = json.loads(result)
                    new_explanations.append(explanation_data)
                except json.JSONDecodeError as je:
                    print(f"JSON parsing error: {je}")
                    print(f"Raw response: {result}")
                    raise
                    
            return new_explanations
        else:
            # Generate initial explanations
            default_content = """
                Newton's Laws of Motion:
                1. First Law (Inertia)
                2. Second Law (F = ma)
                3. Third Law (Action-Reaction)
                Including applications and examples.
            """
            
            response = chain.invoke({
                "notebook_content": notebook_content or default_content
            })
            
            # Clean and parse the response
            try:
                result = response
                if isinstance(response, dict):
                    result = response.get('text', response)
                
                # Double escape backslashes for LaTeX before JSON parsing
                if isinstance(result, str):
                    result = result.replace('\\', '\\\\')
                    # Remove any markdown formatting
                    result = result.replace('```json', '').replace('```', '')
                    # Fix duplicate braces issue (common in LLM responses)
                    result = result.replace('{{\n', '{').replace('}}', '}')
                    # Clean up any remaining whitespace
                    result = result.strip()
                
                # Ensure it's valid JSON
                explanation_data = json.loads(result)
                return explanation_data['explanations']
            except json.JSONDecodeError as je:
                print(f"JSON parsing error: {je}")
                print(f"Raw response: {result}")
                raise
            
    except Exception as e:
        print(f"Error generating explanations: {str(e)}")
        if 'response' in locals():
            print(f"Raw response received: {response}")
        raise

def generate_derive_questions(llm, notebook_synthesis: str) -> DeriveQuestions:
    """Generate a sequence of questions that help students derive study guide content"""
    
    derive_prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert at creating Socratic questions that help students discover concepts.
                     Create questions that build upon each other to help students derive key concepts."""),
        ("human", """Given this maximally diverse sample of problems from this unit:
                     {synthesis}
                     
                     Create a sequence of 30 questions where each answer should naturally lead to 
                     discovering an important concept. Each question's expected answer should be a clear, 
                     concise statement that could be added to a study guide. Questions should lead to deriving key formulas, theorems, etc.
                     
                     Do not ask sample questions, but instead ask questions that will help students 
                     derive the concepts.
         
                     All questions should fall into the same 6-8 categories, which signify the question type, spelled identically between questions in the same category. (e.g. "General", "solving for the limit given a function", "solving for the derivative of a function given the integral", etc.)
                     
                     Return in this exact format:
                     {{"questions": [
                         {{"question": "question text", 
                           "expected_answer": "expected response",
                           "category": "category of the question"}}
                     ]}}
                     
                     Example:
                     {{"questions": [
                         {{"question": "What is a derivative?", 
                           "expected_answer": "Rate of change of a function",
                           "category": "General"}},
                         {{"question": "What happens when we divide by zero?", 
                           "expected_answer": "We get an undefined result",
                           "category": "L'Hopital's Rule"}}
                     ]}}""")
    ])

    try:
        # Create runnable sequence
        chain = derive_prompt | llm
        response = chain.invoke({"synthesis": notebook_synthesis})
        
        # Get text content
        result = response.content if hasattr(response, 'content') else str(response)
        
        # Clean the response
        if isinstance(result, str):
            # Remove markdown formatting
            result = result.replace('```json', '').replace('```', '')
            # Double escape backslashes for LaTeX
            result = result.replace('\\', '\\\\')
            # Fix duplicate braces issue
            result = result.replace('{{{', '{').replace('}}}', '}')
            result = result.replace('{{', '{').replace('}}', '}')
            # Clean up whitespace
            result = result.strip()
        
        try:
            # Parse JSON
            parsed_json = json.loads(result)
            
            # If we got a list instead of a dict, wrap it in the expected structure
            if isinstance(parsed_json, list):
                parsed_json = {"questions": parsed_json}
                
            return DeriveQuestions.parse_obj(parsed_json)
        except json.JSONDecodeError as je:
            print(f"JSON parsing error: {je}")
            print(f"Raw response: {result}")
            raise
            
    except Exception as e:
        print(f"Error generating derive questions: {str(e)}")
        raise

def evaluate_derive_answer(llm, question: str, expected_answer: str, user_answer: str) -> DeriveResponse:
    """Evaluate user's answer and either accept it or provide a simpler question"""
    
    eval_prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert at evaluating student responses and guiding them toward understanding.
                     If their answer shows understanding, accept it as a study guide point.
                     If not, provide a simpler question to guide them to the concept."""),
        ("human", """Question: {question}
                     Expected Answer: {expected}
                     Student's Answer: {answer}
                     
                     If the answer demonstrates understanding (even if worded differently), return:
                     {{"status": "correct",
                        "newLine": "concise study guide point (under 10 words)"}}
                     
                     If not, return:
                     {{"status": "incorrect",
                        "simplifiedQuestion": "simpler follow-up question"}}""")
    ])

    try:
        # Create runnable sequence
        chain = eval_prompt | llm
        response = chain.invoke({
            "question": question,
            "expected": expected_answer,
            "answer": user_answer
        })
        
        # Get text content
        result = response.content if hasattr(response, 'content') else str(response)
        
        # Clean the response
        if isinstance(result, str):
            # Remove markdown formatting
            result = result.replace('```json', '').replace('```', '')
            # Double escape backslashes for LaTeX
            result = result.replace('\\', '\\\\')
            # Fix duplicate braces issue
            result = result.replace('{{\n', '{').replace('}}', '}')
            # Clean up whitespace
            result = result.strip()
        
        try:
            # Parse JSON
            parsed_json = json.loads(result)
            return DeriveResponse.parse_obj(parsed_json)
        except json.JSONDecodeError as je:
            print(f"JSON parsing error: {je}")
            print(f"Raw response: {result}")
            raise
            
    except Exception as e:
        print(f"Error evaluating derive answer: {str(e)}")
        raise
