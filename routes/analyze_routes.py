from flask import Blueprint, request, jsonify
import traceback
from datetime import datetime, timedelta
from pydantic import BaseModel

from database import *
from classroom import *
from grades import *
from jupiter import *
from study import *

from prompts import *


analyze_routes = Blueprint('analyze_routes', __name__)

# Split into auth and stream endpoints
@analyze_routes.route('/jupiter_auth', methods=['POST'])
def jupiter_auth():
    data = request.get_json()
    # Store the credentials in session

    session['jupiter_creds'] = {
        'osis': data.get('osis'),
        'password': data.get('password'),
        'addclasses': data.get('addclasses'),
        'updateLeagues': data.get('updateLeagues')
    }
    print("jupiter_creds", session['jupiter_creds'])
    return jsonify({'status': 'ok'})

@analyze_routes.route('/jupiter_process_classes', methods=['POST'])
def jupiter_process_classes():
    creds = session.get('jupiter_creds', {})

    if not creds:
        return jsonify({'error': 'Not authenticated'}), 401
        
    try:
        classes = run_puppeteer_script(creds['osis'], creds['password'])
        
        if classes == "WrongPass":
            return jsonify({'error': 'Incorrect credentials'})

        # Get the classes and tokens data
        class_data = get_data("Classes")
        tokens_data = get_data("Tokens")
        
        if str(creds['addclasses']).lower() == "true":
            classes_added = jupapi_output_to_classes(classes, class_data)
            notify_new_member(classes_added, tokens_data)
            
        return jsonify({'status': 'success', 'classes': classes})
        
    except Exception as e:
        return jsonify({'error': str(e)})

@analyze_routes.route('/jupiter_process_grades', methods=['POST'])
def jupiter_process_grades():
    creds = session.get('jupiter_creds', {})

    if not creds:
        return jsonify({'error': 'Not authenticated'}), 401
        
    try:
        classes = request.json.get('classes')
        if not classes:
            return jsonify({'error': 'No classes data provided'})
            
        # Get the classes and tokens data
        class_data = get_data("Classes")
        tokens_data = get_data("Tokens")
        
        grades = jupapi_output_to_grades(classes)
        check_new_grades(grades, class_data, tokens_data)
        
        if confirm_category_match(grades, class_data):
            jupapi_output_to_classes(classes, class_data)

        if str(creds['updateLeagues']).lower() == "true":
            update_leagues(grades, classes)
            
        return jsonify({'status': 'success', 'grades': grades})
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)})
    

class inspire_format(BaseModel):
    video_name: str
    video_url: str

@analyze_routes.route('/inspire', methods=['POST'])
def inspire_handler():
  data = request.json
  print("data", data)

  video = run_inspire(data['data'], inspire_format)
  return json.dumps({"data": video})


