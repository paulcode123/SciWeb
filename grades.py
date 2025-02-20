from database import get_user_data, update_data
from flask import session
import datetime
import numpy as np
import json
import ast
import math

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

  if not classes_data:
    print("Warning: No classes data provided to get_weights")
    return weights

  for class_info in classes_data:
    # if osis does not match user data, continue
    if not str(osis) in str(class_info['OSIS']):
      continue
    
    if 'name' not in class_info:
      print(f"Warning: Class info missing name field: {class_info}")
      continue
      
    name = class_info['name']
    
    if 'categories' not in class_info or not class_info['categories']:
      print(f"Warning: No categories found for class {name}")
      continue

    # Get the categories for the class, lowercase
    try:
      # if categories is a string, convert to json
      if type(class_info['categories']) == str:
        categories_str = class_info['categories'].lower()
        categories = json.loads(categories_str)
      else:
        categories = [str(category).lower() for category in class_info['categories']]
        
      # Create a dictionary to store weights
      weight_dict = {}
      
      # Validate categories list has pairs
      if len(categories) % 2 != 0:
        print(f"Warning: Invalid categories format for {name}. Categories must be in pairs of [name, weight]")
        continue
        
      # Iterate over the list in pairs (category, weight)
      weight_sum = 0
      for i in range(0, len(categories), 2):
          category = categories[i]
          try:
              weight = float(categories[i + 1]) / 100.0  # Convert the percentage to a decimal
              weight_sum += weight
              weight_dict[category.lower()] = weight
          except (ValueError, TypeError) as e:
              print(f"Warning: Invalid weight value for category {category} in class {name}: {e}")
              continue
      
      # Validate weights sum to approximately 1
      if not 0.99 <= weight_sum <= 1.01:
          print(f"Warning: Weights for class {name} sum to {weight_sum}, should sum to 1.0")
      
      weights[name.lower()] = weight_dict
      print(f"Successfully loaded weights for {name}: {weight_dict}")
      
    except Exception as e:
      print(f"Error processing categories for class {name}: {e}")
      continue

  if not weights:
    print("Warning: No valid weights could be generated from classes data")
    
  return weights

# make a process_grades function that takes in grades, weights, class, category, and times and returns a list that is the user's grade for the given class and category at the given time
def process_grades(grades, class_name, category, times):
  # filter grades for the given class and category
  fgrades = [grade for grade in grades if grade['class'].lower() == class_name.lower() and grade['category'].lower() == category.lower()]
  if len(fgrades) == 0:
    return False
  # loop through each time and get the grade for the given class and category at that time
  grades_at_time = []
  for time in times:
    # filter fgrades for those with a date less than or equal to the given time
    fgrades_at_time = []
    for grade in fgrades:
      grade_date_ordinal = datetime.datetime.strptime(grade['date'], '%m/%d/%Y').toordinal()
      if grade_date_ordinal <= time:
        fgrades_at_time.append(grade)
    grade = get_category_grade(fgrades_at_time)
    if grade:
      grades_at_time.append(grade)
    else:
      grades_at_time.append(99.993)
  return grades_at_time

def get_category_grade(grades):
  if len(grades) == 0:
    return False
    
  try:
    # Validate all grades have valid score and value
    valid_grades = []
    for grade in grades:
      try:
        score = float(grade['score'])
        value = float(grade['value'])
        if value <= 0:
          print(f"Warning: Invalid grade value of {value} in grade: {grade}")
          continue
        valid_grades.append(grade)
      except (ValueError, TypeError) as e:
        print(f"Warning: Invalid score/value in grade: {grade}")
        continue
        
    if not valid_grades:
      print(f"Warning: No valid grades found in category")
      return False
      
    # get the weighted average of the grades
    total_score = sum(float(grade['score']) for grade in valid_grades)
    total_value = sum(float(grade['value']) for grade in valid_grades)
    grade = (total_score / total_value) * 100
    
    # Validate grade is reasonable
    if not 0 <= grade <= 110:  # Allow slightly over 100 for extra credit
      print(f"Warning: Calculated grade {grade} seems unreasonable")
      return False
      
    return grade
    
  except Exception as e:
    print(f"Error calculating category grade: {str(e)}")
    return False

