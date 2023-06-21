from flask import Flask, render_template, request
import json
import requests
import numpy as np
import datetime
import re
import time
from googleapiclient.discovery import build

def init_vars():
  spreadsheet_id = '1k7VOAgZY9FVdcyVFaQmY_iW_DXvYQluosM2LYL2Wmc8'
  api_key = 'AIzaSyC4iGMgMaHMqSxGfsa5phA-peGBKUKkTWM'
  sheetdb_url = 'https://sheetdb.io/api/v1/y0fswwtbyapbd'
  
  DISCOVERY_SERVICE_URL = 'https://sheets.googleapis.com/$discovery/rest?version=v4'
  
  service = build('sheets', 'v4', developerKey=api_key, discoveryServiceUrl=DISCOVERY_SERVICE_URL)
  
  
  max_column = "H"
  #define placeholders if name not set
  user_data = {}
  ip_add = 404;
  return spreadsheet_id, api_key, sheetdb_url, DISCOVERY_SERVICE_URL, service, max_column, user_data, ip_add
  


spreadsheet_id, api_key, sheetdb_url, DISCOVERY_SERVICE_URL, service, max_column, user_data, ip_add = init_vars()
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
  
@app.route('/Profile')
def profile():
  return render_template('Profile.html')
  
@app.route('/Pitch')
def pitch():
  return render_template('Pitch.html')

@app.route('/Classes')
def classes():
  return render_template('Classes.html')

@app.route('/class/<classurl>')
def class_page(classurl):
  class_name = re.findall('[a-zA-Z]+', classurl)[0]
  id = re.findall('[0-9]+', classurl)[0]
  classes = get_data("Classes")
  class_data = next((row for row in classes if row['id']  == id), None)
  return render_template('class.html', class_name=class_name, class_data = class_data)



  
#Send post/get data to/from JS files
@app.route('/home-ip', methods=['POST'])
def get_home_ip():
  global ip_add
  if ip_add == 404:
    ip_add = request.data.decode('utf-8')
  
  print("ip from get_home_ip is:", ip_add)
  return "success"

@app.route('/name', methods=['POST'])
def post_name():
  user_data = get_name()  
  print("first_name from post_name is:",user_data["first_name"])
  
  return json.dumps(user_data)

@app.route('/grades', methods=['POST'])
def post_eg_grades():
  grades = get_data("Grades")
  return json.dumps(grades)
  
@app.route('/grades_over_time', methods=['POST'])
def post_ga_grades():
  classes = request.json
  
  grades = get_data("Grades")
  times, grade_spread = process_grades(grades, classes['data'])
  response_data = {"times": times.tolist(), "grade_spread": grade_spread}

  return json.dumps(response_data)

@app.route('/Classes-data', methods=['POST'])
def post_Classes():
  classes = get_data("Classes")
  response_data = {"Classes": classes}
  # print("response_data", response_data)
  return json.dumps(response_data)

@app.route('/Assignments-data', methods=['POST'])
def post_Assignments():
  assignments = get_data("Assignments")
  response_data = {"Assignments": assignments}
  # print("response_data", response_data)
  return json.dumps(response_data)

@app.route('/profile-data', methods=['POST'])
def profile_data():
  user_data = get_name()
  response_data = {"Data": user_data}
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
  post_data("Users", data)
  return 'success'

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
    
    
  
  return json.dumps({"data":"success"})

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
  update_data(data['classid'], data["newrow"], "Classes")
  return json.dumps('success')




#get data from Google Sheets API
def get_data(sheet):
  ranges = [f'{sheet}!A:{max_column}']
  request = service.spreadsheets().values().batchGet(spreadsheetId=spreadsheet_id, ranges=ranges, majorDimension='ROWS')
  
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
  print("data from get_data:", data)
  return data

# post data to sheetdb
def post_data(sheet, data):
  print(data)
  url = sheetdb_url+"?sheet="+sheet
  response = requests.post(url, json=data)
  print(response, url)
  return response

#delete data from sheetdb
def delete_data(sheet, row_value, row_name):
  url = sheetdb_url+"/"+row_name+"/"+row_value+"?sheet="+sheet
  response = requests.delete(url)
  print(response, url)
  return response

  
#get name from Users data
def get_name():
  global ip_add, user_data
  if user_data != {}:
    print("user_data already defined in get_name()")
    return user_data
  while ip_add==404:
    
    time.sleep(0.1)
  
  data = get_data("Users")
  
  filtered_data = [entry for entry in data if entry.get('IP') == ip_add]
  print("fd:", filtered_data)
  if filtered_data:
      user_data = filtered_data[-1]
      
      return user_data
  else:
      return "Login", 404


#Update Classes to sheetdb
def update_data(row_val, row_name, new_row, sheet):
  delete_data(sheet, row_val, row_name)
  post_data(sheet, new_row)
  


def process_grades(grades, classes):
  #filter grades based on class
  if classes != "all":
    grades = [grade for grade in grades if grade['class'] in classes]
  # Extract the minimum and maximum dates from the data
  dates = [datetime.datetime.strptime(d['date'], '%m/%d/%Y').date() for d in grades]
  min_date = min(dates)
  max_date = max(dates)
  
  # Generate 10 evenly spaced dates between the minimum and maximum dates
  date_range = np.linspace(min_date.toordinal(), max_date.toordinal(), num=10, dtype=int)
  evenly_spaced_dates = [datetime.date.fromordinal(d) for d in date_range]
  
  
  grade_spread = []
  for date in evenly_spaced_dates:
    grade_spread.append(calculate_grade(date, grades))
  return date_range, grade_spread
  


def calculate_grade(time, data):
  categories = {}
  weights = {
    "biology": {
      "Homework": 0.3,
      "Assignment": 0.2,
      "Assessment": 0.5
    },
    "english": {
      "Homework": 0.3,
      "Quiz": 0.2,
      "Test": 0.5
    },
    "french": {
      "Homework": 0.3,
      "Quiz": 0.2,
      "Test": 0.5
    },
    "geometry": {
      "Homework": 0.3,
      "Quiz": 0.2,
      "Test": 0.5
    },
    "history": {
      "Homework": 0.4,
      "Quiz": 0.1,
      "Test": 0.5
    }
  }
  
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
    category["scoreSum"] += int(datum["score"])
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
      totalGrade += classGrade/weightSum
      
      classCount += 1

  if classCount > 0:
    
    return totalGrade / classCount
  else:
    return 0








app.run(host='0.0.0.0', port=8080, debug=True)
  