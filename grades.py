from database import get_data, update_data
from flask import session
import datetime
import numpy as np
import json
import ast

from database import update_data

#filter grades for those matching user osis and classes among those being graphed
def filter_grades(grades, user_data, classes):
  # check if grades is empty
  if len(grades) == 0 or (type(grades) == 'dict' and grades['date']=="1/1/2021"):
    print("no grades passed into filter_grades()")
    return []
  try:
    #filter grades for matching osis'
    grades = [grade for grade in grades if int(grade['OSIS']) == int(user_data['osis'])]
    if len(grades) == 0:
      print("no grades match osis")
      return []
  except TypeError as e:
    print("TypeError in filter_grades", e)
    # print(grades)
  
  #filter grades for matching classes
  classes = [c.lower() if c != "All" else c for c in classes]

    
  fgrades = []
  for grade in grades:
    if ((grade['class'].lower() in classes) or ('all' in classes)) and ((grade['category'].lower() in classes) or ('All' in classes)):
      fgrades.append(grade)  
  
  print("in filter_grades: grades filtered from length", len(grades), "to", len(fgrades), "with filters", classes)
  # grades = []
  # for grade in grades:
  #   for c in classes:
  #     if ((c.lower() == grade['class'].lower()) or (c == 'all')) and ()
  #       grades.append(grade)
    
  return fgrades


# Get the minimum and maximum dates of the user's grades
def get_min_max(grades, interval=10):
    print("in get_min_max")
    
    if len(grades) == 0:
        print("error: no grades found in gmm, returning 0, 0, 0")
        return 0,0,0
    
    #get dates from grades
    dates = [
        datetime.datetime.strptime(grade['date'], '%m/%d/%Y').date() for grade in grades
    ]
    
    if len(dates) == 0:
        print("error: no dates found in gmm returning 0, 0, 0")
        return 0, 0, 0
    min_date = min(dates)
    max_date = max(dates)
  
    max_date = max_date + datetime.timedelta(days=(((max_date-min_date).days)/interval))
    if min_date == max_date:
        max_date = max_date + datetime.timedelta(days=5)
    return min_date, max_date, grades

def get_weights(classes_data, osis):
  print("in get_weights")
  #convert grading categories in classes data to weights
  weights = {}

  for class_info in classes_data:
    # if osis does not match user data, continue
    if not str(osis) in str(class_info['OSIS']):
      continue
    name = class_info['name'].lower()
    # Get the categories for the class, lowercase
    
    
    # if categories is a string, convert to json
    if type(class_info['categories']) == str:
      categories_str = class_info['categories'].lower()
      categories = json.loads(categories_str)
    else:
      categories = [str(category).lower() for category in class_info['categories']]
      
    # Create a dictionary to store weights
    weight_dict = {}
    
    # Iterate over the list in pairs (category, weight)
    for i in range(0, len(categories), 2):
        category = categories[i]
        weight = float(categories[i + 1]) / 100.0  # Convert the percentage to a decimal
        
        weight_dict[category.lower()] = weight
    
    weights[name.lower()] = weight_dict
  return weights

