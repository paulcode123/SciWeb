# Import necessary libraries

# Flask is a web framework for Python that allows backend-frontend communication
from flask import Flask, render_template, request, session, redirect, url_for, send_from_directory, jsonify
# json is a library for parsing and creating JSON data
import json
# requests is a library for getting info from the web
import requests
# datetime is a library for working with dates and times
import datetime
# re is a library for working with regular expressions
import re
# googleapiclient is a library for working with Google APIs(Getting data from Google Sheets in this case)
from googleapiclient.discovery import build
import traceback

# for images
import base64
from io import BytesIO

from pydantic import BaseModel, Field
from openai import OpenAI
import random

import openai
from PyPDF2 import PdfReader




# Get functions from other files
from database import get_data, post_data, update_data, delete_data, download_file, upload_file, init_firebase
from classroom import init_oauth, oauth2callback, list_courses
from grades import get_grade_points, process_grades, get_weights, calculate_grade, filter_grades, make_category_groups, decode_category_groups, get_stats, update_leagues, get_compliments
from jupiter import run_puppeteer_script, jupapi_output_to_grades, jupapi_output_to_classes, get_grades, post_grades, confirm_category_match
from study import get_insights, get_insights_from_file, chat_with_function_calling

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
  
  return vars

vars = init()

app = Flask(__name__)
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = True

# App secret key for session management
app.config['SECRET_KEY'] = vars["AppSecretKey"]
generate_grade_insights = True

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

@app.route('/StudyLevels')
def study_levels():
  return render_template('Levels.html')

@app.route('/Diagnostic')
def diagnostic():
  return render_template('Diagnostic.html')

@app.route('/Evaluate')
def evaluate():
  return render_template('Evaluate.html')


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

@app.route('/Join')
def join():
  return render_template('About/Join.html')

@app.route('/ComingSoon')
def ComingSoon():
  return render_template('ComingSoon.html')

@app.route('/Features/AI')
def ai_features():
  return render_template('About/AI.html')

@app.route('/Features/Social')
def social_features():
  return render_template('About/Social.html')

@app.route('/Features/Analytic')
def analytic_features():
  return render_template('About/Analytic.html')

@app.route('/firebase-messaging-sw.js')
def service_worker():
    return send_from_directory('.', 'firebase-messaging-sw.js')

# The following routes are pages for specific classes and assignments
@app.route('/class/<classurl>')
def class_page(classurl):
  # Pass the class name and class data to the class page
  id = classurl[-4:]
  class_name = classurl.replace(id, "").strip()
  classes = get_data("Classes")
  print(classes)
  class_data = next((row for row in classes if str(row['id']) == str(id)), None)
  print(classes[4]['id'], str(id), str(classes[4]['id']) == str(id))
  print(class_data)
  # class_img = ""
  # if 'img' in class_data and class_data['img'] != "":
  #   class_img = download_file("sciweb-files", class_data['img'])
  return render_template('class.html',
                         class_name=class_name,
                         class_data=class_data)



# League page, for specific leagues
@app.route('/league/<leagueid>')
def league_page(leagueid):
  leagues = get_data("Leagues")
  league_data = next(
    (row for row in leagues if int(row['id']) == int(leagueid)), None)
  league_name = league_data['Name']
  return render_template('league.html',
                         league_name=league_name)

# Assignment page, for specific assignments
@app.route('/assignment/<assignmentid>')
def assignment_page(assignmentid):
  assignments_data = get_data("Assignments")
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
  
  profile = next((row for row in profiles if str(row['OSIS']) == str(userid)), None)
  # if profile is not found, return an error without a separate page
  if profile == None:
    return json.dumps({"error": "Profile not found"})

  
  #Get just first name, last name, grade, and osis of the user, still as a dictionary
  user_data = next(
    ([row['first_name'], row['last_name'], row['grade'], row['osis']] for row in users if row['osis'] == userid), None)
  #If the user wishes to show their classes
  class_data = ""
  if 'showClasses' in profile and profile['showClasses'] == "TRUE":
    classes = get_data("Classes")
    class_data = [row for row in classes if str(userid) in row['OSIS']]
    #Turn it into a string with "Classes: x, y, z"
    class_data = "Classes: " + ", ".join([row['name'] for row in class_data])
  return render_template('pubProf.html',
                         profile=profile,
                         user_data=user_data,
                         classes=class_data)

