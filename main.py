# Import necessary libraries

# Flask is a web framework for Python that allows backend-frontend communication
from flask import Flask, render_template, request, session
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


# Get functions from other files
from database import get_data, post_data, update_data, delete_data
from grades import get_grade_points, process_grades, get_weights, calculate_grade, filter_grades
from goals import calculate_goal_progress, get_goals
from jupiter import run_puppeteer_script, jupapi_output_to_grades, jupapi_output_to_classes, get_grades





# Function to initialize the Google Sheets API
def init_gapi():
  spreadsheet_id = '1k7VOAgZY9FVdcyVFaQmY_iW_DXvYQluosM2LYL2Wmc8'
  # API key for accessing the Google Sheets API: find it in the "Getting Started with Contributing" document
  # Remember to keep it secret, and don't publish it to GitHub
  api_key = "not published to Github"

  # URL for the SheetDB API, for POST requests
  sheetdb_url = 'https://sheetdb.io/api/v1/y0fswwtbyapbd'

  DISCOVERY_SERVICE_URL = 'https://sheets.googleapis.com/$discovery/rest?version=v4'

  service = build('sheets',
                  'v4',
                  developerKey=api_key,
  discoveryServiceUrl=DISCOVERY_SERVICE_URL)
  max_column = "H"

  return spreadsheet_id, api_key, sheetdb_url, DISCOVERY_SERVICE_URL, service, max_column

# Initialize other variables
def init_vars():
  spreadsheet_id, api_key, sheetdb_url, DISCOVERY_SERVICE_URL, service, max_column = init_gapi()
  # OpenAI API key for generating insights: find it in the "Getting Started with Contributing" document
  # don't publish it to GitHub
  openAIAPI = "not published to Github"
  
  
  return spreadsheet_id, api_key, sheetdb_url, DISCOVERY_SERVICE_URL, service, max_column, openAIAPI


spreadsheet_id, api_key, sheetdb_url, DISCOVERY_SERVICE_URL, service, max_column, openAIAPI = init_vars()
app = Flask(__name__)

# App secret key for session management
app.secret_key = 'not published to Github'

allow_demo_change = True
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

@app.route('/GetStart')
def getstart():
  return render_template('GetStart.html')

@app.route('/Assignments')
def assignments():
  return render_template('Assignments.html')

# The following routes are pages for specific classes and assignments
@app.route('/class/<classurl>')
def class_page(classurl):
  # Pass the class name and class data to the class page
  id = re.findall('[0-9]+', classurl)[0]
  class_name = classurl.replace(id, "").strip()
  classes = get_data("Classes")
  class_data = next((row for row in classes if row['id'] == id), None)
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

# Assignment page, for specific assignments
@app.route('/assignment/<assignmentid>')
def assignment_page(assignmentid):
  assignments = get_data("Assignments")
  assignment_data = next(
    (row for row in assignments if row['id'] == assignmentid), None)
  assignment_name = assignment_data['name']
  return render_template('assignment.html',
                         assignment_name=assignment_name,
                         assignment_data=assignment_data)

@app.route('/users/<userid>')
def public_profile(userid):
  users = get_data("Users")
  profiles = get_data("Profiles")
  
  profile = next((row for row in profiles if str(row['OSIS']) == str(userid)), None)
  
  
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

# This concludes initializing the front end

#The following route functions post/get data to/from JS files
# It is where the frontend-backend communication happens\

# Get the user's IP address, connects to the user_data.js function
@app.route('/home-ip', methods=['POST'])
def get_home_ip():

  if 'ip_add' not in session:
    # store the ip address in the session
    session['ip_add'] = request.json
    print(request.json)
  print("ip from get_home_ip is:", session['ip_add'])
  # return the user's data given their IP address
  return json.dumps({'Name': get_name(str(session['ip_add']))})

