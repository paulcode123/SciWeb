from flask import Flask, render_template, request
import json
import requests
import numpy as np
import datetime

#define sheetdb urls to get from/post to
logins_url = "https://sheetdb.io/api/v1/pb8spx7u5gewk"
grades_url = "https://sheetdb.io/api/v1/pb8spx7u5gewk?sheet=Grades"

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


#Send user's name to each JS file
@app.route('/home-data', methods=['POST'])
def post_home_name():
  response_data = full_name
  return json.dumps(response_data)


@app.route('/login-data', methods=['POST'])
def post_login_name():
  response_data = full_name
  return json.dumps(response_data)


@app.route('/GA-data', methods=['POST'])
def post_ga_name():
  response_data = {"full_name": full_name, "times": times.tolist(), "grade_spread": grade_spread}

  return json.dumps(response_data)


#get grades from sheetdb
def get_grades(url):
  response = requests.get(url)
  data = response.json()
  return data


#get name from sheetdb
def get_name(url):
  response = requests.get(url)
  data = response.json()
  return data[-1]['first_name'] + " " + data[-1]['last_name']


#post name to sheetdb
def post_name(url, data):
  data = {
    'first_name': data[0],
    'last_name': data[1],
    'email': data[2],
    'grade': data[3]
  }
  requests.post(url, json=data)


#post grades to sheetdb

def post_grades(url, data):
  data = {
    'date': data[0],
    'score': data[1],
    'value': data[2],
    'class': data[3],
    'category': data[4]
  }
  response = requests.post(url, json=data)

  if response.status_code == 201:
    print('Row added successfully')
  else:
    print('Failed to add row')


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
  post_name(logins_url, data)
  return 'success'

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
    print(datum['date'])
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
      print(classGrade/weightSum)
      classCount += 1

  if classCount > 0:
    print(totalGrade / classCount)
    return totalGrade / classCount
  else:
    return 0




if __name__ == '__main__':

  logins_url = "https://sheetdb.io/api/v1/pb8spx7u5gewk"
  grades_url = "https://sheetdb.io/api/v1/pb8spx7u5gewk?sheet=Grades"
  # full_name = get_name(logins_url)
  full_name = "Testing"
  # grades = get_grades(grades_url)
  grades = [{'date': '1/2/2023', 'score': '1', 'value': '10', 'class': 'Bio', 'category': 'homework'}, {'date': '3/5/2016', 'score': '3', 'value': '10', 'class': 'Bio', 'category': 'test'}, {'date': '9/12/2005', 'score': '2', 'value': '10', 'class': 'History', 'category': 'quiz'}]
  
  times, grade_spread = process_grades(grades)
  app.run(host='0.0.0.0', port=8080, debug=True)

  

  # print(full_name)