@app.route('/reviews/<courseid>')
def course_reviews(courseid):
  courses = get_data("Courses")
  course_data = next((row for row in courses if row['id'] == courseid), None)
  # convert course_data to json
  course_data = json.loads(json.dumps(course_data))
  return render_template('course_reviews.html',
                         courseData=course_data, courseName=course_data['Name'])

@app.route('/battle/<battleid>')
def battle_page(battleid):
  return render_template('battle.html')
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

# /Jupiter route
@app.route('/jupiter', methods=['POST'])
def Jupiter():
  print("in jup py route")
  # get_gclassroom_api_data()
  data = request.json
  classes= run_puppeteer_script(data['osis'], data['password'])
  
  if classes == "WrongPass":
    return json.dumps({"error": "Incorrect credentials"})

  class_data = get_data("Classes")

  if str(data['addclasses'])=="True":
    jupapi_output_to_classes(classes, class_data)
  
  session['user_data']['grades_key'] = str(data['encrypt'])
  grades = jupapi_output_to_grades(classes, data['encrypt'])
  # if the categories in the grades do not match the categories in the classes, rerun the function
  if confirm_category_match(grades, class_data):
     jupapi_output_to_classes(classes, class_data)

  if str(data['updateLeagues'])=="True":
    update_leagues(grades, classes)
  return json.dumps(grades)

@app.route('/init_oauth', methods=['POST', 'GET'])
def init_oauth_handler():
  response = init_oauth()
  return response

@app.route('/submit', methods=['POST'])
def submit():
  data = request.json
  post_data("Join", data)
  return json.dumps({"message": "success"})

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
  sheets = request.json['data']
  # Split the requested sheets into a list
  sheets = sheets.split(", ")
  response = {}

  for sheet in sheets:
    print("sheet", sheet)
    # if trying to get just the user's data, call the get_name function
    if sheet=="Name":
      response[sheet] = get_name()
    # if trying to get data from sheet, but only rows where OSIS column includes the user's osis
    elif "FILTERED" in sheet:
      # if session['user_data'] is not defined, throw an error
      if 'user_data' not in session:
        return json.dumps({"error": "User data not found"})
      # get the sheet name without the "FILTERED " prefix
      sheet_name = sheet.replace("FILTERED ", "")
      # special case for the Grades, since it's not a normal sheet: it must be processed differently
      if sheet_name=="Grades":
        response[sheet_name] = get_grades()
      else:
        data = get_data(sheet_name)
        # if data is of type NoneType, rfeturn an empty list
        if data == None:
          return json.dumps({})
        
        # if the sheet is one of these exceptions that require special filtering
        if sheet_name=="Friends":
          #send if the user's osis is in the OSIS or targetOSIS of the row
          response[sheet_name] = [item for item in data if str(session['user_data']['osis']) in item['OSIS'] or str(session['user_data']['osis']) in item['targetOSIS']]
        elif sheet_name=="Assignments":
          # send if item['class'] is the id for any of the rows in response['Classes']
          class_ids = [item['id'] for item in response['Classes']]
          response[sheet_name] = [item for item in data if item['class'] in class_ids]
        elif sheet_name=="Notebooks":
          #  send if the classID is the id for any of the rows in response['Classes']
          class_ids = [item['id'] for item in response['Classes']]
          response[sheet_name] = [item for item in data if item['classID'] in class_ids]
        elif sheet_name=="FClasses":
          #send all of the classes that the user's friends are in
          friend_osises = [item['targetOSIS'] for item in data if str(session['user_data']['osis']) in item['OSIS']] + [item['OSIS'] for item in data if str(session['user_data']['osis']) in item['targetOSIS']]
          r = []
          classes = get_data("Classes")
          for friend in friend_osises:
            r += [item for item in classes if friend in item['OSIS']]
          response[sheet_name] = r
        else:
          #Otherwise, filter the data for the user's osis
          response[sheet_name] = [item for item in data if str(session['user_data']['osis']) in str(item['OSIS'])]
    elif sheet=="Users":
      #only include the first 3 columns of the Users sheet, first_name, last_name, and osis
      data = get_data(sheet)
      response[sheet] = [{key: item[key] for key in item if key in ['first_name', 'last_name', 'osis']} for item in data]
    else:
      response[sheet] = get_data(sheet)
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
  return json.dumps(study_response(request.json['data']))

