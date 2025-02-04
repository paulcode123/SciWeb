# Import necessary libraries

# hi

# Flask is a web framework for Python that allows backend-frontend communication
from flask import Flask, render_template, request, session, redirect, url_for, send_from_directory, jsonify, Response, stream_with_context
# json is a library for parsing and creating JSON data
import json

# hashlib is a library for hashing passwords
import hashlib
# datetime is a library for working with dates and times
from datetime import datetime, timedelta
# googleapiclient is a library for working with Google APIs(Getting data from Google Sheets in this case)
from googleapiclient.discovery import build
import traceback

# for images
import base64
from io import BytesIO

from pydantic import BaseModel, Field
from typing import Optional
from openai import OpenAI
import random

import openai
from PyPDF2 import PdfReader
import requests


from langchain_community.chat_models import ChatOpenAI
from langchain.memory import ConversationBufferMemory
from langchain_openai import ChatOpenAI

import speech_recognition as sr
import io


# Get functions from other files
from database import get_data, post_data, update_data, delete_data, download_file, upload_file, init_firebase, get_user_data, send_notification, send_welcome_email
from classroom import init_oauth, oauth2callback, list_courses
from grades import get_grade_points, process_grades, get_weights, calculate_grade, filter_grades, get_stats, update_leagues, get_compliments, get_grade_impact
from jupiter import run_puppeteer_script, jupapi_output_to_grades, jupapi_output_to_classes, confirm_category_match, check_new_grades, notify_new_member
from study import *
from prompts import DERIVE_HELP_PROMPT
#get api keys from static/api_keys.json file
keys = json.load(open('api_keys.json'))  




init_firebase()
# Initialize other variables
def init():
  vars = {}
  keys = json.load(open('api_keys.json'))
  vars['openAIAPI'] = keys["OpenAiAPIKey"]
  openai.api_key = vars['openAIAPI']
  vars['spreadsheet_id'] = '1k7VOAgZY9FVdcyVFaQmY_iW_DXvYQluosM2LYL2Wmc8'
  vars['gSheet_api_key'] = keys["GoogleAPIKey"]
  # URL for the SheetDB API, for POST requests
  vars['sheetdb_url'] = 'https://sheetdb.io/api/v1/y0fswwtbyapbd'

  vars['DISCOVERY_SERVICE_URL'] = 'https://sheets.googleapis.com/$discovery/rest?version=v4'

  vars['service'] = build('sheets',
                  'v4',
                  developerKey=vars['gSheet_api_key'],
  discoveryServiceUrl=vars['DISCOVERY_SERVICE_URL'])
  vars['max_column'] = "O"
  vars['AppSecretKey'] = keys["AppSecretKey"]
  # firebase or gsheet
  vars['database'] = 'firebase'
  vars['allow_demo_change'] = True
  vars['client'] = OpenAI(api_key=vars['openAIAPI'])
  vars['google_credentials_path'] = 'cloudRunKey.json'
  
  # Initialize LangChain components
  vars['llm'] = ChatOpenAI(
      api_key=vars['openAIAPI'],
      temperature=0.7,
      model_name="gpt-4o-mini"
  )

  vars['vision_llm'] = ChatOpenAI(
      api_key=vars['openAIAPI'],
      temperature=0.7,
      model_name="gpt-4o"
  )
  
  # Initialize memory for different conversation contexts
  vars['eval_memory'] = ConversationBufferMemory(
      memory_key="chat_history",
      return_messages=True
  )
  init_pydantic()
 
  

  # App secret key for session management
  app.config['SECRET_KEY'] = vars["AppSecretKey"]
  generate_grade_insights = True
  return vars

app = Flask(__name__)
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = True



#initialize the front end: all of the HTML/CCS/JS files
@app.route('/')
def index():
  return render_template('index.html')


@app.route('/GradeAnalysis')
def Grade_analy():
  return render_template('GradeAnalysis.html')


@app.route('/Login')
def Login():
  return render_template('login.html')


@app.route('/EnterGrades')
def EG():
  return render_template('EnterGrades.html')


@app.route('/Goals')
def Goals():
  return render_template('Goals.html')


@app.route('/Profile')
def profile():
  return render_template('Profile.html')


@app.route('/Pitch')
def pitch():
  return render_template('About/Pitch.html')

