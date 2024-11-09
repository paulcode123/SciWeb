import subprocess
import json
import random
import datetime
import requests
from database import get_user_data, update_data, post_data, delete_data, get_data
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
    if "name" in output and output["name"] == "Incorrect credentials":
      return "WrongPass"
    
    return output
    # print(result)

  except Exception as e:
    print("Error running puppeteer script:", e)
    return None


def jupapi_output_to_grades(data, encrypt):
  print("jupapi_output_to_grades")
  grades = []
  classes = data["courses"]
  
  # Get grade corrections for the current user
  corrections = get_user_data("GradeCorrections")
  
  for c in classes:
    assignments = c["assignments"]
    for a in assignments:
      # generate 4 digit random number
      id = random.randint(1000, 9999)
      date = a["due"]
      date = convert_date(date)
      # if score is None, make it 'null'
      score = a["score"] if a["score"] != None else "null"
      value = a["points"]
      # if there are quotes in name, remove them
      a["name"] = a["name"].replace('"', '')
      
      # Check if there's a correction for this assignment
      correction = next((corr for corr in corrections if corr['assignment'] == a['name'] and corr['class'] == c['name']), None)
      
      if correction:
        print("correction applied to ", a['name'], "in class", c['name'])
        # Apply the correction
        score = float(correction['score'])
        value = float(correction['value'])
        
        # If weight is provided, adjust the score
        if 'weight' in correction:
          weight = float(correction['weight'])
          score = score * weight / value
      
      grades.append({
        "name": a["name"],
        "date": date,
        "score": score,
        "value": value,
        "class": c["name"],
        "category": a["category"],
        "OSIS": session['user_data']['osis'],
        "id": id
      })
  
  # filter out grades where grade["score"] = 'null' or grade["date"] = ''
  grades = [grade for grade in grades if grade['score'] != 'null' and grade['date'] != '']

  post_grades(grades, encrypt)
  return grades


def post_grades(grades, encrypt):
    print("len grades posted", len(grades))
    grades_split = [grades[i:i + 100] for i in range(0, len(grades), 100)]

    grades_obj = {"OSIS": str(session['user_data']['osis']), "encrypted": "False"}

    if encrypt != "none":
        print("encrypting")
        # Split the key into prefix and full key
        key_prefix, full_key = encrypt.split(':')
        # Store the prefix in the grades object
        grades_obj["key_prefix"] = key_prefix
        
        for i in range(0, len(grades_split)):
            grade_fragment = grades_split[i]
            grade_fragment = encrypt_grades(str(grade_fragment), int(full_key))
            grades_obj["encrypted"] = "True"
            grades_obj[str(i+1)] = grade_fragment
    else:
        for i in range(0, len(grades_split)):
            grades_obj[str(i+1)] = grades_split[i]

    grades_data = get_user_data("GradeData")
    osis_list = [str(grade['OSIS']) for grade in grades_data]
    
    if str(session['user_data']['osis']) in osis_list:
        update_data(str(session['user_data']['osis']), "OSIS", grades_obj, "GradeData")
    else:
        post_data("GradeData", grades_obj)
    
    return


def jupapi_output_to_classes(data, class_data):
    print("jupapi_output_to_classes")
    # get the user's classes from the jupiter data
    classes = data["courses"]
    
    for c in classes:
        class_exists = False
        class_name = c["name"]
        
        # get the teacher's last name
        teacher = c["teacher"]
        teacher = teacher.split(" ")[-1]
        schedule = c["schedule"]
        raw_cat = c["categories"]
        categories = []
        for cat in raw_cat:
            categories.extend([cat["name"], cat["weight"]*100])
        # print(class_data, class_name, teacher)
        for class_info in class_data:
            # check if the class exists in the db
            if class_info["teacher"] == teacher:
                print(class_info, class_name, teacher, schedule)
            if "name" in class_info and class_info["name"] == class_name and class_info["teacher"] == teacher:
                class_exists = True
                need_update = False
                
                # Update categories regardless of whether the user is already in the class
                if class_info["categories"] != categories:
                    need_update = True
                    class_info["categories"] = categories
                
                # if OSIS is an int, convert to string
                if isinstance(class_info["OSIS"], int):
                    class_info["OSIS"] = str(class_info["OSIS"])

                # Ensure OSIS is a list
                if isinstance(class_info["OSIS"], str):
                    class_info["OSIS"] = class_info["OSIS"].split(", ")
                
                # Add user to the class if not already present
                if str(session['user_data']['osis']) not in class_info["OSIS"]:
                    class_info["OSIS"].append(str(session['user_data']['osis']))
                    need_update = True

                if need_update:
                    # Update the class in the database
                    print("Updating class in the database", class_info)
                    update_data(class_info["id"], "id", class_info, "Classes")
                break
        
        if not class_exists:
            # generate 4 digit random number
            id = random.randint(1000, 9999)
            class_info = {
                "period": "",
                "teacher": teacher,
                "name": class_name,
                "OSIS": [str(session['user_data']['osis'])],
                "assignments": "",
                "description": "",
                "id": str(id),
                "schedule": c["schedule"],
                "categories": categories
            }
            post_data("Classes", class_info)
            

    return class_data  # Return the updated class data

  
    
  