#function to generate insights and return them to the Grade Analysis page
@analyze_routes.route('/GAsetup', methods=['POST'])
def GA_setup():
  from database import get_name
  try:
    data = request.json

    if not data:
      return json.dumps({"error": "No data provided"})
      
    # Validate required data is present
    required_fields = ['Classes', 'Grades', 'Goals', 'Distributions']
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
      return json.dumps({"error": f"Missing required fields: {missing_fields}"})
    
    # get the user's grades and classes
    classes = data['Classes']
    if not classes:
      return json.dumps({"error": "No classes data provided"})
      
    user_data = get_name()
    if not user_data:
      return json.dumps({"error": "Could not get user data"})
      
    # Get weights first to validate class setup
    weights = get_weights(classes, session['user_data']['osis'])
    if not weights:
      return json.dumps({"error": "No valid class weights found. Please check your class grading categories."})
    
    grades = data['Grades']
    goals = data['Goals']
    distributions = data['Distributions']
    
    # Validate grades data
    if isinstance(grades, dict) and grades.get('class') == 'No grades entered':
      print("No grades found in GA_setup")
      return json.dumps({"error": "Enter your grades before analyzing them"})
    
    if not grades:
      print("Key prefix mismatch in GA_setup")
      return json.dumps({"error": "Grade Access not authenticated. Try reloading the page, then repulling your grades."})
      
    # filter goals for the user's osis
    goals = [item for item in goals if str(session['user_data']['osis']) in str(item['OSIS'])]
    
    #filter classes for the user's osis
    classes = [item for item in classes if str(session['user_data']['osis']) in str(item['OSIS'])]
    if not classes:
      return json.dumps({"error": "No classes found for user"})
    
    try:
      # Get stats and compliments
      stats = get_stats(grades, classes)
      if not stats:
        return json.dumps({"error": "Could not calculate grade statistics"})
        
      compliments = get_compliments(grades, classes)
      
      # Process grades
      ordinal_dated_grades = []
      for grade in grades:
        try:
          ordinal_dated_grades.append({
            "date": datetime.strptime(grade['date'], "%m/%d/%Y").toordinal(),
            "value": grade['value'],
            "class": grade['class'],
            "category": grade['category'],
            "score": grade['score'],
            "name": grade['name']
          })
        except Exception as e:
          print(f"Error processing grade for ordinal date: {grade}")
          print(f"Error details: {str(e)}")
          continue
      
      if not ordinal_dated_grades:
        return json.dumps({"error": "No valid grades found after date conversion"})
      
      # Calculate grade impacts
      for grade in ordinal_dated_grades:
        try:
          grade_impact = get_grade_impact(grade, grades, weights)
          grade['cat_impact'] = grade_impact[0]
          grade['class_impact'] = grade_impact[1]
          grade['GPA_impact'] = grade_impact[2]
        except Exception as e:
          print(f"Error calculating grade impact: {grade}")
          print(f"Error details: {str(e)}")
          continue
      
      # Setup grade spreads
      grade_spreads = {}
      cat_value_sums = {}
      categories = []
      
      # Calculate time range
      try:
        times = [datetime.strptime(grade['date'], "%m/%d/%Y").toordinal() for grade in grades]
        if not times:
          return json.dumps({"error": "No valid dates found in grades"})
          
        min_date = datetime.fromordinal(min(times))
        max_date = datetime.fromordinal(max(times))
        times = [(min_date + timedelta(days=i*(max_date-min_date).days/10)).toordinal() for i in range(11)]
      except Exception as e:
        print(f"Error calculating time range: {str(e)}")
        return json.dumps({"error": "Could not calculate grade time range"})
      
      # Process grades for each class and category
      for c in weights:
        grade_spreads[c] = {}
        cat_value_sums[c] = {}
        for category in weights[c]:
          if category not in categories:
            categories.append(category)
          g = process_grades(grades, c, category, times)
          if g:
            grade_spreads[c][category] = g
      
      if not any(grade_spreads.values()):
        return json.dumps({"error": "No valid grade spreads could be calculated"})
      
      # Create response data
      response_data = {
        "times": times,
        "grade_spreads": grade_spreads,
        "grades": ordinal_dated_grades,
        "Weights": weights,
        "categories": categories,
        "stats": stats,
        "compliments": compliments,
        "cat_value_sums": cat_value_sums,
        "goals": goals,
        "distributions": distributions
      }
      
      return json.dumps(response_data)
      
    except Exception as e:
      error_message = traceback.format_exc()
      print("Error in grade analysis:", error_message)
      # post error message to Errors sheet in the database
      post_data("Errors", {
        "error": f"Error in grade analysis: {error_message}",
        "OSIS": user_data['osis'],
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
      })
      return json.dumps({
        "error": "An error occurred while analyzing your grades. Please try again or contact support if the problem persists.",
        "details": str(e)
      })
      
  except Exception as e:
    error_message = traceback.format_exc()
    print("Error in GA_setup:", error_message)
    return json.dumps({
      "error": "An unexpected error occurred. Please try again or contact support if the problem persists.",
      "details": str(e)
    })
  
@analyze_routes.route('/impact', methods=['POST'])
def get_impact():
  data = request.json
  

  grades = 'temporarily unavailable'
  classes = get_user_data("Classes")
  category_grades = filter_grades(grades, session['user_data'], [data['class'], data['category']])
  
  weights = get_weights(classes, session['user_data']['osis'])
  #get current date
  current_date = datetime.now().date()
  #get grade at current date
  current_grade = calculate_grade(category_grades, weights, current_date)
  print("current_grade", current_grade)
  #get total number of points from all grades in the category
  total_points = sum([int(grade['value']) for grade in category_grades])
  print("total_points", total_points)
  return json.dumps({"current_grade": current_grade, "total_points": total_points, "category_weight": weights[data['class'].lower()][data['category'].lower()]})
