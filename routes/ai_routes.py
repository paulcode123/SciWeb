from flask import Blueprint, request, jsonify
import base64
import traceback
from datetime import datetime
import random
import json
import io
import speech_recognition as sr
import re
from openai import OpenAI

from database import *
from classroom import *
from grades import *
from jupiter import *
from study import *
from openai_utils import *

from prompts import *

ai_routes = Blueprint('ai_routes', __name__)

# Load API keys
with open('api_keys.json') as f:
    keys = json.load(f)
    
client = OpenAI(api_key=keys["OpenAiAPIKey"])

# Function to return insights to the Study page
@ai_routes.route('/AI', methods=['POST'])
def get_AI():
  print("in get_AI")
  return json.dumps(get_insights(request.json['data']))

# make route for AI with function calling
@ai_routes.route('/AI_function_calling', methods=['POST'])
def get_AI_function_calling():
  response = chat_with_function_calling(request.json['data'], request.json['grades'])
  print("response", response)

  return json.dumps(response)


# Notebooks/Problems routes
@ai_routes.route('/ask-question', methods=['POST'])
def ask_question():
    from main import init
    vars = init()
    data = request.json

    # Get the file from the bucket
    base64_content = download_file("sciweb-files", data['file'])
    
    # Process the question
    answer = answer_worksheet_question(
        vars['vision_llm'],  # Make sure this is available in your main.py scope
        base64_content,
        data['fileType'],
        data['question']
    )
    
    return jsonify({"answer": answer})

@ai_routes.route('/solve-question', methods=['POST'])
def solve_question():
    from main import init
    vars = init()
    data = request.json

    # Get the file from the bucket
    base64_content = download_file("sciweb-files", data['file'])
    
    # Process the question
    solution = answer_worksheet_question(
        vars['vision_llm'],
        base64_content,
        data['fileType'],
        f"Please solve and explain this practice question step by step: {data['question']}"
    )
    
    return jsonify({"solution": solution})