# Calculate the user's grades over time
def process_grades(grades, user_data, classes_data, interval=10, s_min_date=None, s_max_date=None):
  print("in process_grades")
  
  if not s_min_date:
    # Get the minimum and maximum dates of the user's grades
    min_date, max_date, z = get_min_max(grades, interval=interval)
    # override max_date to today
    max_date = datetime.datetime.now().date()
    
    
    
    if min_date == 0:
      return 0, []
    
    # Generate 10 evenly spaced dates between the minimum and maximum dates
    date_range = np.linspace(min_date.toordinal(),
                            max_date.toordinal(),
                            num=interval,
                            dtype=int)
    evenly_spaced_dates = [datetime.date.fromordinal(d) for d in date_range]
    #Throw out the dates that are past mx, the maximum date of the user's grades
    evenly_spaced_dates = [date for date in evenly_spaced_dates]
  else:
    # Generate 10 evenly spaced dates between the minimum and maximum dates
    date_range = np.linspace(s_min_date.toordinal(),
                            s_max_date.toordinal(),
                            num=interval,
                            dtype=int)
    evenly_spaced_dates = [datetime.date.fromordinal(d) for d in date_range]

  
  weights = get_weights(classes_data, session['user_data']['osis'])

  # get grades for each date
  grade_spread = []
  for date in range(len(evenly_spaced_dates)-1):
    grade_spread.append(calculate_grade(evenly_spaced_dates[date], grades, weights))
  grade_spread.append(calculate_grade(evenly_spaced_dates[-1], grades, weights, all_dates=True))

  # add "none" values to the end of the grade spread to make it the same length as the date range
  while len(grade_spread) < interval:
    grade_spread.append('none')

  return date_range, grade_spread

# Calculate grade at given date
def calculate_grade(time, data, weights, return_class_grades=False, all_dates=False):
  print("in calculate_grade")
  categories = {}
  
  # For each assignment(with grade) in the data...
  for datum in data:
    #get the date of the grade
    grade_time = datetime.datetime.strptime(datum['date'], '%m/%d/%Y').date()
    # If the date of the grade is after the date we're calculating the grade for, skip it
    if time < grade_time and not all_dates:
      continue
    # If the class has not yet been added to the categories dictionary, add it
    if datum["class"] not in categories:
      categories[datum["class"]] = {}
    # If the category has not yet been added to the class's dictionary, add it, and initialize the category's data
    if datum["category"] not in categories[datum["class"]]:
      if datum["category"].lower() not in weights[datum["class"].lower()]:
        print("Strange error: category "+ datum['category'].lower() + " not in weights: " + str(weights[datum["class"].lower()]) + " for class " + datum["class"].lower())
        continue
      categories[datum["class"]][datum["category"]] = {
        "scoreSum": 0,
        "valueSum": 0,
        "count": 0,
        "weight": weights[(datum["class"].lower())][(datum["category"].lower())]
      }

    category = categories[datum["class"]][datum["category"]]
    # Add the score and value of the grade to the category's data
    category["scoreSum"] += float(datum["score"])
    category["valueSum"] += int(datum["value"])
    category["count"] += 1

  totalGrade = 0
  classCount = 0
  classGrades = {}
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
      classGrades[className] = (classGrade / weightSum)*100

  if classCount > 0:
    finalGrade = totalGrade*100 / classCount
    if return_class_grades:
      return finalGrade, classGrades
    return finalGrade
  else:
    print("error: no grades found in calculate_grade.", len(data), "grades passed in")
    return 100

def get_grade_points(grades, user_data, classes_data):
  print("in get_grade_points")
  #Get the ordinal date and score/value of every grade in the given classes
  weights = get_weights(classes_data, user_data['osis'])
  # print("weights", weights)
  grade_points = []
  category_weight_sums = {}
  for grade in grades:
    date = datetime.datetime.strptime(grade['date'], '%m/%d/%Y').toordinal()
    weight = float(grade['value'])
    score = (float(grade['score'])/weight)*100
    class_upper = grade['class'][0].upper() + grade['class'][1:]
    #Get the sum of the weights of all assignments in the category
    #Check if the class and category has been added to the category_weight_sums dictionary
    if (class_upper not in category_weight_sums) or (grade['category'] not in category_weight_sums[class_upper]):
      category_weight_sum = sum([float(xgrade['value']) for xgrade in grades if xgrade['category'] == grade['category']])
      category_weight_sums[class_upper] = {grade['category']: category_weight_sum}
      
    else:
      category_weight_sum = category_weight_sums[class_upper][grade['category']]
    #Change first letter of class to uppercase
    if grade["category"].lower() not in weights[grade["class"].lower()]:
        print("Strange error: category not in weights")
        continue
    category_weight = weights[grade['class'].lower()][(grade['category'].lower())]
    relative_weight = (weight/(category_weight_sum*category_weight))*1000

    
    #Get weight/sum of weights for the grades
    if grade['value']==None:
      grade['value'] = 0
    relative_weight = (weight/sum([float(grade['value']) for grade in grades]))*1000

    #If relative_weight exceeds 40, set it to 40
    if relative_weight > 40:
      relative_weight = 40
    
    grade_points.append([date, score, relative_weight, grade['name']])
  return grade_points

