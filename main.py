# Import necessary libraries

# Flask is a web framework for Python that allows backend-frontend communication
from flask import Flask, render_template, request, session, redirect, url_for, send_from_directory, jsonify
# json is a library for parsing and creating JSON data
import json

# hashlib is a library for hashing passwords
import hashlib
# datetime is a library for working with dates and times
import datetime
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




# Get functions from other files
from database import get_data, post_data, update_data, delete_data, download_file, upload_file, init_firebase, get_user_data, send_notification, send_welcome_email
from classroom import init_oauth, oauth2callback, list_courses
from grades import get_grade_points, process_grades, get_weights, calculate_grade, filter_grades, get_stats, update_leagues, get_compliments, get_grade_impact
from jupiter import run_puppeteer_script, jupapi_output_to_grades, jupapi_output_to_classes, get_grades, post_grades, confirm_category_match, check_new_grades, notify_new_member
from study import get_insights, chat_with_function_calling, run_inspire, init_pydantic, process_pdf_content, process_image_content, generate_final_evaluation, generate_followup_question, generate_practice_questions, generate_bloom_questions, evaluate_bloom_answer, save_explanations, generate_explanations, answer_worksheet_question, make_explanation_cards, synthesize_unit

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
      model_name="gpt-4-turbo-preview"
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

@app.route('/StudyLevels')
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

@app.route('/Feedback')
def feedback():
  return render_template('Feedback.html')

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
@app.route('/class/<classurl>')
def class_page(classurl):
  # Pass the class name and class data to the class page
  id = classurl[-4:]
  class_name = classurl.replace(id, "").strip()
  classes = get_user_data("Classes")
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
    classes = get_user_data("Classes")
    class_data = [row for row in classes if str(userid) in row['OSIS']]
    #Turn it into a string with "Classes: x, y, z"
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

# /Jupiter route
@app.route('/jupiter', methods=['POST'])
def Jupiter():
    print("in jup py route")
    data = request.json
    classes = run_puppeteer_script(data['osis'], data['password'])
    
    if classes == "WrongPass":
        return json.dumps({"error": "Incorrect credentials"})

    class_data = get_data("Classes")
    tokens_data = get_data("Tokens")

    if str(data['addclasses'])=="True":
        classes_added = jupapi_output_to_classes(classes, class_data)
        notify_new_member(classes_added, tokens_data)
    
    session['user_data']['grades_key'] = str(data['encrypt'])
    grades = jupapi_output_to_grades(classes, data['encrypt'])
    
    check_new_grades(grades, class_data, tokens_data)
    
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
  response = chat_with_function_calling(request.json['data'])
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
    
    return json.dumps({"answer": answer})

#function to generate insights and return them to the Grade Analysis page
@app.route('/insights', methods=['POST'])
def get_insights_ga():
  classes_data = get_user_data("Classes")
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

class assignment_obj(BaseModel):
  classID: int
  class_name: str
  assignment_name: str
  assignment_date: str


class GC_assignments(BaseModel):
  assignments: list[assignment_obj]

# Google Classroom screenshot Assignment Upload Route
@app.route('/upload_assignments', methods=['POST'])
def upload_assignments():
  data = request.json
  classes = get_user_data("Classes")
  # filter classes for the user's osis and include only the id and name columns
  classes = [{"id": item["id"], "name": item["name"]} for item in classes if str(session['user_data']['osis']) in str(item['OSIS'])]
  # call get_insights with the image file, data['image']
  base64_img = data['image']
  # set the date, in the format "Monday, 1/2/2024"
  date = datetime.datetime.now().strftime('%A, %m/%d/%Y')

  prompts = [
        {"role": "system", "content": "You're role is to extract the name, due date(yyyy-mm-dd), and class of assignments from a Google Classroom assignment screenshot. You will be given the image, a list of all of the class names and ids that the user is i, and today's date. Return the class name that most closely matches the class in the image."},
        {"role": "user", "content": [
            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{base64_img}"}},
            {"type": "text", "text": f"Classes: {classes}"},
            {"type": "text", "text": f"Today's date: {date}"}
        ]}
    ]
  # print("prompts", prompts)
  response = get_insights(prompts, GC_assignments)
  #convert response from string to dictionary
  response = json.loads(response)
  print("response", str(response))
  
  # add the assignments to the Assignments sheet with post_data
  for assignment in response['assignments']:
    rand_id = ''.join([str(random.randint(0, 9)) for _ in range(4)])
    post_data("Assignments", {"class": str(assignment['classID']), "name": assignment['assignment_name'], "due_date": assignment['assignment_date'], "class_name": assignment['class_name'], "id": rand_id})
  return json.dumps({"data": "success"})