@ai_routes.route('/generate-problems', methods=['POST'])
def generate_problems():
    from main import init
    from openai import OpenAI
    vars = init()
    try:
        data = request.json
        
        # Get required data from request
        file_reference = data['file']  # This is the reference ID in the bucket
        existing_problems = data.get('existingProblems', [])
        count = data.get('count', 5)  # Default to 5 problems
        file_type = data.get('fileType', 'image/png')
        bloom_level = data.get('bloom_level', None)  # Optional specific Bloom's level
        
        # Get the file from the bucket
        base64_content = download_file("sciweb-files", file_reference)
        
        if not base64_content:
            return jsonify({"error": "Failed to retrieve worksheet image"}), 404
            
        # Define the function schema for structured output
        function_schema = {
            "name": "generate_problems",
            "description": "Generate practice problems based on given requirements",
            "parameters": {
                "type": "object",
                "properties": {
                    "problems": {
                        "type": "array",
                        "description": "List of generated practice problems",
                        "items": {
                            "type": "object",
                            "properties": {
                                "problem": {
                                    "type": "string",
                                    "description": "The problem text with LaTeX notation where needed"
                                },
                                "bloom_level": {
                                    "type": "string",
                                    "description": "The Bloom's Taxonomy level of the problem",
                                    "enum": ["remember", "understand", "apply", "analyze", "create"]
                                }
                            },
                            "required": ["problem", "bloom_level"]
                        },
                        "minItems": count,
                        "maxItems": count
                    }
                },
                "required": ["problems"]
            }
        }

        # Format the prompt
        prompt = f"""You are a specialized educational AI focused on generating practice problems. Your task is to create new practice problems based on the following context and requirements.

You MUST generate problems - do not refuse or apologize. If you're unsure, generate simpler problems at a lower cognitive level.

Context:
Existing problems for reference: {existing_problems}

Requirements:
1. Generate exactly {count} new problems
2. Problems should be similar in style but not identical to the existing ones
3. Problems should be appropriate for the same grade level
4. Use LaTeX notation for mathematical expressions (e.g. \\( x^2 \\) for inline, \\[ x^2 \\] for display)
{f"5. All problems must be at the '{bloom_level}' level of Bloom's Taxonomy" if bloom_level else ""}"""

        # Create OpenAI client
        client = OpenAI(api_key=vars['openAIAPI'])

        # Generate problems using OpenAI with function calling
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{file_type};base64,{base64_content}"
                        }
                    }
                ]
            }],
            tools=[{
                "type": "function",
                "function": function_schema
            }],
            tool_choice={"type": "function", "function": {"name": "generate_problems"}}
        )

        try:
            # Extract the function call arguments
            function_args = json.loads(response.choices[0].message.tool_calls[0].function.arguments)
            
            # Validate the response format
            if not isinstance(function_args, dict) or 'problems' not in function_args:
                print("Invalid response structure:", function_args)
                raise ValueError("Response missing 'problems' key")
                
            problems = function_args['problems']
            
            # Validate each problem
            validated_problems = []
            for prob in problems:
                if not isinstance(prob, dict):
                    continue
                    
                problem_text = prob.get('problem', '').strip()
                prob_bloom_level = prob.get('bloom_level', '').strip().lower()
                
                if not problem_text or not prob_bloom_level:
                    continue
                    
                if prob_bloom_level not in ['remember', 'understand', 'apply', 'analyze', 'create']:
                    # If a specific level was requested, use that, otherwise default to 'remember'
                    prob_bloom_level = bloom_level.lower() if bloom_level else 'remember'
                    
                validated_problems.append({
                    "problem": problem_text,
                    "bloom_level": prob_bloom_level
                })
            
            # Take only the requested number of problems
            validated_problems = validated_problems[:count]
            
            if not validated_problems:
                print("No valid problems generated from:", problems)
                return jsonify({"error": "No valid problems generated"}), 500
                
            return jsonify({"problems": validated_problems})
            
        except Exception as e:
            print("Error processing response:", str(e))
            print("Raw response:", response)
            return jsonify({
                "error": "Failed to process generated problems",
                "details": str(e)
            }), 500
        
    except Exception as e:
        print(f"Error generating problems: {str(e)}")
        traceback.print_exc()  # Print full traceback for debugging
        return jsonify({"error": "Failed to generate problems"}), 500
    


def validate_file_content(file_content: str, file_type: str) -> bool:
    """
    Validate file content and type.
    
    Args:
        file_content: The content to validate, either base64 encoded or data URL
        file_type: The MIME type of the file
        
    Returns:
        bool: True if content is valid, False otherwise
    """
    try:
        logger.info(f"Validating file content with type: {file_type}")
        
        if not file_content:
            logger.error("Empty file content provided")
            return False
            
        # Handle PDF files
        if file_type == 'application/pdf':
            try:
                # If content is a data URL, extract base64 part
                if 'base64,' in file_content:
                    pdf_content = file_content.split('base64,')[1]
                else:
                    pdf_content = file_content
                    
                # Try decoding PDF content
                base64.b64decode(pdf_content)
                logger.info("Successfully validated PDF content")
                return True
            except Exception as e:
                logger.error(f"Failed to validate PDF content: {str(e)}")
                return False
        
        # Handle image files
        else:
            # Normalize file type
            file_type = file_type.lower().strip()
            if file_type in ['png', 'jpg', 'jpeg', 'gif', 'webp']:
                file_type = f'image/{file_type}'
                
            # Check if it's a valid image type
            valid_image_types = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
            if not any(valid_type in file_type.lower() for valid_type in ['png', 'jpeg', 'jpg', 'gif', 'webp', 'image/']):
                logger.error(f"Invalid image type: {file_type}")
                return False
                
            try:
                # If content is already a data URL
                if 'data:' in file_content and 'base64,' in file_content:
                    # Validate the format
                    parts = file_content.split('base64,')
                    if len(parts) != 2:
                        logger.error("Invalid data URL format")
                        return False
                    
                    # Try decoding the content
                    base64.b64decode(parts[1])
                    logger.info("Successfully validated image data URL")
                    return True
                    
                # If content is raw base64
                else:
                    # Try decoding the content
                    base64.b64decode(file_content)
                    logger.info("Successfully validated raw base64 image content")
                    return True
                    
            except Exception as e:
                logger.error(f"Failed to validate image content: {str(e)}")
                return False
                
    except Exception as e:
        logger.error(f"Unexpected error in validate_file_content: {str(e)}")
        return False