def make_category_groups(class_data):
  print("in make_category_groups")
  from main import get_insights
  #Get all categories across all classes
  categories = []
  for class_info in class_data:
    # convert all elements of categories to lowercase
    cat = [str(category).lower() for category in class_info['categories']]

    categories.extend(cat)
  #remove every other element of categories, starting with the one at index 1
  categories = categories[::2]

  prompt = "For each category given, sort it into the group that is the best match: Assessments, Midyear/Final, Participation, or Homework. Return only an array of form {'Assessments': [component1, component2, ...], 'Midyear/Final': [...], ...}:"+str(categories)
  full_prompt = [{"role":"system", "content": prompt}]
  response = get_insights(full_prompt)
  # print(response)
  response = response.replace("\n", "")
  response = response.replace("    ", " ")
  response = response.replace("{ ", "{")
  try:
    response = ast.literal_eval(response)
  except:
    print("Error: response not in correct format", response)
    return []
  #get keys of response
  grouped_categories = list(response.keys())
  session['category_groups'] = response
  return grouped_categories
  
def decode_category_groups(category_groups):
  print("in decode_category_groups")
  if category_groups[1] == "All":
    # print("dcg exit")
    return category_groups
  #filter elements of category_groups for only those with an uppercase first letter
  category_names = [category[5:] for category in category_groups if category[:5]=="[CAT]"]
  components = [category for category in category_groups if category[:5]!="[CAT]"]
  
  #replace each category group name with it's components
  for category in category_names:
    c = session['category_groups'][category]
    # print("c", c)
    components.extend(c)

  # print("input", category_groups, "components", components)
  return components
  
def get_stats(grades, classes):
  print("in get_stats")
  # get current GPA(avg of rounded class grades), raw average
  grades = filter_grades(grades, session['user_data'], ["all", "All"])
  weights = get_weights(classes, session['user_data']['osis'])
  current_date = datetime.datetime.now().date()
  raw_avg, current_grades = calculate_grade(current_date, grades, weights, return_class_grades=True)
  raw_avg = round(raw_avg, 2)
  # get the GPA by taking the average of the rounded class grades
  gpa = round(sum([round(grade) for grade in current_grades.values()])/len(current_grades), 2)

  # calculate the grade from 30 days ago
  thirty_days_ago = current_date - datetime.timedelta(days=30)
 
  try:
    t30_avg, t30_grades = calculate_grade(thirty_days_ago, grades, weights, return_class_grades=True)
    t30_avg = round(t30_avg, 3)

    # Calculate the change in grades for each class
    grade_changes = {}
    for class_name, grade in current_grades.items():
      if class_name in t30_grades:
        grade_changes[class_name] = round(grade - t30_grades[class_name], 3)

    # Find the most improved class and most worsened class
    most_improved_class = max(grade_changes, key=grade_changes.get)
    most_worsened_class = min(grade_changes, key=grade_changes.get)
  except:
    t30_avg = 0
    grade_changes = {}
    most_improved_class = "None"
    most_worsened_class = "None"

  # calculate the change in avg from the past 30 days
  avg_change = raw_avg - t30_avg
  avg_change = round(avg_change, 2)

  # filter grades for only those from the past 30 days
  grades_past_30_days = [grade for grade in grades if datetime.datetime.strptime(grade['date'], '%m/%d/%Y').date() >= thirty_days_ago]
  past30_avg = calculate_grade(current_date, grades_past_30_days, weights)
  past30_avg = round(past30_avg, 2)

  return {"gpa": gpa, "raw_avg": raw_avg, "avg_change": avg_change, "most_improved_class": most_improved_class, "most_worsened_class": most_worsened_class, "past30_avg": past30_avg, "t30_avg": t30_avg, "grade_changes": grade_changes}