@app.route('/StudyBot')
def study():
  return render_template('StudyBot.html')

@app.route('/Levels')
def study_levels():
  return render_template('Levels.html')


@app.route('/Diagnostic')
def diagnostic():
  return render_template('Diagnostic.html')

@app.route('/Evaluate')
def evaluate():
  return render_template('Evaluate.html')

@app.route('/GuideBuilder')
def guide_builder():
  return render_template('guidebuilder.html')

@app.route('/Inspire')
def inspire():
  return render_template('inspire.html')

@app.route('/Battle')
def battle():
  return render_template('Battles.html')

@app.route('/Classes')
def classes():
  return render_template('Classes.html')

@app.route('/Leagues')
def leagues():
  return render_template('Leagues.html')

@app.route('/Notebook')
def notebook():
  return render_template('notebook.html')

@app.route('/GetStart')
def getstart():
  return render_template('GetStart.html')

@app.route('/Terms')
def terms():
  return render_template('terms.html')

@app.route('/Assignments')
def assignments():
  return render_template('Assignments.html')

@app.route('/CourseSelection')
def course_selection():
  return render_template('CourseSelection.html')

@app.route('/Messages')
def messages():
  return render_template('messages.html')

@app.route('/StudyFreeform')
def study_freeform():
  return render_template('study.html')

@app.route('/Join')
def join():
  return render_template('About/Join.html')

@app.route('/Team')
def team():
  return render_template('About/Team.html')

@app.route('/Schedule')
def schedule():
  return render_template('schedule.html')

@app.route('/StudyHub')
def study_hub():
    return render_template('StudyHub.html')


@app.route('/simulations/Springs')
def springs_simulation():
    return render_template('Springs.html')

@app.route('/Derive')
@app.route('/derive')
def derive():
    return render_template('Derive.html')

@app.route('/Maps')
def maps():
    return render_template('Maps.html')

@app.route('/Meeting')
def meeting():
    return render_template('meeting.html')
@app.route('/MapBuilder')
def map_builder():
    return render_template('MapBuilder.html')

@app.route('/TodoTree')
def todo_tree():
    return render_template('TodoTree.html')

@app.route('/Tutoring')
def tutoring():
    return render_template('tutoring.html')

# @app.route('/Features/AI')
# def ai_features():
#   return render_template('About/AI.html')

# @app.route('/Features/Social')
# def social_features():
#   return render_template('About/Social.html')

# @app.route('/Features/Analytic')
# def analytic_features():
#   return render_template('About/Analytic.html')
  
@app.route('/ComingSoon')
def coming_soon():
  return render_template('ComingSoon.html')

@app.route('/firebase-messaging-sw.js')
def service_worker():
    return send_from_directory('.', 'firebase-messaging-sw.js')

@app.errorhandler(404)
def page_not_found(e):
    # note that we set the 404 status explicitly
    return render_template('ComingSoon.html'), 404

# The following routes are pages for specific classes and assignments
@app.route('/class/<classid>')
def class_page(classid):
    # Get class data using just the ID
    classes = get_user_data("Classes")
    # get the last 4 characters of the classid
    classid = classid[-4:]
    # Print debug information
    print(f"Looking for class ID: {classid}")
    print(f"Available classes: {[{str(c['id']): c['name']} for c in classes]}")
    
    # Convert both IDs to strings and strip any whitespace for comparison
    class_data = next((row for row in classes if str(row['id']).strip() == str(classid).strip()), None)
    
    if not class_data:
        print(f"Class not found for ID: {classid}")
        return redirect('/dashboard')
    
    print(f"Found class: {class_data['name']}")
    
    # Get class name from the data
    class_name = class_data.get('name', '')
    
    # Handle class image
    if 'img' in class_data and class_data['img']:
        try:
            # Convert image ID to string and ensure it's clean
            img_id = str(class_data['img']).strip()
            # class_data['img'] = download_file("sciweb-files", img_id)
        except Exception as e:
            print(f"Error loading class image: {e}")
            class_data['img'] = None
    
    return render_template('class.html',
                         class_name=class_name,
                         class_data=class_data)



