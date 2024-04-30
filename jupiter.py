import subprocess
import json
import random
import datetime
import requests
from database import get_data, update_data, post_data, delete_data
import re


def run_puppeteer_script(osis, password):
  print("runnnning puppeteer script")
  try:
    cloud_run_url = f'https://jupiterapi-xz43fty7fq-pd.a.run.app/fetchData?osis={osis}&password={password}'
    
    

    output = requests.get(cloud_run_url)
    output = output.text
    print("done")

    output = output.replace("\n", "")
    output = output.replace("'", "")
    output = output.replace("`", "")
   
    output = output.replace('"{', "{")
    output = output.replace("&amp;", "&")
    pattern = r'(\\)?\\"'
    # Replace matched patterns with just "
    output = re.sub(pattern, '"', output)


    output = output[:-2] + "}"
   
    output = json.loads(output)
    output = output['data']

    
    # output = output.split("Course ")[1:]

    # for course in output:
    #   course = course.split("Category ")[1:]
    
    
    return output
    # print(result)

  except Exception as e:
    print("Error running puppeteer script:", e)
    return None


def jupapi_output_to_grades(data, session, sheetdb_url, allow_demo_change):
  grades = []
  classes= data["courses"]
  for c in classes:
    assignments = c["assignments"]
    for a in assignments:
      # generate 4 digit random number
      id = random.randint(1000, 9999)
      grades.append({"name": a["name"], "date": a["due"], "score": a["score"], "value": a["points"], "class": c["name"], "category": a["category"], "OSIS": session['user_data']['osis'], "id": id})
  #To avoid size issues, split the grades into groups of 100 assignments each
  grades_split = [grades[i:i + 100] for i in range(0, len(grades), 100)]

  grades_obj = {"OSIS": session['user_data']['osis']}
  #modify the line above to include all the grades
  for i in range(0, len(grades_split)):
    grades_obj[str(i+1)] = grades_split[i]
  #get list of all values in 'OSIS' column
  grades_data = get_data("GradeData")
  osis_list = [str(grade['OSIS']) for grade in grades_data]
  # If the user's osis is already in the osis column, update, otherwise post
  if str(session['user_data']['osis']) in osis_list:
    update_data(session['user_data']['osis'], "OSIS", grades_obj, "GradeData")
  post_data("GradeData", grades_obj)
  print(len(grades))
  return grades
  
def jupapi_output_to_classes(data, session, sheetdb_url, allow_demo_change):
  #this function suggests which classes the user should create or join based on their jupiter classes
  #for each class, if the class exists in class_data, update the db it with the user's osis in the 'OSIS' col of that class
  # If the class does not yet exist, add the class to the db: {"teacher": teacher name, "name": class name, "OSIS": user's osis, "id": random 4 digit number, "period": period, "categories": [name, weight, name, weight, ...]}
  
  to_post = []
  class_data = get_data("Classes")
  
  classes = data["courses"]
  for c in classes:
    class_exists = False
    class_name = c["name"]
    
    teacher = c["teacher"]
    teacher = teacher.split(" ")[-1]
    schedule = c["schedule"]
    raw_cat = c["categories"]
    categories = []
    for cat in raw_cat:
      categories.extend([cat["name"], cat["weight"]*100])
    
    # if class_name and teacher match a class in class_data, update the class with the user's osis
    for class_info in class_data:
      # check if the class exists in the db
      if not("name" in class_info and class_info["name"] == class_name and class_info["teacher"] == teacher and class_info["schedule"] == schedule):
        continue
      if str(session['user_data']['osis']) in class_info["OSIS"]:
        class_exists = True
        break
      else:
        class_info["OSIS"] = str(session['user_data']['osis']) + ", " + class_info["OSIS"]
        # update_data(class_info["id"], "id", class_info, "Classes", session, sheetdb_url, allow_demo_change)
        update_data(class_info["id"], "id", class_info, "Classes", session, sheetdb_url, allow_demo_change)
        
        class_exists = True
        break
      
        
    
    if not class_exists:
      #generate 4 digit random number
      id = random.randint(1000, 9999)
      class_info = {"period": "", "teacher": teacher, "name": class_name, "OSIS": session['user_data']['osis'], "assignments": "", "description": "", "id": id, "schedule": c["schedule"], "categories": categories}
      post_data("Classes", class_info)

  
    
  

def get_grades(session):
  data = get_data("GradeData")
  #filter for osis
  has_grades = False
  for grade in data:
    
    if str(grade['OSIS']) == str(session['user_data']['osis']):
      line = grade
      has_grades = True
  
  if not has_grades:
    return {"date": "1/1/2021", "score": 0, "value": 0, "class": "No grades entered", "category": "No grades entered", "name": "None"}
  
  grades = []
  # get how many elements are in the dictionary
  num_elements = len(line)
  
  for i in range(1, num_elements-1):
    cell = line[str(i)]
    #if cell isn't already a dict, convert from string to list of dictionaries
    if type(cell) == str:
      cell = json.loads(cell)
    
    grades.extend(cell)
  #convert date of each grade from format m/dd to mm/dd/yyyy
  
  dated_grades = []
  for grade in grades:
    #convert date to datetime object
    date = str(grade['date'])
    
    #If date="None" or score is of type Nonetype
    if date == "None" or date=="" or type(grade['score']) == type(None):
      continue
    
    date = convert_date(date)
    
    grade['date'] = date
    dated_grades.append(grade)
  print(dated_grades[:10])
  return dated_grades


def convert_date(date_str):
    # Current date
    current_date = datetime.datetime.now()
    # add 5 days to the current date
    current_date = current_date + datetime.timedelta(days=5)
    current_year = current_date.year
    
    # Parse the input date string and add the current year
    input_date_with_current_year = datetime.datetime.strptime(date_str + f"/{current_year}", "%m/%d/%Y")
    
    # If the resulting date is in the future, subtract one year
    if input_date_with_current_year > current_date:
        input_date_with_current_year = input_date_with_current_year.replace(year=current_year - 1)
    
    # Return the formatted date string without leading zeros in a platform-independent way
    return f"{input_date_with_current_year.month}/{input_date_with_current_year.day}/{input_date_with_current_year.year}"

