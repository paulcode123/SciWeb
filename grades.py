from database import get_data
import datetime
import numpy as np
import json

#filter grades for those matching user osis and classes among those being graphed
def filter_grades(grades, user_data, classes):
  # check if grades is empty
  if len(grades) == 0 or (type(grades) == 'dict' and grades['date']=="1/1/2021"):
    print("no grades passed into filter_grades()")
    return []
  try:
    #filter grades for matching osis'
    grades = [grade for grade in grades if grade['OSIS'] == user_data['osis']]
    if len(grades) == 0:
      print("no grades match osis")
      return []
  except TypeError:
    print(grades)
  
  #filter grades for matching classes
  classes = [c.lower() if c != "All" else c for c in classes]

    
  grades = [
    grade for grade in grades
    if ((grade['class'].lower() in classes) or ('all' in classes)) and ((grade['category'].lower() in classes) or ('All' in classes))
  ]

  # grades = []
  # for grade in grades:
  #   for c in classes:
  #     if ((c.lower() == grade['class'].lower()) or (c == 'all')) and ()
  #       grades.append(grade)
    
  return grades


# Get the minimum and maximum dates of the user's grades
def get_min_max(grades, user_data, classes, extend_to_goals=False, interval=10):
    from goals import filter_goals
    
    grades = filter_grades(grades, user_data, classes)
    goals = get_data("Goals")
    print("len(grades)", len(grades), "len goals", len(goals))
    if len(grades) == 0 or len(goals) == 0:
        return 0,0,0
    # If min and max dates include goals, then add goal dates to the list of dates
    if extend_to_goals:
      # This should be changed to only include goals for the classes being graphed
      user_goals = filter_goals(goals, user_data, classes)
      goal_dates = [
          datetime.datetime.strptime(goal['date'], '%m/%d/%Y').date() for goal in user_goals
      ]
      
    #get dates from grades
    print(grades[0])
    dates = [
        datetime.datetime.strptime(grade['date'], '%m/%d/%Y').date() for grade in grades
    ]
    if extend_to_goals:
      dates.extend(goal_dates)  # Include goal dates in the list

    if len(dates) == 0:
        print("error: no grades found")
        return 0, 0, 0
    min_date = min(dates)
    max_date = max(dates)
    print("max_date", max_date)
    print("new_max_date", max_date + datetime.timedelta(days=(((max_date-min_date).days)/interval)))
    #11/30
    #11/6
    max_date = max_date + datetime.timedelta(days=(((max_date-min_date).days)/interval))
    if min_date == max_date:
        max_date = max_date + datetime.timedelta(days=5)
    return min_date, max_date, grades

def get_weights(classes_data, osis):
  #convert grading categories in classes data to weights
  weights = {}

  for class_info in classes_data:
    # if osis does not match user data, continue
    if not str(osis) in class_info['OSIS']:
      continue
    name = class_info['name'].lower()
    categories_str = class_info['categories'].lower()
    
    # Parse the JSON-like string into a Python list
    categories = json.loads(categories_str)
    
    # Create a dictionary to store weights
    weight_dict = {}
    
    # Iterate over the list in pairs (category, weight)
    for i in range(0, len(categories), 2):
        category = categories[i]
        weight = categories[i + 1] / 100.0  # Convert the percentage to a decimal
        
        weight_dict[category.lower()] = weight
    
    weights[name.lower()] = weight_dict
  return weights

# Calculate the user's grades over time
def process_grades(grades, classes, user_data, classes_data, interval=10):
  #filter grades based on class
  grades = filter_grades(grades, user_data, classes)
  # Get the minimum and maximum dates of the user's grades and goals
  min_date, max_date, z = get_min_max(grades, user_data, classes, True, interval)
  #Get the minium and maximum dates of just the user's grades
  mi, mx, g = get_min_max(grades, user_data, classes)
  if min_date == 0:
    return 0, []
  # Generate 10 evenly spaced dates between the minimum and maximum dates
  date_range = np.linspace(min_date.toordinal(),
                           max_date.toordinal(),
                           num=interval,
                           dtype=int)
  evenly_spaced_dates = [datetime.date.fromordinal(d) for d in date_range]
  #Throw out the dates that are past mx, the maximum date of the user's grades
  evenly_spaced_dates = [date for date in evenly_spaced_dates if date <= mx]

  weights = get_weights(classes_data, user_data['osis'])

  # get grades for each date
  grade_spread = []
  for date in evenly_spaced_dates:
    grade_spread.append(calculate_grade(date, grades, weights))

  # add "none" values to the end of the grade spread to make it the same length as the date range
  while len(grade_spread) < interval:
    grade_spread.append('none')

  return date_range, grade_spread

# Calculate grade at given date
def calculate_grade(time, data, weights):
  categories = {}
  
  # For each assignment(with grade) in the data...
  for datum in data:
    #get the date of the grade
    grade_time = datetime.datetime.strptime(datum['date'], '%m/%d/%Y').date()
    # If the date of the grade is after the date we're calculating the grade for, skip it
    if time < grade_time:
      continue
    # If the class has not yet been added to the categories dictionary, add it
    if datum["class"] not in categories:
      categories[datum["class"]] = {}
    # If the category has not yet been added to the class's dictionary, add it, and initialize the category's data
    if datum["category"] not in categories[datum["class"]]:
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

  if classCount > 0:

    return totalGrade * 100 / classCount
  else:
    return 0

def get_grade_points(grades, user_data, classes):
  #Get the ordinal date and score/value of every grade in the given classes
  grades = filter_grades(grades, user_data, classes)
  weights = get_weights(get_data('Classes'), user_data['osis'])
  print("weights", weights)
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