from flask import Blueprint, request, jsonify
import base64
import traceback
from datetime import datetime
import random
import json

from database import *
from classroom import *
from grades import *
from jupiter import *
from study import *

from prompts import *

ai_routes = Blueprint('ai_routes', __name__)





# Function to return insights to the Study page
@ai_routes.route('/AI', methods=['POST'])
def get_AI():
  return json.dumps(get_insights(request.json['data']))

# make route for AI with function calling
@ai_routes.route('/AI_function_calling', methods=['POST'])
def get_AI_function_calling():
  response = chat_with_function_calling(request.json['data'], request.json['grades'])
  print("response", response)

  return json.dumps(response)

@ai_routes.route('/ask-question', methods=['POST'])
def ask_question():
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
                    "difficulty": question["difficulty"]
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
                "subtopics": insights_dict["notes"], 
                "practice_questions": insights_dict["practice_questions"]
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
    


@ai_routes.route('/generate-questions', methods=['POST'])
def generate_questions():
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

@ai_routes.route('/evaluate-final', methods=['POST'])
def evaluate_final():
    data = request.json

    followup_history = data['followupHistory']
    
    # Generate final evaluation
    final_evaluation = generate_final_evaluation(vars['llm'], followup_history)
    final_eval_dict = final_evaluation.model_dump()
    
    return jsonify({"evaluation": final_eval_dict})

#Evaluate AI routes
@ai_routes.route('/generate-followup', methods=['POST'])
def generate_followup():
    data = request.json

    followup = generate_followup_question(
        vars['llm'],
        data['question'],
        data['answer'],
        data.get('history', [])
    )
    return jsonify({"followup": followup})

@ai_routes.route('/evaluate-understanding', methods=['POST'])
def evaluate_understanding():
    data = request.json

    evaluation = generate_final_evaluation(
        vars['llm'],
        data['questionContext'],
        data['history']
    )
    return jsonify({"evaluation": evaluation})


# Levels routes
@ai_routes.route('/generate-bloom-questions', methods=['POST'])
def generate_bloom_questions_route():
    data = request.json

    try:
        questions = generate_bloom_questions(
            vars['llm'],
            data['level'],
            data['previousAnswers'],
            data['notebookContent']
        )
        return jsonify({"questions": questions.model_dump()})
    except Exception as e:
        print(f"Error generating Bloom's questions: {str(e)}")
        return jsonify({"error": "Failed to generate questions"}), 500

@ai_routes.route('/evaluate-answer', methods=['POST'])
def evaluate_answer():
    try:

        data = request.json
        
        # Get problem details
        problems = get_user_data("Problems")
        problem = next((p for p in problems if str(p['id']) == str(data['problem_id'])), None)
        
        if not problem:
            return jsonify({'error': 'Problem not found'}), 404
            
        # Get concept map for context
        cmaps = get_user_data("CMaps")
        cmap = next((m for m in cmaps if m['unit'] == data['unit'] and str(m['classID']) == str(data['class_id'])), None)
        
        if not cmap:
            return jsonify({'error': 'Concept map not found'}), 404
            
        # Prepare evaluation context
        evaluation_context = {
            'problem': problem,
            'student_answer': data['answer'],
            'student_explanation': data['explanation'],
            'concept_map': cmap,
            'unit': data['unit']
        }
        
        # Use LLM to evaluate response
        evaluation = evaluate_student_response(vars['llm'], evaluation_context)
        
        # Calculate mastery level
        mastery = evaluation['score'] >= 0.8
        
        return jsonify({
            'success': True,
            'score': evaluation['score'],
            'correct_concepts': evaluation['correct_concepts'],
            'misconceptions': evaluation['misconceptions'],
            'suggestions': evaluation['suggestions'],
            'mastery': mastery,
            'modifications': {
                'mastery_level': evaluation['score'],
                'score': evaluation['score']
            }
        })
        
    except Exception as e:
        print(f"Error evaluating answer: {str(e)}")
        return jsonify({'error': f'Failed to evaluate answer: {str(e)}'}), 500



@ai_routes.route('/make_explanation_cards', methods=['POST'])
def make_explanation_cards_route():
    data = request.json

    print(data)
    explanations = make_explanation_cards(
        data['notebook'], 
        vars['llm'], 
        data['history'],
        data.get('user_input', None)
    )
    return json.dumps({"explanations": explanations})


@ai_routes.route('/map_problems', methods=['POST'])
def map_problems_route():
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


@ai_routes.route('/save-guide', methods=['POST'])
def save_guide():
    data = request.json

    try:
        post_data("Guides", {
            "classId": data['class_id'],
            "userId": session['user_data']['osis'],
            "content": data['guide_content'],
            "timestamp": datetime.now().isoformat()
        })
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@ai_routes.route('/generate-derive-questions', methods=['POST'])
def generate_derive_questions_route():
    data = request.json

    try:
        # Get notebook synthesis for the selected class/unit
        synthesis_data = data['notebooks']
        synthesis = next((item['synthesis'] for item in synthesis_data 
                         if item['unit'] == data['unit']), None)
        
        if not synthesis:
            return jsonify({"error": "No synthesis found for this unit"}), 404
            
        questions = generate_derive_questions(vars['llm'], synthesis)
        return jsonify(questions.model_dump())
        
    except Exception as e:
        print(f"Error generating derive questions: {str(e)}")
        return jsonify({"error": "Failed to generate questions"}), 500

@ai_routes.route('/evaluate-derive-answer', methods=['POST'])
def evaluate_derive_answer_route():
    data = request.json

    try:
        evaluation = evaluate_derive_answer(
            vars['llm'],
            data['question'],
            data['expected_answer'],
            data['user_answer']
        )
        return jsonify(evaluation.model_dump())
        
    except Exception as e:
        print(f"Error evaluating answer: {str(e)}")
        return jsonify({"error": "Failed to evaluate answer"}), 500


@ai_routes.route('/derive-conversation', methods=['POST'])
def derive_conversation():
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



# Audio processing routes
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