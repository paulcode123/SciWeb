from flask import Flask, render_template, request
import json
import requests
import numpy as np
import datetime
import re
import time
from googleapiclient.discovery import build
import os



def init_gapi():
  spreadsheet_id = '1k7VOAgZY9FVdcyVFaQmY_iW_DXvYQluosM2LYL2Wmc8'
  api_key = os.environ['GAPIkey']
  sheetdb_url = 'https://sheetdb.io/api/v1/y0fswwtbyapbd'

  DISCOVERY_SERVICE_URL = 'https://sheets.googleapis.com/$discovery/rest?version=v4'

  service = build('sheets',
                  'v4',
                  developerKey=api_key,
  discoveryServiceUrl=DISCOVERY_SERVICE_URL)
  max_column = "H"

  return spreadsheet_id, api_key, sheetdb_url, DISCOVERY_SERVICE_URL, service, max_column
  
def init_vars():
  spreadsheet_id, api_key, sheetdb_url, DISCOVERY_SERVICE_URL, service, max_column = init_gapi()
  openAIAPI = os.environ['OpenAI'];
  #define placeholders if name not set
  user_data = {}
  ip_add = 404
  return spreadsheet_id, api_key, sheetdb_url, DISCOVERY_SERVICE_URL, service, max_column, user_data, ip_add, openAIAPI


spreadsheet_id, api_key, sheetdb_url, DISCOVERY_SERVICE_URL, service, max_column, user_data, ip_add, openAIAPI = init_vars()
app = Flask(__name__)


#initialize HTML/CCS/JS files
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


@app.route('/Classes')
def classes():
  return render_template('Classes.html')

@app.route('/Assignments')
def assignments():
  return render_template('Assignments.html')

@app.route('/class/<classurl>')
def class_page(classurl):

  id = re.findall('[0-9]+', classurl)[0]
  class_name = classurl.replace(id, "").strip()
  classes = get_data("Classes")
  class_data = next((row for row in classes if row['id'] == id), None)
  return render_template('class.html',
                         class_name=class_name,
                         class_data=class_data)

@app.route('/class/<classurl>/notebook')
def notebook_page(classurl):
  id = re.findall('[0-9]+', classurl)[0]
  class_name = classurl.replace(id, "").strip()
  classes = get_data("Classes")
  class_data = next((row for row in classes if row['id'] == id), None)
  return render_template('notebook.html',
                         class_name=class_name,
                         class_data=class_data)

@app.route('/assignment/<assignmentid>')
def assignment_page(assignmentid):
  assignments = get_data("Assignments")
  assignment_data = next(
    (row for row in assignments if row['id'] == assignmentid), None)
  assignment_name = assignment_data['name']
  return render_template('assignment.html',
                         assignment_name=assignment_name,
                         assignment_data=assignment_data)


#Send post/get data to/from JS files
@app.route('/home-ip', methods=['POST'])
def get_home_ip():
  global ip_add
  if ip_add == 404:
    ip_add = request.data.decode('utf-8')

  print("ip from get_home_ip is:", ip_add)
  return "success"


# @app.route('/is-ip', methods=['POST'])
# def check_ip():
#   global ip_add
#   if ip_add == 404:
#     return json.dumps({"data": "true"})
#   else:
#     print(ip_add)
#     return json.dumps({"data": "false"})




#/grades = grades, classes
#/Classes-data = classes, name
#/Assignments-data = assignments, classes
#/profile-data = name
#//get-message = chat, users, classes
@app.route('/data', methods=['POST'])
def fetch_data():
  sheets = request.json['data']
  sheets = sheets.split(", ")
  response = {}
  for sheet in sheets:
    if sheet=="Name":
      response[sheet] = get_name()
    else:
      response[sheet] = get_data(sheet)
  return json.dumps(response)