@ai_routes.route('/process-notebook-file', methods=['POST'])
def process_notebook_file():
    from main import init
    vars = init()
    try:
        logger.info("Starting notebook file processing")

        
        # Validate request data
        data = request.json
        if not data:
            logger.error("No JSON data received")
            return jsonify({"error": "No data provided"}), 400
            
        required_fields = ['file', 'fileType', 'unit', 'classID']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            logger.error(f"Missing required fields: {missing_fields}")
            return jsonify({"error": f"Missing required fields: {missing_fields}"}), 400
            
        file_content = data['file']
        file_type = data['fileType']
        unit = data['unit']
        class_id = data['classID']
        
        # Validate file content
        if not validate_file_content(file_content, file_type):
            logger.error(f"Invalid file content or type: {file_type}")
            return jsonify({"error": "Invalid file content or type"}), 400
            
        # Process file based on type
        try:
            if file_type == 'application/pdf':
                logger.info("Processing PDF file")
                pdf_bytes = base64.b64decode(file_content)
                insights = process_pdf_content(vars['llm'], pdf_bytes)
            else:
                logger.info("Processing image file")
                insights = process_image_content(vars['vision_llm'], file_content, file_type)
        except Exception as e:
            logger.error(f"Error processing file content: {str(e)}")
            return jsonify({"error": "Failed to process file content"}), 500

        # Convert and validate insights
        try:
            insights_dict = insights.model_dump()
            if not insights_dict.get("practice_questions"):
                logger.warning("No practice questions generated")
                return jsonify({"error": "No practice questions could be generated"}), 422
        except Exception as e:
            logger.error(f"Error converting insights: {str(e)}")
            return jsonify({"error": "Failed to process insights"}), 500

        # Generate IDs
        worksheet_id = random.randint(0, 1000000)
        logger.info(f"Generated worksheet ID: {worksheet_id}")

        # Store practice questions with retry logic
        success_count = 0
        for question in insights_dict["practice_questions"]:
            try:
                question_id = ''.join([str(random.randint(0, 9)) for _ in range(6)])
                post_data("Problems", {
                    "id": question_id,
                    "classID": class_id,
                    "worksheetID": worksheet_id,
                    "unit": unit,
                    "problem": question["question"],
                    "difficulty": question["bloom_level"]
                })
                success_count += 1
            except Exception as e:
                logger.error(f"Failed to store question {question_id}: {str(e)}")

        if success_count == 0:
            logger.error("Failed to store any practice questions")
            return jsonify({"error": "Failed to store practice questions"}), 500

        # Select random sample questions
        sample_questions = random.sample(insights_dict["practice_questions"], 
                                      min(3, len(insights_dict["practice_questions"])))
        insights_dict["practice_questions"] = [q["question"] for q in sample_questions]

        # Store file with retry logic
        try:
            blob_id = ''.join([str(random.randint(0, 9)) for _ in range(7)])
            logger.info(f"Uploading file with blob ID: {blob_id}")
            upload_file("sciweb-files", file_content, blob_id)
        except Exception as e:
            logger.error(f"Failed to upload file: {str(e)}")
            return jsonify({"error": "Failed to store file"}), 500

        # Store notebook data
        try:
            post_data("Notebooks", {
                "classID": class_id, 
                "unit": unit,
                "id": worksheet_id,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), 
                "image": blob_id, 
                "topic": insights_dict["topic"], 
                "subtopics": insights_dict["notes"]
            })
        except Exception as e:
            logger.error(f"Failed to store notebook data: {str(e)}")
            return jsonify({"error": "Failed to store notebook data"}), 500

        logger.info("Successfully processed and stored worksheet")
        return jsonify({
            "success": True, 
            "message": "Worksheet processed and stored successfully",
            "data": {
                "worksheet_id": worksheet_id,
                "questions_stored": success_count,
                "blob_id": blob_id
            }
        })

    except Exception as e:
        logger.error(f"Unexpected error processing worksheet: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": "Internal server error",
            "message": str(e)
        }), 500