# make a calculate_grade function that takes in grades, weights, and time and returns the user's grade for the given time
def calculate_grade(grades, weights, time, return_class_grades=False):
  print("in calculate_grade")
  
  if not grades:
    print("Warning: No grades provided to calculate_grade")
    return (100, {}) if return_class_grades else 100
    
  if not weights:
    print("Warning: No weights provided to calculate_grade")
    return (100, {}) if return_class_grades else 100

  # Print available classes and weights for debugging
  print(f"Available classes in weights: {list(weights.keys())}")
  
  # sort grades into class/category groups
  class_category_groups = {}
  class_grades = {}
  
  for grade in grades:
    try:
      # Validate required grade fields
      required_fields = ['class', 'category', 'date', 'score', 'value']
      missing_fields = [field for field in required_fields if field not in grade]
      if missing_fields:
        print(f"Warning: Grade missing required fields {missing_fields}: {grade}")
        continue
        
      # filter for grades with a date less than or equal to the given time
      if datetime.datetime.strptime(grade['date'], '%m/%d/%Y').date() > time:
        continue
        
      class_name = grade['class']
      category = grade['category']
      
      if class_name not in class_category_groups:
        class_category_groups[class_name] = {}
      if category not in class_category_groups[class_name]:
        class_category_groups[class_name][category] = []
      class_category_groups[class_name][category].append(grade)
      
    except Exception as e:
      print(f"Error processing grade: {grade}")
      print(f"Error details: {str(e)}")
      continue
  
  # loop through each class/category group and get the grade for the given time
  for class_name, category_groups in class_category_groups.items():
    try:
      weight_sum = 0
      class_total = 0
      
      # Find matching class name case-insensitively
      matching_class = next((c for c in weights.keys() if c.lower() == class_name.lower()), None)
      if matching_class is None:
        print(f"Warning: Class '{class_name}' not found in weights. Available classes: {list(weights.keys())}")
        continue
        
      for category, grades in category_groups.items():
        grade = get_category_grade(grades)
        if grade is not False:  # Check explicitly since grade could be 0
          # Find matching category case-insensitively
          matching_category = next((c for c in weights[matching_class].keys() if c.lower() == category.lower()), None)
          if matching_category is None:
            print(f"Warning: Category '{category}' not found in weights for class '{class_name}'. Available categories: {list(weights[matching_class].keys())}")
            continue
            
          weight = weights[matching_class][matching_category]
          weight_sum += weight
          class_total += grade * weight
        else:
          print(f"Warning: Could not calculate grade for category '{category}' in class '{class_name}'")
      
      # get the grade for the class
      if weight_sum > 0:
        class_grades[class_name] = class_total/weight_sum
      else:
        print(f"Warning: No valid weighted grades found for class '{class_name}'")
        
    except Exception as e:
      print(f"Error calculating grade for class {class_name}: {str(e)}")
      continue
  
  if len(class_grades) == 0:
    print("Warning: No valid class grades could be calculated")
    return (100, {}) if return_class_grades else 100
  
  total_grade = sum(class_grades.values())/len(class_grades)
  if return_class_grades:
    return total_grade, class_grades
  return total_grade


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
  weights = get_weights(classes, session['user_data']['osis'])
  current_date = datetime.datetime.now().date()
  
  # Get raw average and current grades
  raw_avg, current_grades = calculate_grade(grades, weights, current_date, return_class_grades=True)
  
  # Filter out phys ed for both calculations
  academic_grades = {name: grade for name, grade in current_grades.items() if name.lower() != "phys ed"}
  
  # Raw average - weighted average of all academic classes, rounded to 2 decimals
  raw_avg = 0.0
  if academic_grades:
    raw_avg = round(sum(academic_grades.values()) / len(academic_grades), 2)

  # GPA - average of each class grade rounded to nearest percent
  rounded_grades = [round(grade) for grade in academic_grades.values()]
  gpa = 0.0
  if rounded_grades:
    gpa = round(sum(rounded_grades) / len(rounded_grades), 2)

  # calculate the grade from 30 days ago
  thirty_days_ago = current_date - datetime.timedelta(days=30)
 
  try:
    t30_avg, t30_grades = calculate_grade(grades, weights, thirty_days_ago, return_class_grades=True)
    t30_avg = round(t30_avg, 3)

    # Calculate the change in grades for each class
    grade_changes = {}
    for class_name, grade in current_grades.items():
      if class_name in t30_grades and class_name.lower() != "phys ed":
        grade_changes[class_name] = round(grade - t30_grades[class_name], 3)

    # Find the most improved class and most worsened class
    if grade_changes:
      most_improved_class = max(grade_changes, key=grade_changes.get)
      most_worsened_class = min(grade_changes, key=grade_changes.get)
    else:
      most_improved_class = "None"
      most_worsened_class = "None"
  except Exception as e:
    print(f"Error calculating 30-day changes: {str(e)}")
    t30_avg = raw_avg  # Default to current average if can't calculate past
    grade_changes = {}
    most_improved_class = "None"
    most_worsened_class = "None"

  # calculate the change in avg from the past 30 days
  avg_change = round(raw_avg - t30_avg, 2)

  # filter grades for only those from the past 30 days
  try:
    grades_past_30_days = [grade for grade in grades if datetime.datetime.strptime(grade['date'], '%m/%d/%Y').date() >= thirty_days_ago]
    past30_avg = calculate_grade(grades_past_30_days, weights, current_date)
    past30_avg = round(past30_avg, 2)
  except Exception as e:
    print(f"Error calculating past 30 days average: {str(e)}")
    past30_avg = raw_avg

  return {
    "gpa": gpa,
    "raw_avg": raw_avg,
    "avg_change": avg_change,
    "most_improved_class": most_improved_class,
    "most_worsened_class": most_worsened_class,
    "past30_avg": past30_avg,
    "t30_avg": t30_avg,
    "grade_changes": grade_changes
  }