# make route for AI with function calling
@app.route('/AI_function_calling', methods=['POST'])
def get_AI_function_calling():
  response = chat_with_function_calling(request.json['data'])
  print("response", response)
  return json.dumps(response)

#function to generate insights and return them to the Grade Analysis page
@app.route('/insights', methods=['POST'])
def get_insights_ga():
  classes_data = get_data("Classes")
  user_data = get_name()
  grades = get_grades()
  grade_spreads = {}

  grade_spreads["All"] = process_grades(grades, user_data, classes_data)
  # If the user is graphing all of their classes, allow insights to be generated for each class and category individually by getting the user's grades for each class to pass to the AI
  weights = get_weights(classes_data, user_data['osis'])
  
  for className in weights:
    for category in weights[className]:
    # Get the user's grades for the class and category
      fgrades = filter_grades(grades, user_data, [className.lower(), category.lower()])
      t, g = process_grades(fgrades, user_data, classes_data, extend_to_goals=False)
      # If the user has grades for the class, add the class and the grades to the list of grade spreads
      if type(t)!='int':
        grade_spreads[className+" "+category] = g
    # do it for the class as a whole
    fgrades = filter_grades(grades, user_data, [className.lower(), "All"])
    t, g = process_grades(fgrades, user_data, classes_data, extend_to_goals=False)
    grade_spreads[className] = g
    
  # Generate the insights
  prompt = [{"role":"system", "content": "You are an advisor to a high school student, and your job is to curate 5 insightful and specific areas for the student to focus on. You will get lists of the student's grades for a given class/category at 10 sequential times during the year. Write a numbered list and nothing else."},
            {"role": "user", "content": str(grade_spreads)}]
  
  insights = get_insights(prompt)
  return json.dumps(insights)



