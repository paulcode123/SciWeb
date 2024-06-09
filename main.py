# Import necessary libraries

# Flask is a web framework for Python that allows backend-frontend communication
from flask import Flask, render_template, request, session, redirect, url_for
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

# for images
import base64
from io import BytesIO
from PIL import Image

# import openai




# Get functions from other files
from database import get_data, post_data, update_data, delete_data, download_file, upload_file, init_firebase
from classroom import init_oauth, oauth2callback, list_courses
from grades import get_grade_points, process_grades, get_weights, calculate_grade, filter_grades, make_category_groups, decode_category_groups, get_stats, update_leagues
from goals import calculate_goal_progress, get_goals
from jupiter import run_puppeteer_script, jupapi_output_to_grades, jupapi_output_to_classes, get_grades

#get api keys from static/api_keys.json file
<<<<<<< Updated upstream
=======
keys = json.load(open('api_keys.json'))  




# Function to initialize the Google Sheets API
def init_gapi():
  spreadsheet_id = '1k7VOAgZY9FVdcyVFaQmY_iW_DXvYQluosM2LYL2Wmc8'
  # API key for accessing the Google Sheets API: find it in the "Getting Started with Contributing" document
  # Remember to keep it secret, and don't publish it to GitHub
  api_key = keys["GoogleAPIKey"]

  # URL for the SheetDB API, for POST requests
  sheetdb_url = 'https://sheetdb.io/api/v1/y0fswwtbyapbd'

  DISCOVERY_SERVICE_URL = 'https://sheets.googleapis.com/$discovery/rest?version=v4'

  service = build('sheets',
                  'v4',
                  developerKey=api_key,
  discoveryServiceUrl=DISCOVERY_SERVICE_URL)
  max_column = "K"

  return spreadsheet_id, api_key, sheetdb_url, DISCOVERY_SERVICE_URL, service, max_column
>>>>>>> Stashed changes

init_firebase()
# Initialize other variables
def init():
  vars = {}
  keys = json.load(open('api_keys.json'))
  vars['openAIAPI'] = keys["OpenAiAPIKey"]
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
  vars['database'] = 'gsheet'
  vars['allow_demo_change'] = True
  
  return vars

vars = init()

app = Flask(__name__)

# App secret key for session management
app.secret_key = vars["AppSecretKey"]
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
  return render_template('Pitch.html')

@app.route('/Study')
def study():
  return render_template('Study.html')

@app.route('/Classes')
def classes():
  return render_template('Classes.html')

@app.route('/Leagues')
def leagues():
  return render_template('Leagues.html')

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