# League page, for specific leagues
@app.route('/league/<leagueid>')
def league_page(leagueid):
  leagues = get_user_data("Leagues")
  league_data = next(
    (row for row in leagues if int(row['id']) == int(leagueid)), None)
  league_name = league_data['Name']
  return render_template('league.html',
                         league_name=league_name)

# Assignment page, for specific assignments
@app.route('/assignment/<assignmentid>')
def assignment_page(assignmentid):
  classes_data = get_user_data("Classes")
  assignments_data = get_user_data("Assignments", {"Classes": classes_data})
  osis = str(session['user_data']['osis'])
  assignment_data = next((row for row in assignments_data if str(row['id']) == str(assignmentid)), None)
  print("assignment_data", assignment_data, "osis", osis)
  # if assignment_data.difficulty.user_data['osis'] exists, set it to the user's difficulty
  diff = assignment_data['difficulty'].get(osis, "") if 'difficulty' in assignment_data else ""
  ts = assignment_data['time_spent'].get(osis, "") if 'time_spent' in assignment_data else ""
  pc = assignment_data['completed'].get(osis, "") if 'completed' in assignment_data else ""
  print("diff", diff, "ts", ts, "pc", pc)

  return render_template('assignment.html', assignment=assignment_data, diff=diff, ts=ts, pc=pc)


@app.route('/users/<userid>')
def public_profile(userid):
  users = get_data("Users")
  profiles = get_data("Profiles")
  
  # Get user data first
  user_data = next(
    ([row['first_name'], row['last_name'], row['grade'], row['osis']] for row in users if str(row['osis']) == str(userid)), None)
  
  # If user doesn't exist at all, return 404
  if user_data is None:
    return render_template('404.html'), 404
    
  profile = next((row for row in profiles if str(row['OSIS']) == str(userid)), None)
  
  # If profile exists, get class data if showClasses is true
  class_data = ""
  if profile and 'showClasses' in profile and profile['showClasses'] == "TRUE":
    classes = get_user_data("Classes")
    class_data = [row for row in classes if str(userid) in row['OSIS']]
    class_data = "Classes: " + ", ".join([row['name'] for row in class_data])
    
  return render_template('pubProf.html',
                       profile=profile,
                       user_data=user_data,
                       classes=class_data)

@app.route('/reviews/<courseid>')
def course_reviews(courseid):
  courses = get_user_data("Courses")
  course_data = next((row for row in courses if row['id'] == courseid), None)
  # convert course_data to json
  course_data = json.loads(json.dumps(course_data))
  return render_template('course_reviews.html',
                         courseData=course_data, courseName=course_data['Name'])

@app.route('/battle/<battleid>')
def battle_page(battleid):
  return render_template('battle.html')

@app.route('/Security')
def security():
    return render_template('Security.html')

@app.route('/BetaTester')
def beta_tester():
    return redirect('https://docs.google.com/forms/d/e/1FAIpQLScJG1bzeTOFa5dXEQUmCOJTAWMhtEWhSASPkQcRO4dwH2_o8Q/viewform?usp=dialog')

# This concludes initializing the front end

#The following route functions post/get data to/from JS files
# It is where the frontend-backend communication happens\

# Get the user's IP address, connects to the user_data.js function
@app.route('/home-ip', methods=['POST'])
def get_home_ip():
  r = request.json
  userId = r['userId']
  grades_key = r['grades_key']
  print("grades_key", grades_key)
  if 'user_data' not in session:
    return json.dumps({'Name': ["Login", 404]})
  session['user_data']['grades_key'] = str(grades_key)
  session.modified = True
  print("grades_key", session['user_data']['grades_key'])
  if 'ip_add' not in session:
    # store the ip address in the session
    session['ip_add'] = userId
    
  print("ip from get_home_ip is:", session['ip_add'], "grades_key", grades_key)
  # return the user's data given their IP address
  return json.dumps({'Name': get_name(str(session['ip_add']))})

# Split into auth and stream endpoints
@app.route('/jupiter_auth', methods=['POST'])
def jupiter_auth():
    data = request.get_json()
    # Store the credentials in session
    session['jupiter_creds'] = {
        'osis': data.get('osis'),
        'password': data.get('password'),
        'addclasses': data.get('addclasses'),
        'updateLeagues': data.get('updateLeagues')
    }
    print("jupiter_creds", session['jupiter_creds'])
    return jsonify({'status': 'ok'})

