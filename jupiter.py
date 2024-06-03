import subprocess
import json
import random
import datetime
import requests
from database import get_data, update_data, post_data, delete_data
import re
from flask import session


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


def jupapi_output_to_grades(data, encrypt):
  print("jupapi_output_to_grades")
  grades = []
  classes= data["courses"]
  for c in classes:
    assignments = c["assignments"]
    for a in assignments:
      # generate 4 digit random number
      id = random.randint(1000, 9999)
      date = a["due"]
      date = convert_date(date)
      # if score is None, make it 'null'
      score = a["score"] if a["score"] != None else "null"
      grades.append({"name": a["name"], "date": date, "score": score, "value": a["points"], "class": c["name"], "category": a["category"], "OSIS": session['user_data']['osis'], "id": id})
  #To avoid size issues, split the grades into groups of 100 assignments each
  grades_split = [grades[i:i + 100] for i in range(0, len(grades), 100)]

  grades_obj = {"OSIS": str(session['user_data']['osis']), "encrypted": "False"}

  #modify the line above to include all the grades
  for i in range(0, len(grades_split)):
    grade_fragment = grades_split[i]
    if encrypt != "none":
      print("encrypting")
      grade_fragment = encrypt_grades(str(grade_fragment), int(encrypt))
      grades_obj["encrypted"] = "True"
    grades_obj[str(i+1)] = grade_fragment
   
  #get list of all values in 'OSIS' column
  grades_data = get_data("GradeData")
  osis_list = [str(grade['OSIS']) for grade in grades_data]
  # If the user's osis is already in the osis column, update, otherwise post
  if str(session['user_data']['osis']) in osis_list:
    update_data(str(session['user_data']['osis']), "OSIS", grades_obj, "GradeData")
  else:
    post_data("GradeData", grades_obj)

  # filter out grades where grade["score"] = 'null' or grade["date"] = ''
  grades = [grade for grade in grades if grade['score'] != 'null' and grade['date'] != '']
  return grades
  
def jupapi_output_to_classes(data):
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
        update_data(class_info["id"], "id", class_info, "Classes")
        
        class_exists = True
        break
      
        
    
    if not class_exists:
      #generate 4 digit random number
      id = random.randint(1000, 9999)
      class_info = {"period": "", "teacher": teacher, "name": class_name, "OSIS": session['user_data']['osis'], "assignments": "", "description": "", "id": str(id), "schedule": c["schedule"], "categories": categories}
      post_data("Classes", class_info)

  
    
  

def get_grades():
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

  # get the line dict without the osis and encrypted keys
  gline = {key: line[key] for key in line if key != "OSIS" and key != "encrypted" and key != "docid"}
  # get the highest number of the keys in the line dict
  num_elements = max([int(key) for key in gline.keys()])+1
  
  # convert string to boolean
  encrypted = line['encrypted'] == "True"
  if encrypted:
    if 'grades_key' not in session['user_data'] or session['user_data']['grades_key'] == "none":
        print("No grades key")
        return []
    
    for i in range(1, num_elements):
      cell = line[str(i)]
      cell = decrypt_grades(cell, int(session['user_data']['grades_key']))
      # convert single quotes to double quotes
      cell = cell.replace("{'", '{"')
      cell = cell.replace("':", '":')
      cell = cell.replace(", '", ', "')
      cell = cell.replace("'}", '"}')
      cell = cell.replace(": '", ': "')
      cell = cell.replace("',", '",')
      
      cell = json.loads(cell)
      for grade in cell:
        if grade['score'] == 'null':
          grade['score'] = None
      grades.extend(cell)
  else:
    for i in range(1, num_elements):
      cell = line[str(i)]
      if type(cell) == str:
        cell = json.loads(cell)
      grades.extend(cell)
  
  #convert date of each grade from format m/dd to mm/dd/yyyy
  
  dated_grades = []
  for grade in grades:
    # if category is NoneType, print
    if type(grade['category']) == type(None) or type(grade['score']) == type('m') or type(grade['score']) == type(None):
      # print("NoneType", grade)
      continue
    
    #convert date to datetime object
    date = str(grade['date'])
    
    #If date="None" or score is of type Nonetype
    if date == "None" or date=="":
      continue
    
    date = convert_date(date)
    
    grade['date'] = date
    dated_grades.append(grade)
  # print(len(dated_grades), len(grades))
  return dated_grades


def convert_date(date_str):
    if date_str == "" or date_str == None:
        return date_str
    # Current date
    current_date = datetime.datetime.now()
    # add 5 days to the current date
    current_date = current_date + datetime.timedelta(days=5)
    current_year = current_date.year
    
    # Parse the input date string and add the current year
    try:
      if "202" in date_str:
        input_date_with_current_year = datetime.datetime.strptime(date_str, "%m/%d/%Y")
      else:
        input_date_with_current_year = datetime.datetime.strptime(date_str + f"/{current_year}", "%m/%d/%Y")
    except:
      print("Error parsing date", date_str)
    # If the resulting date is in the future, subtract one year
    if input_date_with_current_year > current_date:
        input_date_with_current_year = input_date_with_current_year.replace(year=current_year - 1)
    
    # Return the formatted date string without leading zeros in a platform-independent way
    return f"{input_date_with_current_year.month}/{input_date_with_current_year.day}/{input_date_with_current_year.year}"


def encrypt_grades(plain_text, number):
    # Convert the number to bytes
    key_bytes = number.to_bytes((number.bit_length() + 7) // 8, byteorder='big')
    
    # Convert the plain text to bytes
    plain_bytes = plain_text.encode()
    
    # XOR each byte of the plain text with the key
    encrypted_bytes = bytearray()
    for i in range(len(plain_bytes)):
        encrypted_bytes.append(plain_bytes[i] ^ key_bytes[i % len(key_bytes)])
    
    return encrypted_bytes.hex()

def decrypt_grades(cipher_text, number):
    # Convert the number to bytes
    key_bytes = number.to_bytes((number.bit_length() + 7) // 8, byteorder='big')
    
    # Convert the hexadecimal string back to bytes
    encrypted_bytes = bytearray.fromhex(cipher_text)
    
    # XOR each byte of the cipher text with the key
    decrypted_bytes = bytearray()
    for i in range(len(encrypted_bytes)):
        decrypted_bytes.append(encrypted_bytes[i] ^ key_bytes[i % len(key_bytes)])
    
    return decrypted_bytes.decode()