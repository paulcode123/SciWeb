# Import necessary libraries

# Flask is a web framework for Python that allows backend-frontend communication
from flask import Flask, render_template, request, session
# json is a library for parsing and creating JSON data
import json
# requests is a library for getting info from the web
import requests
# numpy is a library for numerical computing
import numpy as np
# datetime is a library for working with dates and times
import datetime
import re
# googleapiclient is a library for working with Google APIs(Getting data from Google Sheets in this case)
from googleapiclient.discovery import build
# os is a library for working with the operating system(used to get environment variables)
import os




# Function to initialize the Google Sheets API
def init_gapi():
  spreadsheet_id = '1k7VOAgZY9FVdcyVFaQmY_iW_DXvYQluosM2LYL2Wmc8'
  # API key for accessing the Google Sheets API: find it in the "Getting Started with Contributing" document
  # Remember to keep it secret, and don't publish it to GitHub
  api_key = "not published to GitHub"

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
  openAIAPI = "not published to GitHub"
  
  
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



#/grades = grades, classes
#/Classes-data = classes, name
#/Assignments-data = assignments, classes
#/profile-data = name
#//get-message = chat, users, classes

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
    else:
      response[sheet] = get_data(sheet)
  return json.dumps(response)

@app.route('/goals_progress', methods=['POST'])
def get_goals_progress():
  return json.dumps(calculate_goal_progress())

# Function to return insights to the Study page
@app.route('/AI', methods=['POST'])
def get_AI():
  return json.dumps(get_insights(request.json['data']))

#function to generate insights and return them to the Grade Analysis page
@app.route('/insights', methods=['POST'])
def get_insights_ga():
  classes_data = get_data("Classes")
  user_data = get_name()
  grades = get_data("Grades")
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
  grades = get_data("Grades")
  user_data = get_name()

  # Calculate the user's grades over time, return the grades at their corresponding dates
  times, grade_spread = process_grades(grades, classes, user_data, classes_data, specificity)

  # Get the goals that the user has set, and create objects to overlay on the graph
  goals, set_dates, max_date = get_goals(classes, user_data, grades, times)
  # Create a dictionary to return the calculated data to the frontend
  response_data = {
    "times": times.tolist(),
    "grade_spread": grade_spread,
    "goals": goals,
    "goal_set_dates": set_dates,
    "max_date": max_date
  }

  
  
  # Return the response data
  return json.dumps(response_data)


# Post grades entered in the Enter Grades page to the Grades sheet
@app.route('/post-grades', methods=['POST'])
def receive_grades():
  data = request.json
  post_data("Grades", data)
  return 'Data received successfully'

@app.route('/impact', methods=['POST'])
def get_impact():
  data = request.json
  
  grades = get_data("Grades")
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
  return json.dumps({"current_grade": current_grade, "total_points": total_points, "category_weight": weights[data['class']][data['category']]})


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
        delete_data("Users", row['osis'], "osis")
      else:
        update_data(row['osis'], 'osis', row, "Users")
      
  # if the user has logged in before, update their IP address    
  for row in logins:
    # If the user's osis is already in the Users sheet...
    if row['osis'] == data['osis']:
      # Add their new IP address to the list of IP addresses
      data['IP'] = f"{session['ip_add']}, {row['IP']}"
      # Update the user's data in the Users sheet
      update_data(row['osis'], 'osis', data, "Users")
      session['user_data'] = row
      return 'success'
  
  # If the user has not logged in before, add their data to the Users sheet
  session['user_data'] = data
  post_data("Users", data)
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
  update_data(data['osis'], 'osis', data, "Users")
  return 'success'

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
  return 'success'



# When the user creates an assignment, the database is updated
@app.route('/post-assignment', methods=['POST'])
def postAssignment():
  data = request.json['data']
  print(data)
  # Add the assignment to the Assignments sheet
  post_data("Assignments", data['data'])
  # Also, update the Classes sheet to include the assignment
  update_data(data['classid'], "id", data["newrow"], "Classes")
  return json.dumps('success')

# When the user creates a goal, it's posted to the Goals sheet
@app.route('/post-goal', methods=['POST'])
def postGoal():
  data = request.json
  post_data("Goals", data)
  return 'success'

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
  update_data(data['data']['classID'], 'classID', data, "Notebooks")
  return json.dumps({"data": 'success'})