@app.route('/jupiter_process_classes', methods=['POST'])
def jupiter_process_classes():
    creds = session.get('jupiter_creds', {})
    if not creds:
        return jsonify({'error': 'Not authenticated'}), 401
        
    try:
        classes = run_puppeteer_script(creds['osis'], creds['password'])
        
        if classes == "WrongPass":
            return jsonify({'error': 'Incorrect credentials'})

        # Get the classes and tokens data
        class_data = get_data("Classes")
        tokens_data = get_data("Tokens")
        
        if str(creds['addclasses']).lower() == "true":
            classes_added = jupapi_output_to_classes(classes, class_data)
            notify_new_member(classes_added, tokens_data)
            
        return jsonify({'status': 'success', 'classes': classes})
        
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/jupiter_process_grades', methods=['POST'])
def jupiter_process_grades():
    creds = session.get('jupiter_creds', {})
    if not creds:
        return jsonify({'error': 'Not authenticated'}), 401
        
    try:
        classes = request.json.get('classes')
        if not classes:
            return jsonify({'error': 'No classes data provided'})
            
        # Get the classes and tokens data
        class_data = get_data("Classes")
        tokens_data = get_data("Tokens")
        
        grades = jupapi_output_to_grades(classes)
        check_new_grades(grades, class_data, tokens_data)
        
        if confirm_category_match(grades, class_data):
            jupapi_output_to_classes(classes, class_data)

        if str(creds['updateLeagues']).lower() == "true":
            update_leagues(grades, classes)
            
        return jsonify({'status': 'success', 'grades': grades})
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)})

@app.route('/init_oauth', methods=['POST', 'GET'])
def init_oauth_handler():
  response = init_oauth()
  return response

@app.route('/submit', methods=['POST'])
def submit():
  data = request.json
  post_data("Join", data)
  return json.dumps({"message": "success"})

class inspire_format(BaseModel):
    video_name: str
    video_url: str

@app.route('/inspire', methods=['POST'])
def inspire_handler():
  data = request.json
  print("data", data)
  video = run_inspire(data['data'], inspire_format)
  return json.dumps({"data": video})

@app.route('/oauth2callback', methods=['GET'])
def oauth2callback_handler():
  token = oauth2callback()
  print("session", session['credentials'])
  return redirect(url_for('assignments'))


# This function is called from many JS files to get data from specific sheets
# The requested sheets are passed in as a list: eg. "Grades, Classes"
# It returns the data from the requested sheet
@app.route('/data', methods=['POST'])
def fetch_data():
    data = request.json
    sheets = data['data']
    response = data.get('prev_sheets', {})  # Get prev_sheets from request
    
    # Split the requested sheets into a list
    sheets = sheets.split(", ")

    for sheet in sheets:
        response[sheet] = get_user_data(sheet, response)
    return json.dumps(response)

@app.route('/post_data', methods=['POST'])
def post_data_route():
  data = request.json
  post_data(data['sheet'], data['data'])
  return json.dumps({"message": "success"})

@app.route('/update_data', methods=['POST'])
def update_data_route():
  data = request.json
  response = update_data(data['row_value'], data['row_name'], data['data'], data['sheet'])
  print("response", response)
  return json.dumps({"message": "success"})

@app.route('/delete_data', methods=['POST'])
def delete_data_route():
  data = request.json
  delete_data(data['row_value'], data['row_name'], data['sheet'])
  return json.dumps({"message": "success"})


# Function to return insights to the Study page
@app.route('/AI', methods=['POST'])
def get_AI():
  return json.dumps(get_insights(request.json['data']))

# /send_notification route
@app.route('/send_notification', methods=['POST'])
def send_notification_route():
  data = request.json
  
  # convert list of OSIS to their tokens
  tokens = get_data("Tokens", row_name="OSIS", row_val=data['OSIS'], operator="in")
  for token in tokens:
    send_notification(token['token'], data['title'], data['body'], data['url'])
  return json.dumps({"message": "success"})

