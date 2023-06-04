from flask import Flask, render_template, request
import json
import requests
import numpy as np
import datetime


#define sheetdb urls to get from/post to
generic_url = "https://sheetdb.io/api/v1/pb8spx7u5gewk/"
logins_url = "https://sheetdb.io/api/v1/pb8spx7u5gewk?sheet=Logins"
grades_url = "https://sheetdb.io/api/v1/pb8spx7u5gewk?sheet=Grades"
classes_url = "https://sheetdb.io/api/v1/pb8spx7u5gewk?sheet=Classes"
# IP address
ip_add = "1"

fabricated_name = "Testing"
fabricated_classes = [{'period': '1', 'teacher': 'Unger', 'name': 'Honors Bio', 'members': 'Paul Nieuwerburgh', 'assignments': 'mitosis Lab', 'assessments': 'mitosis', 'description': 'fun class', 'id': '3274'}, {'period': '2', 'teacher': 'Lubin', 'name': 'Global 9', 'members': 'Paul Nieuwerburgh, Testing', 'assignments': 'Final project', 'assessments': 'Mughal Empire', 'description': 'meh', 'id': '8236'}, {'period': '2', 'teacher': 'Ms. Johnson', 'name': 'AP chem', 'members': 'Testing', 'assignments': '', 'assessments': '', 'description': '', 'id': '9234'}]
fabricated_grades = [{'date': '1/2/2023', 'score': '1', 'value': '10', 'class': 'Bio', 'category': 'homework'}, {'date': '3/5/2016', 'score': '3', 'value': '10', 'class': 'Bio', 'category': 'test'}, {'date': '9/12/2005', 'score': '2', 'value': '10', 'class': 'History', 'category': 'quiz'}]
#True will use above data(request conservation), false will pull from sheetdb
fabricate_data = True

app = Flask(__name__)
# app.debug = True

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

@app.route('/class/<class_name>')
def class_page(class_name):
  if not fabricate_data:
    classes = get_data(classes_url)
  else:
    classes = fabricated_classes
  class_data = next((row for row in classes if row['name'] == class_name), None)
  return render_template('class.html', class_name=class_name, class_data = class_data)


  
#Send data to JS files
@app.route('/home-ip', methods=['POST'])
def get_home_ip():
  global ip_add
  ip_add = request.json['data']
  print(ip_add)
  return "success"

@app.route('/name', methods=['POST'])
def post_name():
  response_data = full_name
  return json.dumps(response_data)

@app.route('/grades', methods=['POST'])
def post_ga_grades():
  if not fabricate_data:
    grades = get_data(grades_url)
  else:
    grades = fabricated_grades
  times, grade_spread = process_grades(grades)
  response_data = {"times": times.tolist(), "grade_spread": grade_spread}

  return json.dumps(response_data)

@app.route('/Classes-data', methods=['POST'])
def post_Classes():
  if not fabricate_data:
    classes = get_data(classes_url)
  else:
    classes = fabricated_classes
  response_data = {"Classes": classes}
  # print("response_data", response_data)
  return json.dumps(response_data)


#get grades from sheetdb
def get_data(url):
  response = requests.get(url)
  data = response.json()
  return data


#get name from sheetdb
def get_name(url):
  global ip_add
  data = get_data(url)

  filtered_data = [entry for entry in data if entry.get('IP') == ip_add]

  if filtered_data:
      latest_entry = filtered_data[-1]
      first_name = latest_entry.get('first_name')
      last_name = latest_entry.get('last_name')
      return first_name
  else:
      return "Login"


#Update Classes to sheetdb
def update_classes(row_num, new_row, url, durl):
  deletion_endpoint = durl+"id/"+str(row_num)+"?sheet=Classes";
  print(deletion_endpoint)
  print("rn: ", row_num)
  response = requests.delete(deletion_endpoint)
  
  if response.status_code == 200:
      print("Row deletion successful!")
  else:
      print("Row deletion failed. Status code:", response.status_code)
  
  response = requests.post(url, json=new_row)
  
  if response.status_code == 201:
      print("Row creation successful!")
  else:
      print("Row creation failed. Status code:", response.status_code)
  


#post name to sheetdb
def post_name_sheetdb(url, data):
  
  print("IP address from postname is", ip_add)
  data = {
    'first_name': data[0],
    'last_name': data[1],
    'email': data[2],
    'grade': data[3],
    'IP': ip_add
  }
  requests.post(url, json=data)


#post grades to sheetdb

def post_grades(url, data):
  
  payload = {
    "data": data
  }
  response = requests.post(url, json=payload)

  if response.status_code == 201:
    print('Row added successfully')
  else:
    print('Failed to add row:', response.status_code)
#post classes to sheetdb
def post_classes(url, data):
  print(data)
  payload = {
    "data": data
  }
  requests.post(url, json=payload)
  
#get user-inputted grades from GA.js
@app.route('/post-grades', methods=['POST'])
def receive_grades():
  data = request.json 
  post_grades(grades_url, data)
  return 'Data received successfully'

#get user-inputted login from logins.js
@app.route('/post-login', methods=['POST'])
def postLogin():
  print("from postLogin")
  data = request.json
  post_name_sheetdb(logins_url, data)
  return 'success'
  
#get user-inputted classes from Classes.js
@app.route('/post-classes', methods=['POST'])
def receive_Classes():
  data = request.json
  print(data)
  if data["update"] == 0:
    post_classes(classes_url, data['class'])
  else:
    update_classes(data["update"], data['class'], classes_url, generic_url)
  
  return json.dumps({"data":"success"})


def process_grades(grades):
 
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
    "Bio": {
      "homework": 0.3,
      "quiz": 0.2,
      "test": 0.5
    },
    "Eng": {
      "homework": 0.3,
      "quiz": 0.2,
      "test": 0.5
    },
    "Orch": {
      "homework": 0.3,
      "quiz": 0.2,
      "test": 0.5
    },
    "Geo": {
      "homework": 0.3,
      "quiz": 0.2,
      "test": 0.5
    },
    "History": {
      "homework": 0.4,
      "quiz": 0.1,
      "test": 0.5
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






if not fabricate_data:
  full_name = get_name(logins_url)
else:
  full_name = fabricated_name


app.run(host='0.0.0.0', port=8080, debug=True)