# /Jupiter route
@app.route('/jupiter', methods=['POST'])
def Jupiter():
  print("in jup py route")
  # get_gclassroom_api_data()
  data = request.json
  classes= run_puppeteer_script(data['osis'], data['password'])
  jupapi_output_to_classes(classes, session, sheetdb_url, allow_demo_change)
  grades = jupapi_output_to_grades(classes, session, sheetdb_url, allow_demo_change)
  return json.dumps(grades)


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
    if sheet=="Name":
      response[sheet] = get_name()
    elif "FILTERED" in sheet:
      sheet_name = sheet.replace("FILTERED ", "")
      data = get_data(sheet_name)
      if sheet_name=="Friends":
        #send if the user's osis is in the OSIS or targetOSIS of the row
        response[sheet_name] = [item for item in data if str(session['user_data']['osis']) in item['OSIS'] or str(session['user_data']['osis']) in item['targetOSIS']]
      elif sheet_name=="Grades":
        response[sheet_name] = get_grades(session)
      else:
        #Otherwise, filter the data for the user's osis
        response[sheet_name] = [item for item in data if str(session['user_data']['osis']) in item['OSIS']]
    elif sheet=="Users":
      #only include the first 3 columns of the Users sheet, first_name, last_name, and osis
      data = get_data(sheet)
      response[sheet] = [{key: item[key] for key in item if key in ['first_name', 'last_name', 'osis']} for item in data]
    else:
      response[sheet] = get_data(sheet)
  return json.dumps(response)

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
  grades = get_grades(session)
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
  print("specificity", data['specificity'])
  specificity = int(data['specificity'])
  # Get User, Class, and Grade data
  classes_data = get_data("Classes")
  # grades = get_data("Grades")
  grades = get_grades(session)
  
  
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


# Post grades entered in the Enter Grades page to the Grades sheet
@app.route('/post-grades', methods=['POST'])
def receive_grades():
  data = request.json
  post_data("Grades", data, sheetdb_url, allow_demo_change)
  return 'Data received successfully'

@app.route('/impact', methods=['POST'])
def get_impact():
  data = request.json
  
  grades = get_grades(session)
  classes = get_data("Classes")
  category_grades = filter_grades(grades, session['user_data'], [data['class'], data['category']])
  
  weights = get_weights(classes)
  #get current date
  current_date = datetime.datetime.now().date()
  #get grade at current date
  current_grade = calculate_grade(current_date, category_grades, weights)
  print("current_grade", current_grade)
  #get total number of points from all grades in the category
  total_points = sum([int(grade['value']) for grade in category_grades])
  print("total_points", total_points)
  return json.dumps({"current_grade": current_grade, "total_points": total_points, "category_weight": weights[data['class'].lower()][data['category'].lower()]})


#When the user logs in, their data is posted to the Users sheet
@app.route('/post-login', methods=['POST'])
def postLogin(): 
  data = request.json
  session['ip_add'] = data['IP']
  logins = get_data("Users")
  #remove the user's ip addresses from all other accounts
  for row in logins:
    if session['ip_add'] in row['IP']:
      row['IP'] = row['IP'].replace(session['ip_add'], "")
      #if the ip address is the only one in the list(no numbers in row['IP']), remove the row
      if not any(char.isdigit() for char in row['IP']):
        delete_data("Users", row['osis'], "osis", session, sheetdb_url, allow_demo_change)
      else:
        update_data(row['osis'], 'osis', row, "Users", session, sheetdb_url, allow_demo_change)
      
  # if the user has logged in before, update their IP address    
  for row in logins:
    # If the user's osis is already in the Users sheet...
    if row['password'] == data['password'] and row['first_name'] == data['first_name']:
      # Add their new IP address to the list of IP addresses
      data['IP'] = f"{session['ip_add']}, {row['IP']}"
      # Update the user's data in the Users sheet
      update_data(row['password'], 'password', data, "Users", session, sheetdb_url, allow_demo_change)
      session['user_data'] = row
      return 'success'
  
  # If the user has not logged in before, add their data to the Users sheet
  session['user_data'] = data
  post_data("Users", data, sheetdb_url, allow_demo_change)
  return 'success'


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
  
  update_data(str(data['osis']), 'osis', data, "Users", session, sheetdb_url, allow_demo_change)
  return 'success'

#accept friend request
@app.route('/accept-friend', methods=['POST'])
def acceptFriend():
  data = request.json
  friends = get_data("Friends")
  # If status is pending and there already is a row with the same osis and targetOSIS, update the row
  if data['status'] == "accepted":
    update_data(data['id'], 'id', data, "Friends", session, sheetdb_url, allow_demo_change)
    return 'success'
  data['OSIS'] = session['user_data']['osis']
  for row in friends:
    if (row['OSIS'] == data['targetOSIS'] and row['targetOSIS'] == data['OSIS']) or (row['OSIS'] == data['OSIS'] and row['targetOSIS'] == data['targetOSIS']):
      return 'success'
    
  post_data("Friends", data, sheetdb_url, allow_demo_change)
  return 'success'