def update_leagues(grades, classes):
  

  print("in update_leagues")
  # filter the leagues for those that the user is in and get all of the activities that need to be calculated
  leagues = get_data("Leagues")
  fleagues = []
  distinct_activities = []
  for league in leagues:
    if str(session['user_data']['osis']) in league['OSIS']:
      fleagues.append(league)
      # if activities is a string, convert to json
      if type(league['Activities']) == str:
        activities = json.loads(league['Activities'])
      else:
        activities = league['Activities']
      distinct_activities.extend(activities)

  
  # if the league permissions include the grades over time chart, calculate the user's grade over time
  if "GOTC" in distinct_activities:
    # standardize the min and max dates by setting min_date to the previous september 10th and max_date to the current date
    now = datetime.datetime.now()
    if now.month < 9 or (now.month == 9 and now.day < 10):
      min_date = datetime.date(datetime.datetime.now().year-1, 9, 10)
    else:
      min_date = datetime.date(datetime.datetime.now().year, 9, 10)
    max_date = now.date()
    dr, grade_spread = process_grades(grades, session['user_data'], classes, 15, min_date, max_date)
    # print(dr)
  # Grade Leaderboard
  # if "Glb" in distinct_activities:
  #   goalp = calculate_goal_progress(session)
  # recent assessment share
  if "RAS" in distinct_activities:
    # filter grades for assessment category and the past 30 days
    fgrades = []
    if not 'category_groups' in session:
      assessment_categories = make_category_groups(classes)
    assessment_categories = session['category_groups']['Assessments']
    for grade in grades:
      if grade['category'] in assessment_categories and datetime.datetime.strptime(grade['date'], '%m/%d/%Y').date() >= datetime.datetime.now().date() - datetime.timedelta(days=30):
        fgrades.append(grade)
  # For RIlb, GPAlb, get the user's stats
  stats = get_stats(grades, classes)

  # update the database with the calculated data
  to_compile = {
    "GOTC": locals().get('grade_spread', None),
    "GPAlb": locals().get('stats', {}).get('gpa', None),
    "RIlb": locals().get('stats', {}).get('avg_change', None),
    "Glb": locals().get('goalp', None),
    "RAS": locals().get('fgrades', None)
}
  
  for league in fleagues:
    for activity in to_compile.keys():
      if not activity in league['Activities']:
        continue
      if activity in league and league[activity] != "":
        la = league[activity]
        la = la.replace("'", '"')
        content = json.loads(la)
        content[session['user_data']['osis']] = to_compile[activity]
        league[activity] = str(content)
      else:
        if activity != "GOTC":
          league[activity] = str({session['user_data']['first_name']: to_compile[activity]})
        else:
          league[activity] = str({'dates': str(dr), session['user_data']['first_name']: to_compile[activity]})

    update_data(league['id'], 'id', league, 'Leagues')
  