#get data from Google Sheets API
def get_data(sheet):
  spreadsheet_id, api_key, sheetdb_url, DISCOVERY_SERVICE_URL, service, max_column = init_gapi()
  ranges = [f'{sheet}!A:{max_column}']
  request = service.spreadsheets().values().batchGet(
    spreadsheetId=spreadsheet_id, ranges=ranges, majorDimension='ROWS')

  response = request.execute()
  response = response['valueRanges'][0]['values']

  data = []

  headers = response[0]  # Assumes the first row contains headers
  for row in response[1:]:
    row_data = {}
    for index, value in enumerate(row):
      header = headers[index]
      row_data[header] = value
    data.append(row_data)
  # print("data from get_data:", data)
  return data


# Function to post data to sheetdb
def post_data(sheet, data):
  user_data = get_name()
  if not isinstance(user_data, tuple) and sheet !="Users" and user_data['osis'] == '342875634' and not allow_demo_change:
    message = "rejected: can't change demo account data"
    print(message)
    return message
  print(data)
  url = sheetdb_url + "?sheet=" + sheet
  response = requests.post(url, json=data)
  print(response, url)
  return response


#delete data from sheetdb
def delete_data(sheet, row_value, row_name):
  if 'user_data' in session and not isinstance(session['user_data'], tuple) and sheet !="Users" and session['user_data']['osis'] == '342875634' and not allow_demo_change:
    message = "rejected: can't delete demo account data"
    print(message)
    return message
  url = sheetdb_url + "/" + row_name + "/" + row_value + "?sheet=" + sheet
  response = requests.delete(url)
  print(response, url)
  return response


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

# update data by deleting old data and posting new data
def update_data(row_val, row_name, new_row, sheet):
  delete_data(sheet, row_val, row_name)
  post_data(sheet, new_row)

# Calculate goal progress
def calculate_goal_progress():
  goals = get_data("Goals")
  goals = filter_goals(goals, session['user_data'], 'any')
  classes = get_data("Classes")
  grades = get_data("Grades")
  weights = get_weights(classes)
  progress = []
  for goal in goals:
    #filter grades for matching user osis
    goal_grades = filter_grades(grades, session['user_data'], [goal['class'], goal['category']])

    date_set = datetime.datetime.strptime(goal['date_set'], '%m/%d/%Y').date()
    grade_when_set = calculate_grade(date_set, grades, weights)
    goal_date = datetime.datetime.strptime(goal['date'], '%m/%d/%Y').date()
    goal_grade = float(goal['grade'])
    current_date = datetime.datetime.now().date()
    current_grade = calculate_grade(current_date, grades, weights)

    percent_time_passed = (current_date - date_set).days / (goal_date - date_set).days if (goal_date - date_set).days != 0 else 0
    grade_change = current_grade - grade_when_set
    percent_grade_change = grade_change / (goal_grade - grade_when_set) if goal_grade - grade_when_set != 0 else 0
    percent_grade_change = round(percent_grade_change, 3)
    print("pgc", percent_grade_change)
    current_grade_trajectory = grade_when_set + (current_grade - grade_when_set) / percent_time_passed if percent_time_passed != 0 else current_grade
    
    print("goal_grade", goal_grade, "current_grade", current_grade, "grade change", grade_change, "grade_when_set", grade_when_set, "current_grade_trajectory", current_grade_trajectory)
    progress.append({'date_set': str(date_set), 'grade_when_set': grade_when_set, 'goal_date': str(goal_date), 'goal_grade': goal_grade, 'current_grade': current_grade, 'current_date': str(current_date), 'current_grade_trajectory': current_grade_trajectory, 'class': goal['class'], 'category': goal['category'], 'percent_time_passed': percent_time_passed, 'percent_grade_change': percent_grade_change, 'grade_change': grade_change})
  return progress