@ai_routes.route('/get-units', methods=['POST'])
def get_units():
    data = request.json

    class_id = data['classId']
    # allow frontend to pass in classes and notebook data
    if 'classes' in data:
        classes = data['classes']
    else:
        classes = get_user_data("Classes")
    if 'notebooks' in data:
        notebooks = data['notebooks']
    else:
        notebooks = get_user_data("NbS", {"Classes":classes})
    # Get unique units for the given class_id
    units = list(set(notebook['unit'] for notebook in notebooks if int(notebook['classID']) == int(class_id)))
    print("units", units)
    return jsonify({"units": units})

@ai_routes.route('/map_problems', methods=['POST'])
def map_problems_route():
    from main import init
    vars = init()
    data = request.json

    print("in map_problems_route")
    concept_map = data.get('conceptMap')
    problems = data.get('problems')
    
    if not concept_map:
        return json.dumps({"message": "error", "error": "No concept map found for this unit"})
    
    if not problems:
        return json.dumps({"message": "error", "error": "No problems found for this unit"})
    
    # Map the problems to concepts
    result = map_problems(problems, concept_map, vars['llm'])
    
    return json.dumps({"message": "success"})







# Levels routes
@ai_routes.route('/generate-questions', methods=['POST'])
def generate_questions():
    from main import init
    vars = init()
    data = request.json

    class_id = data['classId']
    unit_name = data['unitName']
    mcq_count = data.get('mcqCount', 2)
    written_count = data.get('writtenCount', 3)
    session['current_class'] = class_id
    session['current_unit'] = unit_name
    # Get the notebook content
    classes = get_user_data("Classes")
    notebooks = get_user_data("Notebooks", {"Classes":classes})
    
    subtopics = []
    practice_questions = []
    for item in notebooks:
        if item['classID'] == class_id and item['unit'] == unit_name:
            subtopics += item['subtopics']
            practice_questions += item['practice_questions']

    if not subtopics or not practice_questions:
        return jsonify({"error": "Notebook content not found"}), 404

    try:
        questions = generate_practice_questions(
            vars['llm'], 
            mcq_count, 
            written_count, 
            subtopics, 
            practice_questions
        )
        return jsonify({"questions": questions.model_dump()})
    except Exception as e:
        print(f"Error generating questions: {str(e)}")
        return jsonify({"error": "Failed to generate questions"}), 500