#update public profile
@app.route('/update-public-profile', methods=['POST'])
def updatePublicProfile():
  data = request.json
  update_data(str(data['OSIS']), 'OSIS', data, "Profiles", session, sheetdb_url, allow_demo_change)
  return 'success'

# After every couple of questions that the user answers on the study page, their questions and answers are logged to the Study sheet
@app.route('/updateStudy', methods=['POST'])
def updateStudy():
  data = request.json
  data = data['data']
  user_data = get_name()
  osis = user_data['osis']
  update_data(osis, 'OSIS', [{"OSIS": osis, "Q&As": data}], "Study", session, sheetdb_url, allow_demo_change)
  return json.dumps('success')

#If a user joins or creates a class, the class data is posted to the Classes sheet
@app.route('/post-classes', methods=['POST'])
def receive_Classes():
  data = request.json
  print("receive_classes data", data)
  # update=0 means the class is new, update=1 means the class is being joined
  if data["update"] == 0:
    post_data("Classes", data['class'], sheetdb_url, allow_demo_change)
  else:
    # add the user's osis to the class's list of osis
    update_data(data["update"], "id", data['class'], "Classes", session, sheetdb_url, allow_demo_change)

  return json.dumps({"data": "success"})

# If the user edits one of their grades on the Enter Grades page, it's updated in the Grades sheet
@app.route('/update-grades', methods=['POST'])
def update_grades():
  data = request.json
  update_data(data['rowid'], "id", data['grades'], "Grades", session, sheetdb_url, allow_demo_change)
  return 'success'

#If the user clicks the delete saved grades button, delete their grades from the Grades sheet
@app.route('/delete-grades', methods=['POST'])
def delete_grades():
  data = request.json
  delete_data("GradeData", data['osis'], "OSIS", session, sheetdb_url, allow_demo_change)
  return 'success'

# When the user creates an assignment, the database is updated
@app.route('/post-assignment', methods=['POST'])
def postAssignment():
  data = request.json['data']
  print(data)
  # Add the assignment to the Assignments sheet
  post_data("Assignments", data['data'], sheetdb_url, allow_demo_change)
  # Also, update the Classes sheet to include the assignment
  update_data(data['classid'], "id", data["newrow"], "Classes", session, sheetdb_url, allow_demo_change)
  return json.dumps('success')

# When the user creates a goal, it's posted to the Goals sheet
@app.route('/post-goal', methods=['POST'])
def postGoal():
  data = request.json
  post_data("Goals", data, sheetdb_url, allow_demo_change)
  return 'success'

# When the user types a message into the chat, it's posted to the Chat sheet
@app.route('/post-message', methods=['POST'])
def postMessage():
  data = request.json
  post_data("Chat", data, sheetdb_url, allow_demo_change)
  return json.dumps({"data": 'success'})

# When the user saves a notebook after changing it, it's posted to the Notebooks sheet
@app.route('/post-notebook', methods=['POST'])
def postNotebook():
  data = request.json
  update_data(data['data']['classID'], 'classID', data, "Notebooks", session, sheetdb_url, allow_demo_change)
  return json.dumps({"data": 'success'})


#Function to get the user's name from Users data
def get_name(ip=None):
  
  # If an IP address is passed in, store it in the session
  if ip:
    print("ip", ip)
    session['ip_add'] = ip
    
  # If the user's data is already stored in the session, return it
  if 'user_data' in session:
    print("user_data already defined in get_name()")
    return session['user_data']
  

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





# Query the LLM API to get insights
def get_insights(prompts):
  
  headers = {
    'Authorization': f'Bearer {openAIAPI}',
    'Content-Type': 'application/json'
}
  
  payload = {
    "model": "gpt-3.5-turbo",
    "messages": prompts
}
  insights = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
  insights = insights.json()
  print("raw insights: "+str(insights))
  insights = insights['choices'][0]['message']['content']
  print("insights: "+str(insights))
  return insights
  

  

#uncomment to run locally, comment to deploy

if __name__ == '__main__':
  app.run(host='localhost', port=8080)