def update_leagues(grades, classes):
  

  print("in update_leagues")
  # filter the leagues for those that the user is in and get all of the activities that need to be calculated
  leagues = get_user_data("Leagues")
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
  

def get_compliments(grades, classes, days=30):
  print("in get_compliments")
  
  now = datetime.datetime.now()
  start_date = now - datetime.timedelta(days=days)
  recent_grades = [grade for grade in grades if datetime.datetime.strptime(grade['date'], '%m/%d/%Y').date() >= start_date.date()]
  
  if len(recent_grades) < 3:
    if days < 90:
      return get_compliments(grades, classes, days + 15)
    return []
    
  weights = get_weights(classes, session['user_data']['osis'])
  compliments = []
  
  try:
    # Calculate impacts and add context for each grade
    for grade in recent_grades:
      impact = get_grade_impact(grade, grades, weights)
      grade['impact'] = impact
      
      # Calculate actual performance vs expected
      similar_grades = [g for g in grades 
                       if g['class'] == grade['class'] 
                       and g['category'] == grade['category']
                       and g != grade]  # Exclude current grade
      
      if similar_grades:
        avg_score = sum(float(g['score'])/float(g['value'])*100 for g in similar_grades) / len(similar_grades)
        current_score = float(grade['score'])/float(grade['value'])*100
        grade['relative_performance'] = current_score - avg_score
    
    # Sort by different metrics
    by_gpa_impact = sorted(recent_grades, key=lambda x: x['impact'][2], reverse=True)
    by_class_impact = sorted(recent_grades, key=lambda x: x['impact'][1], reverse=True)
    by_relative_perf = sorted(recent_grades, key=lambda x: x.get('relative_performance', 0), reverse=True)
    
    # 1. Significant positive impact on class grade
    if by_class_impact and by_class_impact[0]['impact'][1] > 1:  # Only if improved by >1%
      grade = by_class_impact[0]
      compliments.append(
        f"Great work on {grade['name']} in {grade['class']}! "
        f"This improved your {grade['class']} grade by {round(grade['impact'][1], 1)}%."
      )
    
    # 2. Strong performance relative to history
    if by_relative_perf and by_relative_perf[0]['relative_performance'] > 10:  # Only if >10% better than average
      grade = by_relative_perf[0]
      compliments.append(
        f"Excellent job on {grade['name']}! "
        f"Your score of {round(float(grade['score'])/float(grade['value'])*100, 1)}% is "
        f"{round(grade['relative_performance'], 1)}% higher than your typical performance "
        f"in {grade['class']} {grade['category']}."
      )
    
    # 3. Strong absolute performance
    high_scores = [g for g in recent_grades 
                  if float(g['score'])/float(g['value'])*100 >= 95]  # Look for excellent scores
    if high_scores:
      grade = max(high_scores, key=lambda x: float(x['score'])/float(x['value']))
      compliments.append(
        f"Outstanding achievement on {grade['name']} in {grade['class']}! "
        f"You scored {round(float(grade['score'])/float(grade['value'])*100, 1)}%."
      )
    
    # 4. Improvement trend
    class_trends = {}
    for grade in recent_grades:
      if grade['class'] not in class_trends:
        class_grades = [g for g in recent_grades if g['class'] == grade['class']]
        if len(class_grades) >= 4:  # Require more grades for trend
          early_grades = class_grades[:len(class_grades)//2]
          late_grades = class_grades[len(class_grades)//2:]
          early_avg = sum(float(g['score'])/float(g['value'])*100 for g in early_grades) / len(early_grades)
          late_avg = sum(float(g['score'])/float(g['value'])*100 for g in late_grades) / len(late_grades)
          class_trends[grade['class']] = late_avg - early_avg
    
    if class_trends:
      best_trend = max(class_trends.items(), key=lambda x: x[1])
      if best_trend[1] > 5:
        compliments.append(
          f"Your dedication to {best_trend[0]} is showing results! "
          f"Your recent grades are averaging {round(best_trend[1], 1)}% higher "
          f"than before."
        )
    
    # 5. Consistent strong performance in a category
    for grade in recent_grades:
      category_grades = [
        g for g in recent_grades 
        if g['class'] == grade['class'] 
        and g['category'] == grade['category']
      ]
      if len(category_grades) >= 3:
        avg_score = sum(float(g['score'])/float(g['value'])*100 for g in category_grades) / len(category_grades)
        if avg_score >= 90:
          compliments.append(
            f"Excellent work in {grade['class']} {grade['category']}! "
            f"You're maintaining an average of {round(avg_score, 1)}% across "
            f"{len(category_grades)} assignments."
          )
          break
    
    # Filter and return unique compliments
    compliments = list(set(c for c in compliments if c))
    return compliments[:5]
    
  except Exception as e:
    print(f"Error generating compliments: {str(e)}")
    return []

def get_grade_impact(grade, grades, weights):
  try:
    category_weight = weights[grade['class'].lower()][(grade['category'].lower())]
    num_classes = len(weights)
    grade_score = float(grade['score'])
    grade_value = float(grade['value'])
    grade_date = datetime.datetime.strptime(grade['date'], '%m/%d/%Y').date()
    
    # Get all grades for this class/category up to and including this grade's date
    class_category_grades = [
      g for g in grades 
      if g['category'] == grade['category'] 
      and g['class'] == grade['class']
      and datetime.datetime.strptime(g['date'], '%m/%d/%Y').date() <= grade_date
    ]
    
    # Calculate grade just before this assignment
    earlier_grades = [g for g in class_category_grades if g != grade]
    score_sum = sum(float(g['score']) for g in earlier_grades)
    value_sum = sum(float(g['value']) for g in earlier_grades)
    
    if value_sum == 0:
      prev_category_grade = 0
    else:
      prev_category_grade = (score_sum/value_sum) * 100
      
    # Calculate category grade including this assignment
    new_score_sum = score_sum + grade_score
    new_value_sum = value_sum + grade_value
    if new_value_sum == 0:
      new_category_grade = 0
    else:
      new_category_grade = (new_score_sum/new_value_sum) * 100
      
    # Calculate impacts
    cat_impact = new_category_grade - prev_category_grade
    class_impact = cat_impact * category_weight
    GPA_impact = class_impact/num_classes
    
    # Calculate next grade needed for improvement
    if new_value_sum > 0:
      current_grade = new_category_grade
      next_mult = math.ceil(current_grade * 2) / 2  # Round up to next 0.5
      if next_mult <= current_grade:
        next_mult += 0.5
      next_grade = ((next_mult * (new_value_sum + grade_value)/100) - new_score_sum)
    else:
      next_mult = 100
      next_grade = 100
      
    return [cat_impact, class_impact, GPA_impact, next_grade, next_mult]
    
  except Exception as e:
    print(f"Error calculating grade impact: {str(e)}")
    return [0, 0, 0, 0, 0]