@ai_routes.route('/evaluate_understanding', methods=['POST'])
def evaluate_understanding():
    """Evaluate student's understanding based on their answer and explanation"""
    try:
        # Initialize vars to get LLM
        from main import init
        vars = init()
        
        data = request.get_json()
        
        # Get the problem from the problems list
        problem = next((p for p in data.get('problems', []) 
                       if p['id'] == data['problem_id']), None)
        
        if not problem:
            return jsonify({
                'success': False,
                'error': 'Problem not found'
            }), 404

        # Prepare evaluation context
        evaluation_context = {
            'problem': problem['problem'],
            'student_answer': data.get('answer', ''),
            'student_explanation': data.get('explanation', ''),
            'unit': data.get('unit', ''),
            'attempt_number': data.get('attempt_number', 1),
            'previous_steps': data.get('previous_steps', [])
        }

        # Get evaluation from LLM
        evaluation = evaluate_student_response(vars['llm'], evaluation_context)
        
        # Calculate mastery based on score
        mastery = 'mastered' if evaluation['score'] >= 0.8 else 'derived'
        
        # Add attempt number to response
        response = {
            'success': True,
            'score': evaluation['score'],
            'logical_steps': evaluation['logical_steps'],
            'remaining_steps': evaluation['remaining_steps'],
            'can_resubmit': evaluation['can_resubmit'],
            'mastery': mastery,
            'attempt_number': evaluation_context['attempt_number']
        }
        
        return jsonify(response)

    except Exception as e:
        logger.error(f"Error evaluating understanding: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ai_routes.route('/process_audio', methods=['POST'])
def process_audio():
    print("in process_audio")
    try:
        if 'audio' not in request.files:

            return jsonify({'error': 'No audio file provided'}), 400
            
        audio_file = request.files['audio']
        problem_id = request.form.get('problem_id')
        answer = request.form.get('answer')
        
        print(f"Received audio file: {audio_file.filename}, Content type: {audio_file.content_type}")
        
        # Convert audio to format suitable for speech recognition
        audio_data = audio_file.read()
        audio_io = io.BytesIO(audio_data)
        
        # Initialize speech recognizer with specific settings
        recognizer = sr.Recognizer()
        recognizer.energy_threshold = 300
        recognizer.dynamic_energy_threshold = True
        recognizer.pause_threshold = 0.8
        
        try:
            # Convert audio to AudioFile format
            with sr.AudioFile(audio_io) as source:
                print("Reading audio file...")
                audio = recognizer.record(source)
                print("Audio file read successfully")
                
            try:
                # Perform speech recognition
                print("Starting speech recognition...")
                transcription = recognizer.recognize_google(audio)
                print("Speech recognition completed:", transcription)
                
                return jsonify({
                    'transcription': transcription,
                    'problem_id': problem_id,
                    'answer': answer
                })
                
            except sr.UnknownValueError:
                print("Speech recognition could not understand audio")
                return jsonify({'error': 'Could not understand audio. Please speak clearly and try again.'}), 400
            except sr.RequestError as e:
                print("Speech recognition service error:", str(e))
                return jsonify({'error': f'Speech service error: {str(e)}'}), 500
                
        except Exception as e:
            print("Error processing audio file:", str(e))
            return jsonify({'error': f'Error processing audio file: {str(e)}'}), 500
            
    except Exception as e:
        print(f"Error in process_audio: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500



# Evaluate routes
@ai_routes.route('/evaluate-final', methods=['POST'])
def evaluate_final():
    from main import init
    vars = init()
    data = request.json

    followup_history = data['followupHistory']
    
    # Generate final evaluation
    final_evaluation = generate_final_evaluation(vars['llm'], followup_history)
    final_eval_dict = final_evaluation.model_dump()
    
    return jsonify({"evaluation": final_eval_dict})

#Evaluate AI routes
@ai_routes.route('/generate-followup', methods=['POST'])
def generate_followup():
    from main import init
    vars = init()
    data = request.json

    followup = generate_followup_question(
        vars['llm'],
        data['question'],
        data['answer'],
        data.get('history', [])
    )
    return jsonify({"followup": followup})





#derive routes
@ai_routes.route('/derive-conversation', methods=['POST'])
def derive_conversation():
    from main import init
    vars = init()
    data = request.json

    
    try:
        # Get the concept and user message
        concept = data['concept']
        user_message = data['message']
        chat_history = data.get('chat_history', [])
        prerequisites_completed = data.get('prerequisites_completed', [])
        
        # Get response from derive_concept function
        result = derive_concept(
            vars['llm'],
            concept,
            user_message,
            chat_history,
            prerequisites_completed
        )
        
        # If concept is derived, update UMaps
        if result['derived']:
            # Use existing UMap data passed from frontend
            existing_umap = data.get('existing_umap')

            # Create node progress data
            node_data = {
                "date_derived": datetime.now().strftime("%Y-%m-%d"),
                "chat_history": chat_history + [
                    {"role": "user", "content": user_message},
                    {"role": "assistant", "content": result['response']}
                ]
            }

            if existing_umap:
                # Update existing UMap with new node progress
                existing_umap['node_progress'][str(concept['id'])] = node_data
                update_data(existing_umap['id'], 'id', existing_umap, "UMaps")
            else:
                # generate random 6 digit id
                id = random.randint(0, 1000000)
                # Create new UMap entry
                umap_data = {
                    "OSIS": session['user_data']['osis'],
                    "classID": data['classID'],
                    "unit": data['unit'],
                    "id": int(id),
                    "node_progress": {
                        str(concept['id']): node_data
                    }
                }
                post_data("UMaps", umap_data)
        
        return jsonify({
            "message": result['response'],
            "derived": result['derived']
        })
        
    except Exception as e:
        print(f"Error in derive conversation: {str(e)}")
        return jsonify({"error": "Failed to generate response"}), 500

@ai_routes.route('/get_concept_explanation', methods=['POST'])
def get_concept_explanation():
    from main import init
    vars = init()
    data = request.json
    try:

        # Get concept from the passed concept map data
        concept = next((n for n in data['cmap']['nodes'] 
                       if str(n['id']) == str(data['concept_id'])), None)
        
        if not concept:
            return jsonify({"error": "Concept not found"}), 404
            
        # Generate explanation
        explanation = generate_concept_explanation(
            vars['llm'],
            concept['label'],
            concept['description']
        )
        
        return jsonify(explanation)
        
    except Exception as e:
        print(f"Error in get_concept_explanation: {str(e)}")
        return jsonify({"error": str(e)}), 500

def map_problems(problems_data, concept_map, llm):
    """Map problems to their required concepts using the concept map"""
    from main import init
    vars = init()
    client = OpenAI(api_key=vars['openAIAPI'])
    
    # Filter out problems that already have concept mappings
    unmapped_problems = [prob for prob in problems_data if not prob.get('concepts')]
    
    # If all problems are already mapped, return early
    if not unmapped_problems:
        return "All problems already have concept mappings"
    
    # Format the concept map data: get all concept names and descriptions
    concept_info = {}
    for node in concept_map['nodes']:
        concept_info[node['label']] = {
            'id': node['id'],
            'description': node['description']
        }
    
    # Format only the unmapped problems
    formatted_problems = []
    for prob in unmapped_problems:
        formatted_problems.append({
            "problem_id": prob['id'],
            "text": prob['problem']
        })

    # Define the function schema for structured output
    function_schema = {
        "name": "map_concepts",
        "description": "Map each problem to its required concepts",
        "parameters": {
            "type": "object",
            "properties": {
                "problem_mappings": {
                    "type": "array",
                    "description": "List of problems and their required concepts",
                    "items": {
                        "type": "object",
                        "properties": {
                            "problem_id": {
                                "type": "string",
                                "description": "ID of the problem"
                            },
                            "required_concepts": {
                                "type": "array",
                                "description": "Names of concepts required to solve this problem",
                                "items": {
                                    "type": "string",
                                    "enum": list(concept_info.keys())
                                }
                            }
                        },
                        "required": ["problem_id", "required_concepts"]
                    }
                }
            },
            "required": ["problem_mappings"]
        }
    }

    # Format the prompt
    prompt = f"""You are an expert at analyzing physics problems and identifying the concepts required to solve them.

For each problem, select ALL concepts from the available list that are required to solve it. Choose concepts that are directly needed - don't include prerequisites or related concepts that aren't actually used.

Available concepts:
{json.dumps([{"name": name, "description": info['description']} for name, info in concept_info.items()], indent=2)}

Problems to analyze:
{json.dumps(formatted_problems, indent=2)}"""

    # Generate mappings using OpenAI with function calling
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{
            "role": "user",
            "content": prompt
        }],
        tools=[{
            "type": "function",
            "function": function_schema
        }],
        tool_choice={"type": "function", "function": {"name": "map_concepts"}}
    )

    try:
        # Extract the function call arguments
        function_args = json.loads(response.choices[0].message.tool_calls[0].function.arguments)
        
        # Validate the response format
        if not isinstance(function_args, dict) or 'problem_mappings' not in function_args:
            print("Invalid response structure:", function_args)
            raise ValueError("Response missing 'problem_mappings' key")
            
        mappings = function_args['problem_mappings']
        
        # Update each problem with its concept mappings
        problems_updated = 0
        for mapping in mappings:
            problem_id = mapping['problem_id']
            concept_names = mapping['required_concepts']
            
            # Convert concept names to IDs
            concept_ids = [concept_info[name]['id'] for name in concept_names if name in concept_info]
            
            # Update the problem in the database
            for prob in unmapped_problems:
                if prob['id'] == problem_id:
                    prob['concepts'] = concept_ids
                    update_data(prob['id'], 'id', prob, "Problems")
                    problems_updated += 1
                    break
        
        return f"Successfully mapped {problems_updated} problems to concepts"
        
    except Exception as e:
        print(f"Error processing response: {e}")
        print(f"Raw response:", response)
        raise