@app.route('/grades_over_time', methods=['POST'])
def post_ga_grades():
  classes = request.json
  classes_data = get_data("Classes")
  grades = get_data("Grades")
  user_data = get_name()
  goals = get_goals(classes['data'], user_data, grades)
  
  times, grade_spread = process_grades(grades, classes['data'], user_data, classes_data)
  prompt = "Generate 3 insights about trends this data, which represents a student's grade over the course of a period of time: " +str(grade_spread)
  insights = get_insights(prompt)
  response_data = {
    "times": times.tolist(),
    "grade_spread": grade_spread,
    "goals": goals,
    "insights": insights
  }

  return json.dumps(response_data)



@app.route('/post-grades', methods=['POST'])
def receive_grades():
  data = request.json
  post_data("Grades", data)
  return 'Data received successfully'


#get user-inputted login from logins.js
@app.route('/post-login', methods=['POST'])
def postLogin():
  data = request.json
  data['IP'] = ip_add
  logins = get_data("Users")
  for row in logins:
    if row['osis'] == data['osis']:
      data['IP'] = f"{ip_add}, {row['IP']}"
      update_data(row['osis'], 'osis', data, "Users")
      return 'success'
  
  post_data("Users", data)
  return 'success'



@app.route('/notebook', methods=['POST'])
def get_notebook():
  notebooks = get_data("Notebooks")
  id = request.json['data']
  insights = 'none'
  for item in notebooks:
    if item['classID'] == id:
        prompt = "Generate 3 practice questions based on this text: "+item['text']
        insights = get_insights(prompt)
        break  # Stop the loop once 'a' is found
  response = {"notebook":notebooks, 'insights': insights}
  return json.dumps(response)

@app.route('/update-login', methods=['POST'])
def updateLogin():
  data = request.json
  update_data(data['osis'], 'osis', data, "Users")
  return 'success'


#get user-inputted classes from Classes.js
@app.route('/post-classes', methods=['POST'])
def receive_Classes():
  data = request.json
  print("receive_classes data", data)
  if data["update"] == 0:
    post_data("Classes", data['class'])
  else:
    update_data(data["update"], "id", data['class'], "Classes")

  return json.dumps({"data": "success"})


@app.route('/update-grades', methods=['POST'])
def update_grades():
  data = request.json
  update_data(data['rowid'], "id", data['grades'], "Grades")
  return 'success'




@app.route('/post-assignment', methods=['POST'])
def postAssignment():
  data = request.json['data']
  print(data)
  post_data("Assignments", data['data'])
  update_data(data['classid'], "id", data["newrow"], "Classes")
  return json.dumps('success')


@app.route('/post-goal', methods=['POST'])
def postGoal():
  data = request.json
  post_data("Goals", data)
  return 'success'


@app.route('/post-message', methods=['POST'])
def postMessage():
  data = request.json
  post_data("Chat", data)
  return json.dumps({"data": 'success'})

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


# post data to sheetdb
def post_data(sheet, data):
  print(data)
  url = sheetdb_url + "?sheet=" + sheet
  response = requests.post(url, json=data)
  print(response, url)
  return response


#delete data from sheetdb
def delete_data(sheet, row_value, row_name):
  url = sheetdb_url + "/" + row_name + "/" + row_value + "?sheet=" + sheet
  response = requests.delete(url)
  print(response, url)
  return response


#get name from Users data
def get_name():
  global ip_add, user_data
  if user_data != {}:
    print("user_data already defined in get_name()")
    return user_data
  while ip_add == 404:

    time.sleep(0.1)

  data = get_data("Users")

  filtered_data = [entry for entry in data if ip_add in entry.get('IP')]
  # print("fd:", filtered_data)
  if filtered_data:
    user_data = filtered_data[-1]
    print("User's name from ip address", ip_add, "is", user_data['first_name'])
    return user_data
  return "Login", 404


def update_data(row_val, row_name, new_row, sheet):
  delete_data(sheet, row_val, row_name)
  post_data(sheet, new_row)


