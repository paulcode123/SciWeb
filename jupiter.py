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


def jupapi_output_to_grades(data):
  print("jupapi_output_to_grades")
  grades = []
  classes = data["courses"]
  
  # Get grade corrections for the current user
  corrections = get_user_data("GradeCorrections")
  print("Found corrections:", corrections)
  
  # Get the user's actual class names from the database for validation
  user_classes = get_user_data("Classes")
  if not user_classes:
    print("Warning: No classes found in database for user")
    return []
    
  # Create case-insensitive mapping of class names
  valid_class_names = {c['name'].lower(): c['name'] for c in user_classes if 'name' in c}
  print(f"Valid class names from database: {list(valid_class_names.values())}")
  
  for c in classes:
    try:
      assignments = c["assignments"]
      class_name = c["name"]
      
      # Validate class exists in database
      if class_name.lower() not in valid_class_names:
        print(f"Warning: Class '{class_name}' from Jupiter not found in user's classes. Skipping.")
        continue
        
      # Use exact class name from database
      normalized_class_name = valid_class_names[class_name.lower()]
      
      for a in assignments:
        try:
          # generate 4 digit random number
          id = random.randint(1000, 9999)
          
          # Validate and convert date
          try:
            date = convert_date(a["due"])
            if not date:
              print(f"Warning: Invalid date format for assignment {a['name']} in {class_name}")
              continue
          except Exception as e:
            print(f"Error converting date for assignment {a['name']} in {class_name}: {e}")
            continue
            
          # Validate score and value
          score = a["score"] if a["score"] is not None else "null"
          value = a["points"]
          
          try:
            if score != "null":
              float(score)
            float(value)
          except (ValueError, TypeError):
            print(f"Warning: Invalid score/value format for assignment {a['name']} in {class_name}")
            continue
            
          # Clean assignment name
          a["name"] = a["name"].replace('"', '').strip()
          
          # Check for grade correction
          correction = next((corr for corr in corrections 
                          if corr['assignment'].lower().strip() == a['name'].lower().strip() 
                          and corr['class'].lower().strip() == normalized_class_name.lower().strip()
                          and str(corr['OSIS']) == str(session['user_data']['osis'])), None)
          
          if correction:
            print(f"Applying correction for {a['name']} in {normalized_class_name}: {correction}")
            try:
              score = float(correction['score'])
              value = float(correction['value'])
              
              # Apply optional corrections
              if 'date' in correction:
                date = correction['date']
                
              if 'new_name' in correction:
                a['name'] = correction['new_name']
            except (ValueError, TypeError) as e:
              print(f"Error applying correction for {a['name']}: {e}")
              continue
          
          # Create grade entry
          grade_entry = {
            "name": a["name"],
            "date": date,
            "score": score,
            "value": value,
            "class": normalized_class_name,
            "category": a["category"],
            "OSIS": session['user_data']['osis'],
            "id": id
          }
          
          # Validate all required fields are present and non-empty
          if all(grade_entry[field] for field in ["name", "date", "class", "category"]):
            grades.append(grade_entry)
          else:
            print(f"Warning: Missing required fields in grade entry: {grade_entry}")
            
        except Exception as e:
          print(f"Error processing assignment {a.get('name', 'unknown')} in {class_name}: {e}")
          continue
          
    except Exception as e:
      print(f"Error processing class {c.get('name', 'unknown')}: {e}")
      continue
  
  # filter out grades where grade["score"] = 'null' or grade["date"] = '' but keep numeric scores
  filtered_grades = [grade for grade in grades if (grade['score'] != 'null' and grade['score'] is not None and grade['date'] != '') or isinstance(grade['score'], (int, float))]
  
  if len(filtered_grades) == 0:
    print("Warning: No valid grades found after filtering")
  else:
    print(f"Successfully processed {len(filtered_grades)} grades")
    
  return filtered_grades





def jupapi_output_to_classes(data, class_data):
    print("jupapi_output_to_classes")
    # get the user's classes from the jupiter data
    classes = data["courses"]
    classes_added = []
    
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
                    classes_added.append(class_info)

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
            

    return classes_added  # Return the updated class data

  
    


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
  

def check_new_grades(grades, class_data, tokens_data):
    print("check_new_grades")
    # put all the grades into a dictionary with the class name as the key
    grades_by_class = {}
    for grade in grades:
        # filter out non-assessment grades
        if 'assessment' not in grade['category'].lower() and 'quiz' not in grade['category'].lower() and 'test' not in grade['category'].lower() and 'exam' not in grade['category'].lower() and 'project' not in grade['category'].lower():
            continue
        class_name = grade['class']
        if class_name not in grades_by_class:
            grades_by_class[class_name] = []
        grades_by_class[class_name].append(grade)
    
    for class_name, class_grades in grades_by_class.items():
        class_obj = next((item for item in class_data if item['name'] == class_name), None)
        if class_obj is None:
            continue
        class_id = class_obj['id']

        # check if new_grades doesn't exist
        if 'new_grades' not in class_obj:
            class_obj['new_grades'] = [grade['name'] for grade in class_grades]  # Store only names
            # update the classes sheet
            update_data(class_id, "id", class_obj, "Classes")
            # notify for all grades in the past 3 days
            for grade in class_grades:
                grade_date = datetime.datetime.strptime(grade['date'], '%m/%d/%Y')
                if grade_date < datetime.datetime.now() - datetime.timedelta(days=6):
                    continue
                notify_new_grade(grade, class_obj, tokens_data)
        # else, if new_grades exists, notify for all grades not in new_grades
        else:
            new_grade_names = []
            for grade in class_grades:
                if grade['name'] in class_obj['new_grades']:
                    continue
                notify_new_grade(grade, class_obj, tokens_data)
                new_grade_names.append(grade['name'])
            if len(new_grade_names) > 0:
                class_obj['new_grades'].extend(new_grade_names)  # Add only the names
                # update the classes sheet
                update_data(class_id, "id", class_obj, "Classes")
        
def notify_new_grade(grade, class_obj, tokens_data):  # Renamed parameter to tokens_data
    from database import send_notification
    # Get all students in the class
    students = class_obj['OSIS']
    # if students is an int, put it in a list
    if isinstance(students, int):
        students = [students]
    # Get tokens for all students
    student_tokens = []  # Renamed variable to avoid conflict
    for student in students:
        for token_obj in tokens_data:  # Use tokens_data instead of tokens
            if str(token_obj['OSIS']) == str(student):
                student_tokens.append(token_obj['token'])
                # continue to next student
                break
    # remove duplicates
    student_tokens = list(dict.fromkeys(student_tokens))
    
    # Send notification to all students
    title = f"New grade posted in {class_obj['name']}: {grade['name']}"
    body = "Click to pull your grades, see your score, the class distribution, and more!"
    action = 'https://bxsciweb.org/EnterGrades'
    for token in student_tokens:
        send_notification(token, title, body, action)

def notify_new_member(classes_added, tokens_data):
    from database import send_notification
    print("notify_new_member")
    tokens = []
    # for every class that the user joined, notify existing members that that user joined
    for class_info in classes_added:
        class_name = class_info['name']
        students = class_info['OSIS']
        for student in students:
            if str(student) == str(session['user_data']['osis']):
                continue
            for token_obj in tokens_data:
                if str(token_obj['OSIS']) == str(student):
                    tokens.append((token_obj['token'], class_name))
        
    for token in tokens:
        send_notification(token[0], "New Classmate", f"{session['user_data']['first_name']} has joined {token[1]}!", "https://bxsciweb.org/Classes")