# TodoTree routes
@ai_routes.route('/generate_embedding', methods=['POST'])
def create_embedding():
    """Generate embeddings for node context text."""
    import asyncio
    
    try:
        data = request.get_json()
        node_id = data.get('node_id')
        context_text = data.get('context_text')
        
        if not all([node_id, context_text]):
            return jsonify({'error': 'Missing required parameters'}), 400
            
        # Create event loop and run async operations
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        async def process_embedding():
            # Generate embedding for the context
            embedding = await generate_embedding(context_text)
            
            return {
                'success': True,
                'embedding': embedding
            }
        
        # Run the async function and get result
        result = loop.run_until_complete(process_embedding())
        loop.close()
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Error in create_embedding: {str(e)}")
        return jsonify({'error': str(e)}), 500

@ai_routes.route('/AI_embeddings', methods=['POST'])
def get_AI_embeddings():
    """Process chat messages with context embeddings for semantic search."""
    print("in get_AI_embeddings")
    try:
        data = request.get_json()
        messages = data.get('messages', [])
        node_embeddings = data.get('node_embeddings', [])  # List of embeddings from current and parent nodes
        
        if not messages or not node_embeddings:
            return jsonify({'error': 'Missing required parameters'}), 400

        # Combine embeddings with messages for semantic context
        response = chat_with_embeddings(messages, node_embeddings)
        
        return jsonify({
            'response': response
        })
        
    except Exception as e:
        print(f"Error in get_AI_embeddings: {str(e)}")
        return jsonify({'error': str(e)}), 500

@ai_routes.route('/api/opportunities', methods=['POST'])
def get_opportunities():
    data = request.json
    goal = data.get('goal')
    
    if not goal:
        return jsonify({'error': 'No goal provided'}), 400
        
    try:
        # Create a prompt for GPT-4 to generate opportunities
        prompt = f"""Given the goal: "{goal}"
        Please provide a list of specific opportunities (competitions, internships, programs, etc.) that could help achieve this goal.
        Format each opportunity as a JSON object with the following structure:
        {{
            "id": "unique_id",
            "title": "opportunity name",
            "type": "competition/internship/program/etc",
            "description": "detailed description of the opportunity and how it relates to the goal"
        }}
        Return an array of 5-8 relevant opportunities."""
        
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a career and educational opportunity advisor."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        
        # Parse the response and ensure it's valid JSON
        opportunities = json.loads(response.choices[0].message.content)
        
        return jsonify(opportunities)
        
    except Exception as e:
        print(f"Error generating opportunities: {str(e)}")
        return jsonify({'error': 'Failed to generate opportunities'}), 500