def get_goals(classes, user_data, grades):
  goal_coords = []
  goals = get_data('Goals')
  goals = [
    goal for goal in goals
    if (goal['osis'] == user_data['osis']) and (
      goal['class'] in classes) and (goal['category'] in classes)
  ]
  for goal in goals:
    grade = float(goal['grade'])
    date = goal['date']
    y0 = grade - 0.1
    y1 = grade + 0.1
    min_date, max_date, x = get_min_max(grades, user_data, classes)
    min_date = datetime.datetime.combine(min_date, datetime.time())
    max_date = datetime.datetime.combine(max_date, datetime.time())
    date = datetime.datetime.strptime(date, '%m/%d/%Y')
    date_diff = (date - min_date).days
    max_diff = (max_date - min_date).days
    x0 = date_diff / max_diff
    x1 = x0 + 0.04

    goalZone = {
      'type': 'rect',
      'xref': 'paper',
      'yref': 'y',
      'x0': x0,
      'x1': x1,
      'y0': y0,
      'y1': y1,
      'fillcolor': 'rgba(0, 255, 0, 0.2)',
      'line': {
        'width': 0
      }
    }

    goal_coords.append(goalZone)
  return goal_coords

def filter_grades(grades, user_data, classes):
  #filter grades for matching osis'
  if len(grades) == 0:
    print("no grades passed into get_min_max()")
  
  grades = [grade for grade in grades if grade['osis'] == user_data['osis']]
  if len(grades) == 0:
    print("no grades match osis")
  
  grades = [
    grade for grade in grades
    if ((grade['class'] in classes) or ('all' in classes)) and ((grade['category'] in classes) or ('All' in classes))
  ]
  print(len(grades))
  return grades

def get_min_max(grades, user_data, classes):
  grades = filter_grades(grades, user_data, classes)
  # Extract the minimum and maximum dates from the data
  dates = [
    datetime.datetime.strptime(d['date'], '%m/%d/%Y').date() for d in grades
  ]
  if len(dates) == 0:
    print("error: no grades found")
  min_date = min(dates)
  max_date = max(dates)
  max_date = max_date + datetime.timedelta(days=1)
  if min_date == max_date:
    max_date = max_date + datetime.timedelta(days=5)
  return min_date, max_date, grades


def process_grades(grades, classes, user_data, classes_data):
  #filter grades based on class

  min_date, max_date, grades = get_min_max(grades, user_data, classes)
  # Generate 10 evenly spaced dates between the minimum and maximum dates
  date_range = np.linspace(min_date.toordinal(),
                           max_date.toordinal(),
                           num=10,
                           dtype=int)
  evenly_spaced_dates = [datetime.date.fromordinal(d) for d in date_range]

  #convert classes data to weights
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
  print(weights)
  grade_spread = []
  for date in evenly_spaced_dates:
    grade_spread.append(calculate_grade(date, grades, weights))
  return date_range, grade_spread


def calculate_grade(time, data, weights):
  categories = {}
  

  for datum in data:
    grade_time = datetime.datetime.strptime(datum['date'], '%m/%d/%Y').date()
    if time < grade_time:

      continue

    if datum["class"] not in categories:
      categories[datum["class"]] = {}

    if datum["category"] not in categories[datum["class"]]:
      categories[datum["class"]][datum["category"]] = {
        "scoreSum": 0,
        "valueSum": 0,
        "count": 0,
        "weight": weights[datum["class"]][datum["category"]]
      }

    category = categories[datum["class"]][datum["category"]]
    category["scoreSum"] += float(datum["score"])
    category["valueSum"] += int(datum["value"])
    category["count"] += 1

  totalGrade = 0
  classCount = 0

  for className, classData in categories.items():
    classGrade = 0
    categoryCount = 0
    weightSum = 0

    for categoryName, category in classData.items():
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

def get_insights(prompt):
  # grades = filter_grades(grades, user_data, filters)
  headers = {
    'Authorization': f'Bearer {openAIAPI}',
    'Content-Type': 'application/json'
}
  
  payload = {
    "model": "gpt-3.5-turbo",
    "messages": [{
                "role": "assistant",
                "content": prompt
            }]
}
  insights = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
  insights = insights.json()
  print("raw insights: "+str(insights))
  insights = insights['choices'][0]['message']['content']
  print("insights: "+str(insights))
  return insights
  
  
  
  

  
app.run(host='0.0.0.0', port=8080, debug=True)