def get_grades():
    data = get_data("GradeData", row_name="OSIS", row_val=str(session['user_data']['osis']))
    #filter for osis
    has_grades = False
    for grade in data:
        
        if str(grade['OSIS']) == str(session['user_data']['osis']):
            line = grade
            has_grades = True
    
    if not has_grades:
        return {"date": "1/1/2021", "score": 0, "value": 0, "class": "No grades entered", "category": "No grades entered", "name": "None"}
    
    grades = []
    gline = {key: line[key] for key in line if key != "OSIS" and key != "encrypted" and key != "docid" and key != "key_prefix"}
    
    if len(gline) == 0:
        return {"date": "1/1/2021", "score": 0, "value": 0, "class": "No grades entered", "category": "No grades entered", "name": "None"}
    
    num_elements = max([int(key) for key in gline.keys()])+1
    encrypted = line['encrypted'] == "True"
    
    if encrypted:
        if 'grades_key' not in session['user_data'] or session['user_data']['grades_key'] == "none":
            print("No grades key")
            return []
        
        # Verify key prefix matches
        stored_prefix = line.get('key_prefix')
        user_key = int(session['user_data']['grades_key'])
        user_prefix = str(user_key // 10000000000000)
        
        if stored_prefix != user_prefix:
            print("Key prefix mismatch")
            return []
        
        for i in range(1, num_elements):
            cell = line[str(i)]
            cell = decrypt_grades(cell, user_key)
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
        try:
            grade['score'] = float(grade['score'])
            grade['value'] = float(grade['value'])
        except:
            print("Error converting score or value to float", grade)
            continue
        # if category is NoneType, print
        if type(grade['category']) == type(None) or type(grade['score']) == type('m') or type(grade['score']) == type(None):
            print("Skipping", grade)
            continue
        
        #convert date to datetime object
        date = str(grade['date'])
        
        #If date="None" or score is of type Nonetype
        if date == "None" or date=="":
            print("skipping", grade)
            continue
        
        date = convert_date(date)
        
        grade['date'] = date
        dated_grades.append(grade)
    # print(len(dated_grades), len(grades))
    return dated_grades


def convert_date(date_str):
    # Current date
    current_date = datetime.datetime.now()
    if date_str == "" or date_str == None:
        #set the date to 9/10
        date_str = "9/10"
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
    # If the resulting date is more than 20 days in the future, subtract one year
    if input_date_with_current_year > current_date + datetime.timedelta(days=20):
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
    
    decrypted_bytes = decrypted_bytes.decode()
    return decrypted_bytes


def confirm_category_match(grades, classes):
    # Check if the category of each grade is in the categories list of each class
    # Return True if any mismatch is found

    # filter classes that the user is in
    classes = [class_info for class_info in classes if str(session['user_data']['osis']) in str(class_info['OSIS'])]
    for class_info in classes:
        class_name = class_info['name']
        class_categories = class_info['categories']
        
        # Create a set of existing category names for faster lookup
        existing_categories = set(class_categories[::2])  # Every other item is a category name

        # Check grades for this class
        for grade in grades:
            if grade['class'] == class_name:
                category = grade['category']
                if category not in existing_categories:
                    print(f"Mismatch found: Category '{category}' not in class '{class_name} with class_info={class_info}'")
                    return True

    # If we've gone through all classes and grades without finding a mismatch, return False
    return False


def notify_new_classes(classes):
    # This function is left empty as per the original code
    pass
  