@app.route('/GAsetup', methods=['POST'])
def GA_setup():
  # get the user's grades and classes
  classes = get_data("Classes")
  weights = get_weights(classes, session['user_data']['osis'])
  grades = get_grades()
  user_data = get_name()
  goals = get_data("Goals")
  # filter goals for the user's osis
  goals = [item for item in goals if str(session['user_data']['osis']) in str(item['OSIS'])]

  # if there are no grades, return an error
  # if grades is a dictionary with a key 'class' and the value is 'No grades entered', return an error
  if 'class' in grades and grades['class'] == 'No grades entered':
    print("No grades found in GA_setup")
    return json.dumps({"error": "Enter your grades before analyzing them"})
  #filter classes for the user's osis
  classes = [item for item in classes if str(session['user_data']['osis']) in str(item['OSIS'])]
  try:
    stats = get_stats(grades, classes)
    compliments = get_compliments(grades, classes)
    # convert dates of grades(m/d/yyyy) to ordinal dates
    ordinal_dated_grades = []
    for grade in grades:
      ordinal_dated_grades.append({"date": datetime.datetime.strptime(grade['date'], "%m/%d/%Y").toordinal(), "value": grade['value'], "class": grade['class'], "category": grade['category'], "score": grade['score'], "name": grade['name']})


    grade_spreads = {}
    cat_value_sums = {}
    categories = []
    # calculate min and max dates across all grades in form m/d/yyyy
    times = [datetime.datetime.strptime(grade['date'], "%m/%d/%Y").toordinal() for grade in grades]
    # Convert back to dates for min and max
    min_date = datetime.datetime.fromordinal(min(times))
    max_date = datetime.datetime.fromordinal(max(times))
    # For each category in each class, filter the grades for it
    for c in weights:
      grade_spreads[c] = {}
      cat_value_sums[c] = {}
      for category in weights[c]:
        if category not in categories:
          categories.append(category)
        fgrades = filter_grades(grades, user_data, [c.lower(), category.lower()])
        cat_value_sums[c][category] = sum([int(grade['value']) for grade in fgrades])
        # If the user has grades for the class, add the class and the grades to the list of grade spreads
        if fgrades:
          print("fgrades", fgrades)
          times, g = process_grades(fgrades, user_data, classes, s_max_date=max_date, s_min_date=min_date)
          grade_spreads[c][category] = g
   
    # Get the goals that the user has set, and create objects to overlay on the graph
    # goals, set_coords, max_date = get_goals(classes, user_data, grades, times, grade_spread)

  except Exception as e:
    # get detailed error message
    error_message = traceback.format_exc()
    print("Error in post_ga_grades:", error_message)
    # post error message to Errors sheet in the database
    e = "Error in post_ga_grades: "+error_message
    post_data("Errors", {"error": e, "OSIS": user_data['osis']})
    return json.dumps({"error": "You have encountered an error :( Please contact pauln30@nycstudents.net with this text:    "+error_message})
  # Create a dictionary to return the calculated data to the frontend
  response_data = {
    "times": times.tolist(),
    "grade_spreads": grade_spreads,
    # "goals": goals,
    # "goal_set_coords": set_coords,
    "grades": ordinal_dated_grades,
    # "max_date": max_date,
    "Weights": weights,
    "categories": categories,
    "stats": stats,
    "compliments": compliments,
    "cat_value_sums": cat_value_sums,
    "goals": goals
  }



  return json.dumps(response_data)

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
    
    
    if file_type == 'application/pdf':
         # Decode the base64 PDF content
        pdf_bytes = base64.b64decode(file_content)
        pdf_file = BytesIO(pdf_bytes)
        pdf_reader = PdfReader(pdf_file)
        
        # Extract text from the PDF
        text_content = ""
        for page in pdf_reader.pages:
            text_content += page.extract_text()
        
        prompts = [
            {"role": "system", "content": "You are an expert at analyzing educational worksheets and creating study materials."},
            {"role": "user", "content": f"Analyze this worksheet PDF content and provide the following information:\n1. The main topic of the worksheet\n2. A list of specific notes about the content of the worksheet\n3. Several practice questions related to the worksheet content\n\nPDF Content:\n{text_content[:4000]}"}  # Limit content to 4000 characters to avoid token limits
        ]
        
        insights = get_insights(prompts, ResponseTypeNB)
        
        
    else:
        # Process image (existing code)
        base64_img = file_content
        
        # Fix padding if necessary
        padding = len(base64_img) % 4
        if padding:
            base64_img += '=' * (4 - padding)
        
        prompts = [
            {"role": "system", "content": "You are an expert at analyzing educational worksheets and creating study materials."},
            {"role": "user", "content": [
                {"type": "text", "text": "Analyze this worksheet image and provide the following information:\n1. The main topic of the worksheet\n2. A list of specific subtopics or concepts the user needs to know\n3. Several practice questions related to the worksheet content\nFormat your response as JSON with keys 'topic', 'subtopics', and 'practice_questions'."},
                {"type": "image_url", "image_url": {"url": f"data:image/{file_type.split('/')[-1]};base64,{base64_img}"}}
            ]}
        ]
        
        insights = get_insights(prompts, ResponseTypeNB)
    
    # generate a random 7 digit number
    blob_id = ''.join([str(random.randint(0, 9)) for _ in range(7)])
    # store the file in the cloud storage
    upload_file("sciweb-files", file_content, blob_id)
    # add to the Notebooks sheet
    post_data("Notebooks", {"classID": data['classID'], "unit": unit, "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "image": blob_id, "topic": insights.topic, "subtopics": insights.notes, "practice_questions": insights.practice_questions})
    return jsonify({"success": True, "message": "Worksheet processed and stored successfully"})  
  
# set response format class. for mcq, the key is the question, and the value is the answer
class MultipleChoiceQuestion(BaseModel):
    question: str
    answers: list[str]
    correct_answer: str

class response_format(BaseModel):
    multiple_choice: list[MultipleChoiceQuestion]
    short_response: list[str]

@app.route('/generate-questions', methods=['POST'])
def generate_questions():
    data = request.json
    class_id = data['classId']
    unit_name = data['unitName']  # Changed from unitIndex to unitName

    # Get the notebook content for the selected class and unit
    notebooks = get_data("Notebooks")
    # get one list of all of the subtopics from all of the images and one list of all of the practice questions from all of the images
    subtopics = []
    practice_questions = []
    for item in notebooks:
        if item['classID'] == class_id and item['unit'] == unit_name:
            subtopics += item['subtopics']
            practice_questions += item['practice_questions']

    
        

    if not subtopics or not practice_questions:
        return jsonify({"error": "Notebook content not found"}), 404

  
    # Generate questions using AI
    prompt = [
    {"role": "system", "content": "You are an AI designed to generate educational questions given a list of topics and examples."},
    {"role": "user", "content": f"Generate 2 multiple-choice questions, each with 4 answer choices, and 3 short-response questions based on these topics: {subtopics} and examples: {practice_questions}. Ensure your response is in the correct JSON format."}
]

    questions = get_insights(prompt, response_format)

    return json.dumps({"questions": questions.dict()})


@app.route('/get-units', methods=['POST'])
def get_units():
    data = request.json
    class_id = data['classId']
    notebooks = get_data("Notebooks")
    # Get unique units for the given class_id
    units = list(set(notebook['unit'] for notebook in notebooks if notebook['classID'] == class_id))
    
    return jsonify({"units": units})
    
class Feedback(BaseModel):
    feedback: str
    score: int

class ResponseTypeQA(BaseModel):
    feedback: list[Feedback]
    weaknesses: list[str]
    strengths: list[str]
    test_score: int

@app.route('/score-answers', methods=['POST'])
def score_answers():
    data = request.json
    questions = data['questions']
    user_answers = data['answers']

    score = 0

    for i in range(len(questions['multiple_choice'])):
        if user_answers[i] == questions['multiple_choice'][i]['correct_answer']:
            score += 20
        
    prompt = [
        {"role": "system", "content": "You are an AI assistant tasked with scoring a student's answers to open-ended questions. Score each answer on a scale of 0 to 20, provide feedback on each answer, provide a list of areas of strengths and weaknesses over all of the questions, and a predicted score on a test of this material given all of the questions, out of 100."},
        {"role": "user", "content": f"Questions: {questions['short_response']}\nStudent's Answers: {user_answers}"}
    ]

    ai_score = get_insights(prompt, ResponseTypeQA)
    ai_score = ai_score.dict()
    print("ai_score", ai_score)

    return jsonify({"MCQscore": score, "SAQ_feedback": ai_score})

class BloomQuestion(BaseModel):
    question: str
    personalDifficulty: int

class ResponseTypeBloom(BaseModel):
    questions: list[BloomQuestion]

@app.route('/generate-bloom-questions', methods=['POST'])
def generate_bloom_questions():
    data = request.json
    level = data['level']
    previous_answers = data['previousAnswers']
    notebook_content = data['notebookContent']

    # Generate questions using AI
    prompt = [
        {"role": "system", "content": f"Generate 5 specific short-response questions about the topics/example questions. The questions should be at the {level} level of Bloom's Taxonomy. After asking about all of the material, use the user's previous answers to generate questions like the ones they got wrong. Assign a personal difficulty to each question based on how well the user did on similar questions in the past, where 1 is easy and 10 is hard."},
        {"role": "user", "content": "notebook content: " + str(notebook_content) + "\n previous answers: " + str(previous_answers)}
    ]

    questions = get_insights(prompt, ResponseTypeBloom)

    return json.dumps({"questions": questions.dict()})

class ScoreBloom(BaseModel):
  score: int
  feedback: str

@app.route('/evaluate-answer', methods=['POST'])
def evaluate_answer():
    data = request.json
    question = data['question']
    answer = data['answer']
    level = data['level']

    prompt = [
        {"role": "system", "content": f"You are an AI assistant tasked with evaluating a student's answer to a {level}-level question in Bloom's Taxonomy. Score the answer on a scale of 0 to 10, where 10 is a perfect answer. Provide the score and some feedback."},
        {"role": "user", "content": f"Question: {question}\nStudent's Answer: {answer}"}
    ]

    evaluation = get_insights(prompt, ScoreBloom)

    return json.dumps({"score": evaluation.score, "feedback": evaluation.feedback})


@app.route('/impact', methods=['POST'])
def get_impact():
  data = request.json
  
  grades = get_grades()
  classes = get_data("Classes")
  category_grades = filter_grades(grades, session['user_data'], [data['class'], data['category']])
  
  weights = get_weights(classes, session['user_data']['osis'])
  #get current date
  current_date = datetime.datetime.now().date()
  #get grade at current date
  current_grade = calculate_grade(current_date, category_grades, weights)
  print("current_grade", current_grade)
  #get total number of points from all grades in the category
  total_points = sum([int(grade['value']) for grade in category_grades])
  print("total_points", total_points)
  return json.dumps({"current_grade": current_grade, "total_points": total_points, "category_weight": weights[data['class'].lower()][data['category'].lower()]})

@app.route('/get-file', methods=['POST'])
def get_file():
  data = request.json
  print(data)
  # Get the file from the bucket
  base64 = download_file("sciweb-files", data['file'])
  return json.dumps({"file": str(base64)})

@app.route('/upload-file', methods=['POST'])
def upload_file_route():
  data = request.json
  print(data['file'][:100])
  # Upload the file to the bucket
  upload_file("sciweb-files", data['file'], data['name'])
  return json.dumps({"message": "success"})



#When the user logs in, their data is posted to the Users sheet
@app.route('/post-login', methods=['POST'])
def postLogin(): 
  raw_data = request.json
  data = raw_data['data']
  mode = raw_data['mode']
  session['ip_add'] = data['IP']
  logins = get_data("Users")
  #remove the user's ip addresses from all other accounts
  # for row in logins:
  #   if session['ip_add'] in row['IP']:
  #     row['IP'] = row['IP'].replace(session['ip_add'], "")
  #     #if the ip address is the only one in the list(no numbers in row['IP']), remove the row
  #     if not any(char.isdigit() for char in row['IP']):
  #       delete_data("Users", row['osis'], "osis")
  #     else:
  #       update_data(row['osis'], 'osis', row, "Users")
      
  # if the user has logged in before, update their IP address
  if mode == "Login":    
    for row in logins:
      # If the user's osis is already in the Users sheet...
      if row['password'] == data['password'] and row['first_name'] == data['first_name']:
        # Add their new IP address to the list of IP addresses
        row['IP'] = f"{session['ip_add']}, {row['IP']}"
        
        update_data(row['password'], 'password', row, "Users")
        session['user_data'] = row
        return json.dumps({"data": "success"})
    return json.dumps({"data": "failure"})
  
  # If the user has not logged in before, add their data to the Users sheet
  session['user_data'] = data
  post_data("Users", data)
  return json.dumps({"data": "success"})


# Send notebook data and Generate Practice Questions for the class notebook
@app.route('/notebook', methods=['POST'])
def get_notebook():
  notebooks = get_data("Notebooks")
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
  friends = get_data("Friends")
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

# post grades route
@app.route('/post_grades', methods=['POST'])
def post_grades_route():
  data = request.json
  grades = data['data']
  post_grades(grades, "none")
  return json.dumps({"message": "success"})


#Function to get the user's name from Users data
def get_name(ip=None):
  global session
  
  # If an IP address is passed in, store it in the session
  if ip:
    print("ip", ip)
    session['ip_add'] = ip
    
  # If the user's data is already stored in the session, return it
  if 'user_data' in session:
    print("user_data already defined in get_name()")
    return session['user_data']
  

  data = get_data("Users")
  print(data)
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







#uncomment to run locally, comment to deploy. Before deploying, change db to firebase, add new packages to requirements.txt

if __name__ == '__main__':
  app.run(host='localhost', port=8080)