def get_compliments(grades, classes, days=90):
  print("in get_compliments")
  # This function finds the 5 individual grades with the largest impact on the user's GPA in the past 10 days
  # It then chooses a different metric for each grade to complement the user on
  # For example, it increased the classes' grade by x%, it increased that category's grade by y%, a score of a on your next assignment will get your grade up to a b, etc.

  # filter grades for only those from the past 10 days
  now = datetime.datetime.now()
  ten_days_ago = now - datetime.timedelta(days=days)
  recent_grades = [grade for grade in grades if datetime.datetime.strptime(grade['date'], '%m/%d/%Y').date() >= ten_days_ago.date()]
  print("len grades", len(grades), "len recent grades", len(recent_grades))
  # get the impact of each grade on the user's GPA
  weights = get_weights(classes, session['user_data']['osis'])
  for grade in recent_grades:
    grade['impact'] = get_grade_impact(grade, grades, weights)

  # sort the grades by impact
  recent_grades.sort(key=lambda x: x['impact'][2], reverse=True)
  # get the 5 grades with the largest impact
  best_grades = recent_grades[:5]
  # make sure all 5 of them have a positive impact, or else recall the function with a larger number of days
  if len(best_grades)<5 or best_grades[-1]['impact'][2] < 0:
    return get_compliments(grades, classes, days+5)
  complements = []
  complements.append("Great work on " + best_grades[0]['name'] + " in " + best_grades[0]['class'] + "! It increased your "+best_grades[0]['class']+" grade by " + str(round(best_grades[0]['impact'][1], 2)) + "%.")
  complements.append("You're doing great in " + best_grades[1]['class'] + "! " + best_grades[1]['name'] + " increased your "+best_grades[1]['category']+" grade by " + str(round(best_grades[1]['impact'][0], 2)) + "%. Getting a score of " + str(round(best_grades[1]['impact'][3], 2)) + " on your next one will bump your "+best_grades[1]['category']+" grade up to a " + str(round(best_grades[1]['impact'][4], 2)) + ".")
  complements.append("Nice job on " + best_grades[2]['name'] + " in " + best_grades[2]['class'] + "! It increased your GPA by " + str(round(best_grades[2]['impact'][2], 2)) + ".")
  complements.append("You're doing great in " + best_grades[3]['class'] + "! " + best_grades[3]['name'] + " increased your "+best_grades[3]['category']+" grade by " + str(round(best_grades[3]['impact'][0], 2)) + "%. Getting a score of " + str(round(best_grades[3]['impact'][3], 2)) + " on your next one will bump your "+best_grades[3]['category']+" grade up to a " + str(round(best_grades[3]['impact'][4], 2)) + ".")
  complements.append("Great work on " + best_grades[4]['name'] + " in " + best_grades[4]['class'] + "! It increased your "+best_grades[4]['class']+" grade by " + str(round(best_grades[4]['impact'][1], 2)) + "%.")
  return complements

                 

def get_grade_impact(grade, grades, weights):
  print("in get_grade_impact")
  category_weight = weights[grade['class'].lower()][(grade['category'].lower())]
  num_classes = len(weights)
  grade_score = float(grade['score'])
  grade_value = float(grade['value'])
  # filter grades for the category and class of the grade
  fgrades = [g for g in grades if g['category'] == grade['category'] and g['class'] == grade['class']]
  # get the current category grade
  score_sum = sum([float(g['score']) for g in fgrades])
  value_sum = sum([float(g['value']) for g in fgrades])
  current_category_grade = score_sum/value_sum*100
  cat_impact = (grade_score/grade_value*100 - current_category_grade)*grade_value/value_sum
  class_impact = cat_impact*category_weight/100
  GPA_impact = class_impact/num_classes
  # get grade needed on next, equally weighted assignment to bump category grade up to next multiple of 0.5
  next_mult = round(current_category_grade*2)/2
  if float(next_mult) == float(current_category_grade):
    next_mult += 0.5
  next_grade = (next_mult*(value_sum+grade_value)/100 - score_sum)
  # if cat_impact > 0.2:
  #   print("cat_impact", cat_impact, "class_impact", class_impact, "GPA_impact", GPA_impact, "next_grade", next_grade, "next_mult", next_mult, "current_category_grade", current_category_grade, "score_sum", score_sum, "value_sum", value_sum, "grade_score", grade_score, "grade_value", grade_value)
  return [cat_impact, class_impact, GPA_impact, next_grade, next_mult]