@app.route('/check-meeting/<room_name>', methods=['GET'])
def check_meeting(room_name):
    try:
        print("room_name", room_name)
        url = f'https://meet.jit.si/about/public-{room_name}'
        response = requests.get(url)
        print("response content", response.content)
        if response.status_code == 200:
            try:
                print("response", response.json())
                return jsonify(response.json())
            except Exception as e:
                print("error in check_meeting", e)
                return jsonify({
                    'participants': [],
                    'room_exists': False
                })
        else:
            print("error in check_meeting else")
            return jsonify({
                'participants': [],
                'room_exists': False,
                'error': f'Status code: {response.status_code}'
            })
            
    except Exception as e:
        print("error in check_meeting except")
        return jsonify({
            'participants': [],
            'room_exists': False,
            'error': str(e)
        }), 500

class text_and_time(BaseModel):
  text: str
  time: str

class aspirations_format(BaseModel):
  goal: str
  description: str
  importance: str
  steps: list[text_and_time]
  accountability: list[text_and_time]

  
@app.route('/set_aspirations', methods=['POST'])
def set_aspirations():
    response = get_insights(request.json['data'], aspirations_format)
    
    # Parse the JSON string into a Python dictionary
    response_dict = json.loads(response)
    response_dict['id'] = ''.join([str(random.randint(0, 9)) for _ in range(4)])
    response_dict['OSIS'] = session['user_data']['osis']
    
    # Post the dictionary to the Aspirations sheet
    post_data("Aspirations", response_dict)
    
    # Return the original response
    return response

# make route for AI with function calling
@app.route('/AI_function_calling', methods=['POST'])
def get_AI_function_calling():
  response = chat_with_function_calling(request.json['data'], request.json['grades'])
  print("response", response)
  return json.dumps(response)

@app.route('/ask-question', methods=['POST'])
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

@app.route('/solve-question', methods=['POST'])
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




#function to generate insights and return them to the Grade Analysis page
@app.route('/GAsetup', methods=['POST'])
def GA_setup():
  try:
    data = request.json
    if not data:
      return json.dumps({"error": "No data provided"})
      
    # Validate required data is present
    required_fields = ['Classes', 'Grades', 'Goals', 'Distributions']
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
      return json.dumps({"error": f"Missing required fields: {missing_fields}"})
    
    # get the user's grades and classes
    classes = data['Classes']
    if not classes:
      return json.dumps({"error": "No classes data provided"})
      
    user_data = get_name()
    if not user_data:
      return json.dumps({"error": "Could not get user data"})
      
    # Get weights first to validate class setup
    weights = get_weights(classes, session['user_data']['osis'])
    if not weights:
      return json.dumps({"error": "No valid class weights found. Please check your class grading categories."})
    
    grades = data['Grades']
    goals = data['Goals']
    distributions = data['Distributions']
    
    # Validate grades data
    if isinstance(grades, dict) and grades.get('class') == 'No grades entered':
      print("No grades found in GA_setup")
      return json.dumps({"error": "Enter your grades before analyzing them"})
    
    if not grades:
      print("Key prefix mismatch in GA_setup")
      return json.dumps({"error": "Grade Access not authenticated. Try reloading the page, then repulling your grades."})
      
    # filter goals for the user's osis
    goals = [item for item in goals if str(session['user_data']['osis']) in str(item['OSIS'])]
    
    #filter classes for the user's osis
    classes = [item for item in classes if str(session['user_data']['osis']) in str(item['OSIS'])]
    if not classes:
      return json.dumps({"error": "No classes found for user"})
    
    try:
      # Get stats and compliments
      stats = get_stats(grades, classes)
      if not stats:
        return json.dumps({"error": "Could not calculate grade statistics"})
        
      compliments = get_compliments(grades, classes)
      
      # Process grades
      ordinal_dated_grades = []
      for grade in grades:
        try:
          ordinal_dated_grades.append({
            "date": datetime.strptime(grade['date'], "%m/%d/%Y").toordinal(),
            "value": grade['value'],
            "class": grade['class'],
            "category": grade['category'],
            "score": grade['score'],
            "name": grade['name']
          })
        except Exception as e:
          print(f"Error processing grade for ordinal date: {grade}")
          print(f"Error details: {str(e)}")
          continue
      
      if not ordinal_dated_grades:
        return json.dumps({"error": "No valid grades found after date conversion"})
      
      # Calculate grade impacts
      for grade in ordinal_dated_grades:
        try:
          grade_impact = get_grade_impact(grade, grades, weights)
          grade['cat_impact'] = grade_impact[0]
          grade['class_impact'] = grade_impact[1]
          grade['GPA_impact'] = grade_impact[2]
        except Exception as e:
          print(f"Error calculating grade impact: {grade}")
          print(f"Error details: {str(e)}")
          continue
      
      # Setup grade spreads
      grade_spreads = {}
      cat_value_sums = {}
      categories = []
      
      # Calculate time range
      try:
        times = [datetime.strptime(grade['date'], "%m/%d/%Y").toordinal() for grade in grades]
        if not times:
          return json.dumps({"error": "No valid dates found in grades"})
          
        min_date = datetime.fromordinal(min(times))
        max_date = datetime.fromordinal(max(times))
        times = [(min_date + timedelta(days=i*(max_date-min_date).days/10)).toordinal() for i in range(11)]
      except Exception as e:
        print(f"Error calculating time range: {str(e)}")
        return json.dumps({"error": "Could not calculate grade time range"})
      
      # Process grades for each class and category
      for c in weights:
        grade_spreads[c] = {}
        cat_value_sums[c] = {}
        for category in weights[c]:
          if category not in categories:
            categories.append(category)
          g = process_grades(grades, c, category, times)
          if g:
            grade_spreads[c][category] = g
      
      if not any(grade_spreads.values()):
        return json.dumps({"error": "No valid grade spreads could be calculated"})
      
      # Create response data
      response_data = {
        "times": times,
        "grade_spreads": grade_spreads,
        "grades": ordinal_dated_grades,
        "Weights": weights,
        "categories": categories,
        "stats": stats,
        "compliments": compliments,
        "cat_value_sums": cat_value_sums,
        "goals": goals,
        "distributions": distributions
      }
      
      return json.dumps(response_data)
      
    except Exception as e:
      error_message = traceback.format_exc()
      print("Error in grade analysis:", error_message)
      # post error message to Errors sheet in the database
      post_data("Errors", {
        "error": f"Error in grade analysis: {error_message}",
        "OSIS": user_data['osis'],
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
      })
      return json.dumps({
        "error": "An error occurred while analyzing your grades. Please try again or contact support if the problem persists.",
        "details": str(e)
      })
      
  except Exception as e:
    error_message = traceback.format_exc()
    print("Error in GA_setup:", error_message)
    return json.dumps({
      "error": "An unexpected error occurred. Please try again or contact support if the problem persists.",
      "details": str(e)
    })