# Use the Goal data to create icons to be overlayed on the graph in the Grade Analysis page
def get_goals(classes, user_data, grades, times, extend_to_goals=False):
  
  goal_coords = []
  goal_set_dates = []
  goals = get_data('Goals')

  # Get the minimum and maximum dates of the user's grades
  min_date, max_date, x = get_min_max(grades, user_data, classes, True)
  min_date = datetime.datetime.combine(min_date, datetime.time())
  max_date = datetime.datetime.combine(max_date, datetime.time())
  
  max_diff = (max_date - min_date).days

  #filter goals for matching osis matching user osis and classes among those being graphed
  goals = filter_goals(goals, user_data, classes)

  # Create a rectangle for each goal to overlay on the graph
  for goal in goals:
    grade = float(goal['grade'])
    date = goal['date']
    date_set = goal['date_set']
    y0 = grade - 0.15
    if y0 > 99.7:
      y0 = 99.7
    
    # Convert the date and date_set to datetime objects
    date = datetime.datetime.strptime(date, '%m/%d/%Y')
    date_set = datetime.datetime.strptime(date_set, '%m/%d/%Y')

    # Calculate the value of times that is closest to the date and date_set of the goal
    dates = [datetime.datetime.fromordinal(int(time)-1) for time in times]


    # Find the date closest to xdate
    closest_date = min(dates, key=lambda d: abs(d - date))
    print("dates", dates)
    print("closest_date", closest_date)
    closest_date_set = min(dates, key=lambda d: abs(d - date_set))

    # Convert the closest date back to string format m/d/YYYY
    closest_date_str = f"{closest_date.month}/{closest_date.day}/{closest_date.year}"
    
    closest_date_set_index = dates.index(closest_date_set)
#change formating here 
    
    gZ = {
      'x': closest_date_str, # The x-coordinate (date) for the goal
      'y': y0, # The y-coordinate (grade or value) for the goal
      'xref': 'x',
      'yref': 'y',
      'yanchor': 'bottom',
      'sizex': 0.3,
      'sizey': 0.3,
      'text': '',
      'source': '/static/media/GoalMedal.png'
    }
    

    goal_coords.append(gZ)
    goal_set_dates.append(closest_date_set_index)
  
  #get max date of any goal in goals
  if len(goals) > 0 and extend_to_goals:
    max_date = max([datetime.datetime.strptime(goal['date'], '%m/%d/%Y') for goal in goals])
    return goal_coords, goal_set_dates, str(max_date)
  
  return goal_coords, goal_set_dates, 404

#filter grades for those matching user osis and classes among those being graphed
def filter_grades(grades, user_data, classes):
  # check if grades is empty
  if len(grades) == 0:
    print("no grades passed into filter_grades()")
  
  #filter grades for matching osis'
  grades = [grade for grade in grades if grade['osis'] == user_data['osis']]
  if len(grades) == 0:
    print("no grades match osis")
  
  #filter grades for matching classes
  grades = [
    grade for grade in grades
    if ((grade['class'].lower() in classes) or ('all' in classes)) and ((grade['category'] in classes) or ('All' in classes))
  ]
  return grades

# Filter function for goals
def filter_goals(goals, user_data, classes):
  goals = [
    goal for goal in goals
    if (goal['osis'] == user_data['osis']) and ((
      goal['class'] in classes) and (goal['category'] in classes) or classes=='any')
  ]
  return goals
# Get the minimum and maximum dates of the user's grades
def get_min_max(grades, user_data, classes, extend_to_goals=False, interval=10):
    grades = filter_grades(grades, user_data, classes)
    goals = get_data("Goals")

    # If min and max dates include goals, then add goal dates to the list of dates
    if extend_to_goals:
      # This should be changed to only include goals for the classes being graphed
      user_goals = filter_goals(goals, user_data, classes)
      goal_dates = [
          datetime.datetime.strptime(goal['date'], '%m/%d/%Y').date() for goal in user_goals
      ]
      
    #get dates from grades
    dates = [
        datetime.datetime.strptime(grade['date'], '%m/%d/%Y').date() for grade in grades
    ]
    if extend_to_goals:
      dates.extend(goal_dates)  # Include goal dates in the list

    if len(dates) == 0:
        print("error: no grades found")
        return 0, 0, 0
    min_date = min(dates)
    max_date = max(dates)
    print("max_date", max_date)
    print("new_max_date", max_date + datetime.timedelta(days=(((max_date-min_date).days)/interval)))
    #11/30
    #11/6
    max_date = max_date + datetime.timedelta(days=(((max_date-min_date).days)/interval))
    if min_date == max_date:
        max_date = max_date + datetime.timedelta(days=5)
    return min_date, max_date, grades