# For class notebooks of specific classes
@app.route('/class/<classurl>/notebook')
def notebook_page(classurl):
  #Again, pass in class specific data
  id = re.findall('[0-9]+', classurl)[0]
  class_name = classurl.replace(id, "").strip()
  classes = get_data("Classes")
  class_data = next((row for row in classes if row['id'] == id), None)
  return render_template('notebook.html',
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
  assignments = get_data("Assignments")
  assignment_data = next(
    (row for row in assignments if int(row['id']) == int(assignmentid)), None)
  assignment_name = assignment_data['name']
  return render_template('assignment.html',
                         assignment_name=assignment_name,
                         assignment_data=assignment_data)

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
  if str(data['addclasses'])=="True":
    jupapi_output_to_classes(classes)
  
  session['user_data']['grades_key'] = str(data['encrypt'])
  grades = jupapi_output_to_grades(classes, data['encrypt'])
  if str(data['updateLeagues'])=="True":
    update_leagues(grades)
  return json.dumps(grades)

@app.route('/init_oauth', methods=['POST', 'GET'])
def init_oauth_handler():
  response = init_oauth()
  return response

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
        # if data is of type NoneType, return an empty list
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

@app.route('/goals_progress', methods=['POST'])
def get_goals_progress():
  return json.dumps(calculate_goal_progress(session))

# Function to return insights to the Study page
@app.route('/AI', methods=['POST'])
def get_AI():
  return json.dumps(get_insights(request.json['data']))

#function to generate insights and return them to the Grade Analysis page
@app.route('/insights', methods=['POST'])
def get_insights_ga():
  classes_data = get_data("Classes")
  user_data = get_name()
  grades = get_grades()
  grade_spreads = []

  grade_spread = process_grades(grades, ["all", "All"], user_data, classes_data)
  # If the user is graphing all of their classes, allow insights to be generated for each class individually by getting the user's grades for each class to pass to the AI
  
  matching_classes = [item['name'] for item in classes_data if session['user_data']['osis'] in item['OSIS']]
  
  for item in matching_classes:
    # Get the user's grades for the class
    t, g = process_grades(grades, [item.lower(), "All"], user_data, classes_data)
    # If the user has grades for the class, add the class and the grades to the list of grade spreads
    if type(t)!='int':
      grade_spreads.append(item+": "+str(g))
    
  # Generate the insights
  prompt = [{"role":"system", "content": "You are an advisor to a high school student, and your job is to curate 5 insightful and specific ways in which the students grades over time in individual classes influence their overall grade, and what they should focus their efforts on improving. Write a numbered list and nothing else."},
            {"role": "user", "content": "total: "+str(grade_spread)+"factors: "+str(grade_spreads)}]
  
  insights = get_insights(prompt)
  return json.dumps(insights)

# Function to return grades to the Grade Analysis page
@app.route('/grades_over_time', methods=['POST'])
def post_ga_grades():
  data = request.json
  classes = data['classes']
  classes = decode_category_groups(classes)
  print("specificity", data['specificity'])
  specificity = int(data['specificity'])
  # Get User, Class, and Grade data
  classes_data = get_data("Classes")
  # grades = get_data("Grades")
  grades = get_grades()
  print("len grades in post_ga_grades", len(grades))
  
  
  user_data = get_name()
  grade_points = get_grade_points(grades, user_data, classes)

  # Calculate the user's grades over time, return the grades at their corresponding dates
  times, grade_spread = process_grades(grades, classes, user_data, classes_data, specificity)

  # Get the goals that the user has set, and create objects to overlay on the graph
  goals, set_coords, max_date = get_goals(classes, user_data, grades, times, grade_spread)
  # Create a dictionary to return the calculated data to the frontend
  response_data = {
    "times": times.tolist(),
    "grade_spread": grade_spread,
    "goals": goals,
    "goal_set_coords": set_coords,
    "grade_points": grade_points,
    "max_date": max_date
  }

  
  
  # Return the response data
  return json.dumps(response_data)

@app.route('/GAsetup', methods=['POST'])
def GA_setup():
  classes = get_data("Classes")
  grades = get_grades()
  #filter classes for the user's osis
  classes = [item for item in classes if str(session['user_data']['osis']) in str(item['OSIS'])]
  categories = make_category_groups(classes)
  stats = get_stats(grades, classes)
  print("categories: ", categories)
  return json.dumps({"Classes": classes, "categories": categories, "stats": stats})

@app.route('/get-gclasses', methods=['POST'])
def get_gclasses():
  print("in get gclasses")
  classes = list_courses()
  print("classes", classes)
  return json.dumps(classes)

@app.route('/process-notebook-image', methods=['POST'])
def process_notebook_image():
  data = request.json
  base64_img = data['image']
  base64_img = base64_img.split(",")[1]
  # correct the padding of the base64 string
  padding_needed = 4 - (len(base64_img) % 4)
  if padding_needed:
      base64_img += '=' * padding_needed
  # Decode the base64 string to bytes
  image_data = base64.b64decode(base64_img)
  # Convert the bytes to an image
  image = Image.open(BytesIO(image_data))
  prompt = [{"role":"system", "content": "Given the file ID of the image of a worksheet or textbook, list the specific topics covered in it."}, {"role":"user", "content": "file ID: <<fid>>"}]
  # Get insights from the AI
  insights = get_insights(prompt, image_data)
  print("insights", insights)
  return json.dumps(insights)
  

# Post grades entered in the Enter Grades page to the Grades sheet
@app.route('/post-grades', methods=['POST'])
def receive_grades():
  data = request.json
  post_data("Grades", data)
  return 'Data received successfully'

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
        prompt = [{"role":"system", "content": "Generate 3 practice questions based on this text"},
                  {"role":"user", "content": item['text']}]
        insights = get_insights(prompt)
        break  # Stop the loop once 'a' is found
  response = {"notebook":notebooks, 'insights': insights}
  return json.dumps(response)

# If the user changes their info on the profile page, update the Users sheet
@app.route('/update-login', methods=['POST'])
def updateLogin():
  data = request.json
  
  update_data(str(data['osis']), 'osis', data, "Users")
  return json.dumps({"data": "success"})

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

#update public profile
@app.route('/update-public-profile', methods=['POST'])
def updatePublicProfile():
  data = request.json
  update_data(str(data['OSIS']), 'OSIS', data, "Profiles")
  return json.dumps({"data": "success"})

# After every couple of questions that the user answers on the study page, their questions and answers are logged to the Study sheet
@app.route('/updateStudy', methods=['POST'])
def updateStudy():
  data = request.json
  data = data['data']
  user_data = get_name()
  osis = user_data['osis']
  update_data(osis, 'OSIS', [{"OSIS": osis, "Q&As": data}], "Study")
  return json.dumps('success')

#If a user joins or creates a class, the class data is posted to the Classes sheet
@app.route('/post-classes', methods=['POST'])
def receive_Classes():
  data = request.json
  print("receive_classes data", data)
  # update=0 means the class is new, update=1 means the class is being joined
  if data["update"] == 0:
    post_data("Classes", data['class'])
  else:
    # add the user's osis to the class's list of osis
    update_data(data["update"], "id", data['class'], "Classes")

  return json.dumps({"data": "success"})

# If the user edits one of their grades on the Enter Grades page, it's updated in the Grades sheet
@app.route('/update-grades', methods=['POST'])
def update_grades():
  data = request.json
  update_data(data['rowid'], "id", data['grades'], "Grades")
  return json.dumps({"data": "success"})

#If the user clicks the delete saved grades button, delete their grades from the Grades sheet
@app.route('/delete-grades', methods=['POST'])
def delete_grades():
  data = request.json
  delete_data(session['user_data']['osis'] , "OSIS", "GradeData")
  return json.dumps({"data": "success"})


# When the user creates a goal, it's posted to the Goals sheet
@app.route('/post-goal', methods=['POST'])
def postGoal():
  data = request.json
  post_data("Goals", data)
  return json.dumps({"data": 'success'})

# When the user types a message into the chat, it's posted to the Chat sheet
@app.route('/post-message', methods=['POST'])
def postMessage():
  data = request.json
  post_data("Chat", data)
  return json.dumps({"data": 'success'})

# When the user saves a notebook after changing it, it's posted to the Notebooks sheet
@app.route('/post-notebook', methods=['POST'])
def postNotebook():
  data = request.json
  if data['data']['exists'] == True:
    update_data(data['data']['classID'], 'classID', data, "Notebooks")
  else:
    post_data("Notebooks", data['data'])
  return json.dumps({"data": 'success'})


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





# Query the LLM API to get insights
def get_insights(prompts):
  
  headers = {
    'Authorization': f"Bearer {vars['openAIAPI']}",
    'Content-Type': 'application/json'
}
  
  payload = {
    "model": "gpt-3.5-turbo",
    "messages": prompts
}
  insights = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
  insights = insights.json()
  # print("raw insights: "+str(insights))
  insights = insights['choices'][0]['message']['content']
  # print("insights: "+str(insights))
  return insights
  

#uncomment to run locally, comment to deploy. Before deploying, change db to firebase, add new packages to requirements.txt

if __name__ == '__main__':
  app.run(host='localhost', port=8080)