@app.route('/get-gclasses', methods=['POST'])
def get_gclasses():
  print("in get gclasses")
  classes = list_courses()
  print("classes", classes)
  return json.dumps(classes)

class ResponseTypeNB(BaseModel):
        topic: str
        notes: list[str]
        practice_questions: list[str]

@app.route('/process-notebook-file', methods=['POST'])
def process_notebook_file():
    data = request.json
    file_content = data['file']
    file_type = data['fileType']
    unit = data['unit']
    class_id = data['classID']
    
    try:
        if file_type == 'application/pdf':
            # Process PDF
            pdf_bytes = base64.b64decode(file_content)
            insights = process_pdf_content(vars['llm'], pdf_bytes)
        else:
            # Process image
            insights = process_image_content(vars['vision_llm'], file_content, file_type)

        # Convert Pydantic model to dict
        insights_dict = insights.model_dump()
        worksheet_id = random.randint(0, 1000000)
        # Store all practice questions in Problems sheet
        for question in insights_dict["practice_questions"]:
            question_id = ''.join([str(random.randint(0, 9)) for _ in range(6)])
            post_data("Problems", {
                "id": question_id,
                "classID": class_id,
                "worksheetID": worksheet_id,
                "unit": unit,
                "problem": question["question"],
                "difficulty": question["difficulty"]
            })

        # Select random sample of 3 questions for frontend
        sample_questions = random.sample(insights_dict["practice_questions"], min(3, len(insights_dict["practice_questions"])))
        insights_dict["practice_questions"] = [q["question"] for q in sample_questions]
        
        # Generate blob ID and store file
        blob_id = ''.join([str(random.randint(0, 9)) for _ in range(7)])
        # store the file in the cloud storage
        upload_file("sciweb-files", file_content, blob_id)
        # add to the Notebooks sheet
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
        return jsonify({"success": True, "message": "Worksheet processed and stored successfully"})  
    except Exception as e:
        print(f"Error processing worksheet: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": "Failed to process worksheet"}), 500
  