@app.route('/GAsetup', methods=['POST'])
def GA_setup():
  # get the user's grades and classes
  classes = get_user_data("Classes")
  weights = get_weights(classes, session['user_data']['osis'])
  grades = get_grades()
  user_data = get_name()
  goals = get_user_data("Goals")
  distributions = get_user_data("Distributions", {"Classes": classes})
  # filter goals for the user's osis
  goals = [item for item in goals if str(session['user_data']['osis']) in str(item['OSIS'])]

  # if there are no grades, return an error
  # if grades is a dictionary with a key 'class' and the value is 'No grades entered', return an error
  if 'class' in grades and grades['class'] == 'No grades entered':
    print("No grades found in GA_setup")
    return json.dumps({"error": "Enter your grades before analyzing them"})
  
  if grades == []:
    print("Key prefix mismatch in GA_setup")
    return json.dumps({"error": "Grade Access not authenticated. Try reloading the page, then repulling your grades."})
  #filter classes for the user's osis
  classes = [item for item in classes if str(session['user_data']['osis']) in str(item['OSIS'])]
  try:
    stats = get_stats(grades, classes)
    compliments = get_compliments(grades, classes)
    # convert dates of grades(m/d/yyyy) to ordinal dates
    ordinal_dated_grades = []
    for grade in grades:
      ordinal_dated_grades.append({"date": datetime.datetime.strptime(grade['date'], "%m/%d/%Y").toordinal(), "value": grade['value'], "class": grade['class'], "category": grade['category'], "score": grade['score'], "name": grade['name']})

    # run get_grade_impact for each grade, and add cat_impact, class_impact, GPA_impact to each grade dictionary
    for grade in ordinal_dated_grades:
      grade_impact = get_grade_impact(grade, grades, weights)
      grade['cat_impact'] = grade_impact[0]
      grade['class_impact'] = grade_impact[1]
      grade['GPA_impact'] = grade_impact[2]

    grade_spreads = {}
    cat_value_sums = {}
    categories = []
    # calculate min and max dates across all grades in form m/d/yyyy
    times = [datetime.datetime.strptime(grade['date'], "%m/%d/%Y").toordinal() for grade in grades]
    # Convert back to dates for min and max
    min_date = datetime.datetime.fromordinal(min(times))
    max_date = datetime.datetime.fromordinal(max(times))
    # calculate 10 times(in ordinal form) between min and max date
    times = [(min_date + datetime.timedelta(days=i*(max_date-min_date).days/10)).toordinal() for i in range(11)]
    # For each category in each class, filter the grades for it
    for c in weights:
      grade_spreads[c] = {}
      cat_value_sums[c] = {}
      for category in weights[c]:
        if category not in categories:
          categories.append(category)
        g = process_grades(grades, c, category, times)
        if g:
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
    "times": times,
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
    "goals": goals,
    "distributions": distributions
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
        
        # Generate blob ID and store file
        blob_id = ''.join([str(random.randint(0, 9)) for _ in range(7)])
        # store the file in the cloud storage
        upload_file("sciweb-files", file_content, blob_id)
        # add to the Notebooks sheet
        post_data("Notebooks", {"classID": data['classID'], "unit": unit, "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "image": blob_id, "topic": insights_dict["topic"], "subtopics": insights_dict["notes"], "practice_questions": insights_dict["practice_questions"]})
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
def evaluate_answer_route():
    data = request.json
    try:
        evaluation = evaluate_bloom_answer(
            vars['llm'],
            data['question'],
            data['answer'],
            data['level']
        )
        return jsonify(evaluation.model_dump())
    except Exception as e:
        print(f"Error evaluating answer: {str(e)}")
        return jsonify({"error": "Failed to evaluate answer"}), 500




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


@app.route('/synthesize_unit', methods=['POST'])
def synthesize_unit_route():
  data = request.json
  synthesis = synthesize_unit(data['notebook'], vars['llm'])
  row = {'synthesis': synthesis, 'classID': int(data['classID']), 'unit': data['unit'], 'id': random.randint(1000000, 9999999)}
  # get data with classID and unit to check if it already exists, in which case, update it
  existing_data = get_data("NbS", row_name="classID", row_val=int(data['classID']))
  for item in existing_data:
    if item['unit'] == data['unit']:
      update_data(item['id'], 'id', row, "NbS")
      return json.dumps({"message": "success"})
  post_data("NbS", row)
  return json.dumps({"message": "success"})


@app.route('/impact', methods=['POST'])
def get_impact():
  data = request.json
  
  grades = get_grades()
  classes = get_user_data("Classes")
  category_grades = filter_grades(grades, session['user_data'], [data['class'], data['category']])
  
  weights = get_weights(classes, session['user_data']['osis'])
  #get current date
  current_date = datetime.datetime.now().date()
  #get grade at current date
  current_grade = calculate_grade(category_grades, weights, current_date)
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

# post grades route
@app.route('/post_grades', methods=['POST'])
def post_grades_route():
  data = request.json
  grades = data['data']
  post_grades(grades, "none")
  return json.dumps({"message": "success"})


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


def utility_function():
  pass

vars = init()
#uncomment to run locally, comment to deploy. Before deploying, change db to firebase, add new packages to requirements.txt

if __name__ == '__main__':
  app.run(host='localhost', port=8080)

