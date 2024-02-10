from flask import Flask, render_template, request, session
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
  api_key = "not published"
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
  openAIAPI = "not published"
  #define placeholders if name not set
  
  return spreadsheet_id, api_key, sheetdb_url, DISCOVERY_SERVICE_URL, service, max_column, openAIAPI


spreadsheet_id, api_key, sheetdb_url, DISCOVERY_SERVICE_URL, service, max_column, openAIAPI = init_vars()
app = Flask(__name__)
app.secret_key = 'not published'
allow_demo_change = True

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
  
  if 'ip_add' not in session:
    session['ip_add'] = request.json
    print(request.json)
  print("ip from get_home_ip is:", session['ip_add'])
  return json.dumps({'Name': get_name(str(session['ip_add']))})


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

@app.route('/AI', methods=['POST'])
def get_AI():
  return json.dumps(get_insights(request.json['data']));

@app.route('/grades_over_time', methods=['POST'])
def post_ga_grades():
  classes = request.json
  classes_data = get_data("Classes")
  grades = get_data("Grades")
  user_data = get_name()
  goals = get_goals(classes['data'], user_data, grades)
  
  times, grade_spread = process_grades(grades, classes['data'], user_data, classes_data)
  grade_spreads = []
  if classes['data'][0] == "all":
    matching_classes = [item['name'] for item in classes_data if user_data['osis'] in item['OSIS']]
    
    for item in matching_classes:
      t, g = process_grades(grades, [item.lower(), "All"], user_data, classes_data)
      if type(t)!='int':
        grade_spreads.append(item+": "+str(g))
      
  else:
    print(classes['data'])
  prompt = [{"role":"system", "content": "You are a college advisor, and you have to write 5 specific ways in which the factors influence the overall grade, which represents a student's grades over time. You will be given their total grade, as well as the various factors what influenced that grade."},
            {"role": "user", "content": "total: "+str(grade_spread)+"factors: "+str(grade_spreads)}]
  
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
  session['ip_add'] = data['IP']
  logins = get_data("Users")
  #remove ip addresses from logins other than the current one
  for row in logins:
    if session['ip_add'] in row['IP']:
      row['IP'] = row['IP'].replace(session['ip_add'], "")
      #if the ip address is the only one in the list(no numbers in row['IP']), remove the row
      if not any(char.isdigit() for char in row['IP']):
        delete_data("Users", row['osis'], "osis")
      else:
        update_data(row['osis'], 'osis', row, "Users")
      
      
  for row in logins:
    if row['osis'] == data['osis']:
      data['IP'] = f"{session['ip_add']}, {row['IP']}"
      update_data(row['osis'], 'osis', data, "Users")
      session['user_data'] = row
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
        prompt = [{"role":"system", "content": "Generate 3 practice questions based on this text"},
                  {"role":"user", "content": item['text']}]
        insights = get_insights(prompt)
        break  # Stop the loop once 'a' is found
  response = {"notebook":notebooks, 'insights': insights}
  return json.dumps(response)

@app.route('/update-login', methods=['POST'])
def updateLogin():
  data = request.json
  update_data(data['osis'], 'osis', data, "Users")
  return 'success'

@app.route('/updateStudy', methods=['POST'])
def updateStudy():
  data = request.json
  data = data['data']
  user_data = get_name()
  osis = user_data['osis']
  print("d", data)
  update_data(osis, 'OSIS', [{"OSIS": osis, "Q&As": data}], "Study")
  return json.dumps('success')

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


#get name from Users data
def get_name(ip=None):
  
  if ip:
    print("ip", ip)
    session['ip_add'] = ip
    
  
  if 'user_data' in session:
    print("user_data already defined in get_name()")
    return session['user_data']
  # while ip_add == 404:

  #   time.sleep(0.1)

  data = get_data("Users")
  print(data[0])
  print(data[0].get('IP'))
  filtered_data = [entry for entry in data if str(session['ip_add']) in str(entry.get('IP'))]
  
  # print("fd:", filtered_data)
  if filtered_data:
    session['user_data'] = filtered_data[-1]
    print("User's name from ip address", session['ip_add'], "is", session['user_data']['first_name'])
    return session['user_data']
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
    if ((grade['class'].lower() in classes) or ('all' in classes)) and ((grade['category'] in classes) or ('All' in classes))
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
    return 0, 0, 0
  min_date = min(dates)
  max_date = max(dates)
  max_date = max_date + datetime.timedelta(days=1)
  if min_date == max_date:
    max_date = max_date + datetime.timedelta(days=5)
  return min_date, max_date, grades


def process_grades(grades, classes, user_data, classes_data):
  #filter grades based on class

  min_date, max_date, grades = get_min_max(grades, user_data, classes)
  if min_date == 0:
    return 0, []
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

def get_insights(prompts):
  # grades = filter_grades(grades, user_data, filters)
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
