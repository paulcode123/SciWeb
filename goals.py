from database import get_data
from grades import get_weights, calculate_grade, get_min_max, filter_grades
from jupiter import get_grades
import datetime
import numpy as np

def calculate_goal_progress(session):
  # This function calculates the progress toward each of the user's goals
  # It returns a list of dictionaries, each containing grade/date when set, goal grade/date, current grade/date, and the class/category of the goal
  goals = get_data("Goals")
  goals = filter_goals(goals, session['user_data'], 'any')
  classes = get_data("Classes")
  grades = get_grades(session)
  weights = get_weights(classes)
  progress = []
  for goal in goals:
    #filter grades for matching user osis
    
    goal_grades = filter_grades(grades, session['user_data'], [goal['class'], goal['category']])

    date_set = datetime.datetime.strptime(goal['date_set'], '%m/%d/%Y').date()
    grade_when_set = calculate_grade(date_set, goal_grades, weights)
    goal_date = datetime.datetime.strptime(goal['date'], '%m/%d/%Y').date()
    goal_grade = float(goal['grade'])
    current_date = datetime.datetime.now().date()
    current_grade = calculate_grade(current_date, goal_grades, weights)

    percent_time_passed = (current_date - date_set).days / (goal_date - date_set).days if (goal_date - date_set).days != 0 else 0
    grade_change = current_grade - grade_when_set
    percent_grade_change = grade_change / (goal_grade - grade_when_set) if goal_grade - grade_when_set != 0 else 0
    percent_grade_change = round(percent_grade_change, 3)
    print("pgc", percent_grade_change)
    current_grade_trajectory = grade_when_set + (current_grade - grade_when_set) / percent_time_passed if percent_time_passed != 0 else current_grade
    
    print("goal_grade", goal_grade, "current_grade", current_grade, "grade change", grade_change, "grade_when_set", grade_when_set, "current_grade_trajectory", current_grade_trajectory)
    progress.append({'date_set': str(date_set), 'grade_when_set': grade_when_set, 'goal_date': str(goal_date), 'goal_grade': goal_grade, 'current_grade': current_grade, 'current_date': str(current_date), 'current_grade_trajectory': current_grade_trajectory, 'class': goal['class'], 'category': goal['category'], 'percent_time_passed': percent_time_passed, 'percent_grade_change': percent_grade_change, 'grade_change': grade_change})
  return progress
# Use the Goal data to create icons to be overlayed on the graph in the Grade Analysis page
def get_goals(classes, user_data, grades, times, grade_spread, extend_to_goals=False):
  
  goal_coords = []
  goal_set_coords = []
  goals = get_data('Goals')
  print(len(goals), len(grades))
  if len(goals) == 0 or len(grades) == 0:
    return [], [], 404
  # Get the minimum and maximum dates of the user's grades
  min_date, max_date, x = get_min_max(grades, user_data, classes, True)
  print("min_date", min_date, "max_date", max_date)
  min_date = datetime.datetime.combine(min_date, datetime.time())
  max_date = datetime.datetime.combine(max_date, datetime.time())
  
  #filter goals for matching osis matching user osis and classes among those being graphed
  goals = filter_goals(goals, user_data, classes)

  # Create a rectangle for each goal to overlay on the graph
  for goal in goals:
    grade = float(goal['grade'])
    y0 = grade - 0.15
    if y0 > 99.7:
      y0 = 99.7
    
    date_string = goal['date']
    date_set_string = goal['date_set']
    # Convert the date and date_set to datetime objects(dtos)
    date_dto = datetime.datetime.strptime(date_string, '%m/%d/%Y')
    date_set_dto = datetime.datetime.strptime(date_set_string, '%m/%d/%Y')

    #convert to ordinal
    date_ordinal = date_dto.toordinal()
    date_set_ordinal = date_set_dto.toordinal()

    #remove all instances of 'none' from grade_spread
    grade_spreadc = [float(grade) for grade in grade_spread if grade != 'none']

    #make times and grade_spreadc the same length by removing the last elements of times
    timesc = times[:len(grade_spreadc)]
   #calculate grade when set given grades and times: interpolate
    print("date_set_ordinal", date_set_ordinal, "times", timesc, "grades", grade_spreadc)
    grade_when_set = np.interp(date_set_ordinal, timesc, grade_spreadc)
    
    
    gZ = {
      'x': date_ordinal, # The x-coordinate (date) for the goal
      'y': y0, # The y-coordinate (grade or value) for the goal
      'xref': 'x',
      'yref': 'y',
      'yanchor': 'bottom',
      'sizex': 30,
      'sizey': 0.9,
      'text': '',
      'source': '/static/media/GoalMedal.png'
    }
    

    goal_coords.append(gZ)
    goal_set_coords.append([date_set_ordinal, grade_when_set])
  
  #get max date of any goal in goals
  if len(goals) > 0 and extend_to_goals:
    max_date = max([datetime.datetime.strptime(goal['date'], '%m/%d/%Y') for goal in goals])
    return goal_coords, goal_set_coords, str(max_date)
  
  return goal_coords, goal_set_coords, 404


# Filter function for goals
def filter_goals(goals, user_data, classes):
  goals = [
    goal for goal in goals
    if (goal['OSIS'] == user_data['osis']) and ((
      goal['class'] in classes) and (goal['category'] in classes) or classes=='any')
  ]
  return goals