@app.route('/get-units', methods=['POST'])
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
    


@app.route('/generate-questions', methods=['POST'])
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

@app.route('/evaluate-final', methods=['POST'])
def evaluate_final():
    data = request.json
    followup_history = data['followupHistory']
    
    # Generate final evaluation
    final_evaluation = generate_final_evaluation(vars['llm'], followup_history)
    final_eval_dict = final_evaluation.model_dump()
    
    return jsonify({"evaluation": final_eval_dict})

#Evaluate AI routes
@app.route('/generate-followup', methods=['POST'])
def generate_followup():
    data = request.json
    followup = generate_followup_question(
        vars['llm'],
        data['question'],
        data['answer'],
        data.get('history', [])
    )
    return jsonify({"followup": followup})

@app.route('/evaluate-understanding', methods=['POST'])
def evaluate_understanding():
    data = request.json
    evaluation = generate_final_evaluation(
        vars['llm'],
        data['questionContext'],
        data['history']
    )
    return jsonify({"evaluation": evaluation})


# Levels routes
@app.route('/generate-bloom-questions', methods=['POST'])
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

@app.route('/evaluate-answer', methods=['POST'])
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



@app.route('/make_explanation_cards', methods=['POST'])
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


@app.route('/map_problems', methods=['POST'])
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


@app.route('/save-guide', methods=['POST'])
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

@app.route('/generate-derive-questions', methods=['POST'])
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

@app.route('/evaluate-derive-answer', methods=['POST'])
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


@app.route('/derive-conversation', methods=['POST'])
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


@app.route('/impact', methods=['POST'])
def get_impact():
  data = request.json
  
  grades = 'temporarily unavailable'
  classes = get_user_data("Classes")
  category_grades = filter_grades(grades, session['user_data'], [data['class'], data['category']])
  
  weights = get_weights(classes, session['user_data']['osis'])
  #get current date
  current_date = datetime.now().date()
  #get grade at current date
  current_grade = calculate_grade(category_grades, weights, current_date)
  print("current_grade", current_grade)
  #get total number of points from all grades in the category
  total_points = sum([int(grade['value']) for grade in category_grades])
  print("total_points", total_points)
  return json.dumps({"current_grade": current_grade, "total_points": total_points, "category_weight": weights[data['class'].lower()][data['category'].lower()]})

@app.route('/get-file', methods=['POST'])
def get_file():
    try:
        data = request.json
        if not data or 'file' not in data:
            return json.dumps({"error": "Missing file ID"}), 400
            
        # Get the file from the bucket
        file_data = download_file("sciweb-files", data['file'])
        if not file_data:
            return json.dumps({"error": "File not found"}), 404
            
        # Extract type from metadata if present
        file_type = 'application/octet-stream'
        if file_data.startswith('data'):
            type_end = file_data.find('base64')
            if type_end > 4:  # 'data' length is 4
                file_type = file_data[4:type_end]
                file_data = file_data[type_end + 6:]  # Skip 'base64' part
                
        return json.dumps({
            "file": file_data,
            "type": file_type
        })
    except Exception as e:
        print(f"Error retrieving file: {str(e)}")
        return json.dumps({"error": str(e)}), 500

@app.route('/upload-file', methods=['POST'])
def upload_file_route():
    try:
        data = request.json
        if not data or 'file' not in data or 'name' not in data:
            return json.dumps({"error": "Missing file or name"}), 400
            
        base64_data = data['file']
        file_name = data['name']
        file_type = data.get('type', 'application/octet-stream')
        
        # Ensure proper base64 padding
        padding = 4 - (len(base64_data) % 4)
        if padding != 4:
            base64_data += '=' * padding
            
        # Upload the file to the bucket with type information
        metadata = f"data{file_type}base64"
        upload_file("sciweb-files", base64_data, file_name, metadata)
        return json.dumps({"message": "success"})
    except Exception as e:
        print(f"Error uploading file: {str(e)}")
        return json.dumps({"error": str(e)}), 500