def get_weights(classes_data):
  #convert grading categories in classes data to weights
  weights = {}

  for class_info in classes_data:
    name = class_info['name'].lower()
    categories_str = class_info['categories']
    
    # Parse the JSON-like string into a Python list
    categories = json.loads(categories_str)
    
    # Create a dictionary to store weights
    weight_dict = {}
    
    # Iterate over the list in pairs (category, weight)
    for i in range(0, len(categories), 2):
        category = categories[i]
        weight = categories[i + 1] / 100.0  # Convert the percentage to a decimal
        
        weight_dict[category] = weight
    
    weights[name.lower()] = weight_dict
  return weights

# Calculate the user's grades over time
def process_grades(grades, classes, user_data, classes_data, interval=10):
  #filter grades based on class
  grades = filter_grades(grades, user_data, classes)
  # Get the minimum and maximum dates of the user's grades and goals
  min_date, max_date, z = get_min_max(grades, user_data, classes, True, interval)
  #Get the minium and maximum dates of just the user's grades
  mi, mx, g = get_min_max(grades, user_data, classes)
  if min_date == 0:
    return 0, []
  # Generate 10 evenly spaced dates between the minimum and maximum dates
  date_range = np.linspace(min_date.toordinal(),
                           max_date.toordinal(),
                           num=interval,
                           dtype=int)
  evenly_spaced_dates = [datetime.date.fromordinal(d) for d in date_range]
  #Throw out the dates that are past mx, the maximum date of the user's grades
  evenly_spaced_dates = [date for date in evenly_spaced_dates if date <= mx]

  weights = get_weights(classes_data)

  # get grades for each date
  grade_spread = []
  for date in evenly_spaced_dates:
    grade_spread.append(calculate_grade(date, grades, weights))

  # add "none" values to the end of the grade spread to make it the same length as the date range
  while len(grade_spread) < interval:
    grade_spread.append('none')

  return date_range, grade_spread

# Calculate grade at given date
def calculate_grade(time, data, weights):
  categories = {}
  
  # For each assignment(with grade) in the data...
  for datum in data:
    #get the date of the grade
    grade_time = datetime.datetime.strptime(datum['date'], '%m/%d/%Y').date()
    # If the date of the grade is after the date we're calculating the grade for, skip it
    if time < grade_time:
      continue
    # If the class has not yet been added to the categories dictionary, add it
    if datum["class"] not in categories:
      categories[datum["class"]] = {}
    # If the category has not yet been added to the class's dictionary, add it, and initialize the category's data
    if datum["category"] not in categories[datum["class"]]:
      categories[datum["class"]][datum["category"]] = {
        "scoreSum": 0,
        "valueSum": 0,
        "count": 0,
        "weight": weights[datum["class"]][datum["category"]]
      }

    category = categories[datum["class"]][datum["category"]]
    # Add the score and value of the grade to the category's data
    category["scoreSum"] += float(datum["score"])
    category["valueSum"] += int(datum["value"])
    category["count"] += 1

  totalGrade = 0
  classCount = 0
# For each class in the categories dictionary...
  for className, classData in categories.items():
    # Initialize the class's grade, category count, and weight sum
    classGrade = 0
    categoryCount = 0
    weightSum = 0 # Purpose: if the weights don't add up to 1, the grade will be scaled to 100
    # For each category in the class's data...
    for categoryName, category in classData.items():
      # Add the weighted category grade to the class's grade
      classGrade += (category["scoreSum"] /
                     category["valueSum"]) * category["weight"]
      weightSum += category["weight"]

      categoryCount += 1

    if categoryCount > 0:
      # print(weightSum)
      totalGrade += classGrade / weightSum

      classCount += 1

  if classCount > 0:

    return totalGrade * 100 / classCount
  else:
    return 0

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
port = int(os.environ.get('PORT', 8080))
app.run(host='0.0.0.0', port=port, debug=False)