#When the user logs in, their data is posted to the Users sheet
@app.route('/post-login', methods=['POST'])
def postLogin(): 
  raw_data = request.json
  data = raw_data['data']
  mode = raw_data['mode']
  session['ip_add'] = data['IP']
  logins = get_data("Users")
  # hashed password
  unhashed_password = data['password']
  data['password'] = hashlib.sha256(unhashed_password.encode()).hexdigest()
      
  # if the user has logged in before, update their IP address
  if mode == "Login":    
    for row in logins:
      # If the user's osis is already in the Users sheet...
      if not 'password' in row:
        print("no password in row", row)
      if (row['password'] == data['password'] or row['password'] == unhashed_password) and row['first_name'] == data['first_name']:
        # Add their new IP address to the list of IP addresses
        row['IP'] = f"{session['ip_add']}, {row['IP']}"
        
        update_data(row['password'], 'password', row, "Users")
        session['user_data'] = row
        return json.dumps({"data": "success"})
    return json.dumps({"data": "failure"})
  
  # If the user has not logged in before, add their data to the Users sheet
  session['user_data'] = data
  post_data("Users", data)
  
  # Send welcome email for new signups
  if 'email' in data and data['email']:
    send_welcome_email(data['email'], data['first_name'])
  
  return json.dumps({"data": "success"})


# Send notebook data and Generate Practice Questions for the class notebook
@app.route('/notebook', methods=['POST'])
def get_notebook():
  notebooks = get_user_data("Notebooks")
  id = request.json['data']
  insights = 'none'
  # Find the notebook with the matching class ID
  for item in notebooks:
    if item['classID'] == id:
        prompt = [{"role":"system", "content": "Generate 3 practice questions based on this notebook structure."},
                  {"role":"user", "content": str(item['content'])}]
        insights = get_insights(prompt)
        break  # Stop the loop once 'a' is found
  response = {"notebook":notebooks, 'insights': insights}
  return json.dumps(response)


#accept friend request
@app.route('/accept-friend', methods=['POST'])
def acceptFriend():
  data = request.json
  friends = get_user_data("Friends")
  # If status is pending and there already is a row with the same osis and targetOSIS, update the row
  if data['status'] == "accepted":
    update_data(data['id'], 'id', data, "Friends")
    return json.dumps({"data": "success"})
  data['OSIS'] = session['user_data']['osis']
  for row in friends:
    if (row['OSIS'] == data['targetOSIS'] and row['targetOSIS'] == data['OSIS']) or (row['OSIS'] == data['OSIS'] and row['targetOSIS'] == data['targetOSIS']):
      return json.dumps({"data": "success"})
    
  post_data("Friends", data)
  return json.dumps({"data": "success"})






#Function to get the user's name from Users data
def get_name(ip=None, update=False):
  global session

  # If an IP address is passed in, store it in the session
  if ip:
    print("ip", ip)
    session['ip_add'] = ip
    
  utility_function()
  # If the user's data is already stored in the session, return it
  if 'user_data' in session and not update:
    print("user_data already defined in get_name()")
    return session['user_data']
  
  # If the user's data is already stored in the session, return it
  if 'user_data' in session and 'osis' in session['user_data']:
    data = get_data("Users", row_name="osis", row_val=int(session['user_data']['osis']))
    if data and len(data) > 0:
      session['user_data'] = data[-1]
      print("User's name from session", session['user_data']['first_name'])
      return session['user_data']
  
  # If the user's data is not stored in the session, get it from the Users sheet
  data = get_data("Users")
  # If the user's IP address is in the Users data, return their name and other info
  if 'ip_add' in session:
    filtered_data = [entry for entry in data if str(session['ip_add']) in str(entry.get('IP'))]
  else:
    filtered_data = []
  
  
  if filtered_data:
    session['user_data'] = filtered_data[-1]
    print("User's name from ip address", session['ip_add'], "is", session['user_data']['first_name'])
    return session['user_data']
  # If the user's IP address is not in the Users data, then don't do anything
  return "Login", 404


@app.route('/get_concept_explanation', methods=['POST'])
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
@app.route('/process_audio', methods=['POST'])
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




def utility_function():
  pass





  


vars = init()
#uncomment to run locally, comment to deploy. Before deploying, change db to firebase, add new packages to requirements.txt


if __name__ == '__main__':
  app.run(host='localhost', port=8080)




