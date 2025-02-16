from flask import render_template, redirect, Blueprint, send_from_directory, session, url_for, request
from functools import wraps

from database import *
from classroom import *
from grades import *
from jupiter import *
from study import *
from prompts import *

page_init = Blueprint('page_init', __name__)

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_data' not in session:
            # Store the requested URL for redirecting after login
            next_url = request.url
            # Only store redirect for non-exempt pages
            return redirect(url_for('page_init.Login', redirect=next_url))
        return f(*args, **kwargs)
    return decorated_function


#initialize the front end: all of the HTML/CCS/JS files
@page_init.route('/')
@login_required
def index():
    return render_template('index.html')


@page_init.route('/GradeAnalysis')
@login_required
def Grade_analy():
  return render_template('GradeAnalysis.html')


@page_init.route('/Login')
def Login():
    return render_template('login.html')


@page_init.route('/EnterGrades')
@login_required
def EG():
  return render_template('EnterGrades.html')


@page_init.route('/Goals')
@login_required
def Goals():
  return render_template('Goals.html')


@page_init.route('/Profile')
@login_required
def profile():
  return render_template('Profile.html')


@page_init.route('/Pitch')
def pitch():
  return render_template('About/Pitch.html')

@page_init.route('/StudyBot')
def study():
  return render_template('StudyBot.html')

@page_init.route('/Levels')
def study_levels():
  return render_template('Levels.html')


@page_init.route('/Diagnostic')
def diagnostic():
  return render_template('Diagnostic.html')

@page_init.route('/Evaluate')
def evaluate():
  return render_template('Evaluate.html')

@page_init.route('/GuideBuilder')
def guide_builder():
  return render_template('guidebuilder.html')

@page_init.route('/Inspire')
def inspire():
  return render_template('inspire.html')

@page_init.route('/Battle')
def battle():
  return render_template('Battles.html')

@page_init.route('/Classes')
def classes():
  return render_template('Classes.html')

@page_init.route('/Leagues')
def leagues():
  return render_template('Leagues.html')

@page_init.route('/Notebook')
def notebook():
  return render_template('notebook.html')

@page_init.route('/GetStart')
def getstart():
  return render_template('GetStart.html')

@page_init.route('/Terms')
def terms():
  return render_template('terms.html')

@page_init.route('/Assignments')
def assignments():
  return render_template('Assignments.html')

@page_init.route('/CourseSelection')
def course_selection():
  return render_template('CourseSelection.html')

@page_init.route('/Messages')
def messages():
  return render_template('messages.html')

@page_init.route('/StudyFreeform')
def study_freeform():
  return render_template('study.html')

@page_init.route('/Join')
def join():
  return render_template('About/Join.html')

@page_init.route('/Team')
def team():
  return render_template('About/Team.html')

@page_init.route('/Schedule')
def schedule():
  return render_template('schedule.html')

@page_init.route('/StudyHub')
def study_hub():
    return render_template('StudyHub.html')

@page_init.route('/PromptLibrary')
def prompt_library():
    return render_template('PromptLibrary.html')

@page_init.route('/simulations/Springs')
def springs_simulation():
    return render_template('Springs.html')

@page_init.route('/Derive')
@page_init.route('/derive')
def derive():
    return render_template('Derive.html')

@page_init.route('/Maps')
def maps():
    return render_template('Maps.html')

@page_init.route('/Meeting')
def meeting():
    return render_template('meeting.html')
@page_init.route('/MapBuilder')
def map_builder():
    return render_template('MapBuilder.html')

@page_init.route('/TodoTree')
def todo_tree():
    return render_template('TodoTree.html')

@page_init.route('/TodoList')
def todo_list():
    return render_template('TodoList.html')

@page_init.route('/Tutoring')
def tutoring():
    return render_template('tutoring.html')

@page_init.route('/DailyCheckin')
@login_required
def daily_checkin():
    return render_template('DailyCheckin.html')

# @app.route('/Features/AI')
# def ai_features():
#   return render_template('About/AI.html')

# @app.route('/Features/Social')
# def social_features():
#   return render_template('About/Social.html')

# @app.route('/Features/Analytic')
# def analytic_features():
#   return render_template('About/Analytic.html')
  
@page_init.route('/ComingSoon')
def coming_soon():
  return render_template('ComingSoon.html')

@page_init.route('/firebase-messaging-sw.js')
def service_worker():
    return send_from_directory('.', 'firebase-messaging-sw.js')

@page_init.errorhandler(404)
def page_not_found(e):
    # note that we set the 404 status explicitly
    return render_template('ComingSoon.html'), 404

# The following routes are pages for specific classes and assignments
@page_init.route('/class/<classid>')
@login_required
def class_page(classid):
    # Get class data using just the ID
    classes = get_user_data("Classes")
    # get the last 4 characters of the classid
    classid = classid[-4:]
    # Print debug information
    print(f"Looking for class ID: {classid}")
    print(f"Available classes: {[{str(c['id']): c['name']} for c in classes]}")
    
    # Convert both IDs to strings and strip any whitespace for comparison
    class_data = next((row for row in classes if str(row['id']).strip() == str(classid).strip()), None)
    
    if not class_data:
        print(f"Class not found for ID: {classid}")
        return redirect('/dashboard')
    
    print(f"Found class: {class_data['name']}")
    
    # Get class name from the data
    class_name = class_data.get('name', '')
    
    # Handle class image
    if 'img' in class_data and class_data['img']:
        try:
            # Convert image ID to string and ensure it's clean
            img_id = str(class_data['img']).strip()
            # class_data['img'] = download_file("sciweb-files", img_id)
        except Exception as e:
            print(f"Error loading class image: {e}")
            class_data['img'] = None
    
    return render_template('class.html',
                         class_name=class_name,
                         class_data=class_data)



# League page, for specific leagues
@page_init.route('/league/<leagueid>')
@login_required
def league_page(leagueid):
  leagues = get_user_data("Leagues")
  league_data = next(
    (row for row in leagues if int(row['id']) == int(leagueid)), None)
  league_name = league_data['Name']
  return render_template('league.html',
                         league_name=league_name)

# Assignment page, for specific assignments
@page_init.route('/assignment/<assignmentid>')
@login_required
def assignment_page(assignmentid):
  classes_data = get_user_data("Classes")
  assignments_data = get_user_data("Assignments", {"Classes": classes_data})
  osis = str(session['user_data']['osis'])
  assignment_data = next((row for row in assignments_data if str(row['id']) == str(assignmentid)), None)
  print("assignment_data", assignment_data, "osis", osis)
  # if assignment_data.difficulty.user_data['osis'] exists, set it to the user's difficulty
  diff = assignment_data['difficulty'].get(osis, "") if 'difficulty' in assignment_data else ""
  ts = assignment_data['time_spent'].get(osis, "") if 'time_spent' in assignment_data else ""
  pc = assignment_data['completed'].get(osis, "") if 'completed' in assignment_data else ""
  print("diff", diff, "ts", ts, "pc", pc)

  return render_template('assignment.html', assignment=assignment_data, diff=diff, ts=ts, pc=pc)


@page_init.route('/users/<userid>')
def public_profile(userid):
  users = get_data("Users")
  profiles = get_data("Profiles")
  
  # Get user data first
  user_data = next(
    ([row['first_name'], row['last_name'], row['grade'], row['osis']] for row in users if str(row['osis']) == str(userid)), None)
  
  # If user doesn't exist at all, return 404
  if user_data is None:
    return render_template('404.html'), 404
    
  profile = next((row for row in profiles if str(row['OSIS']) == str(userid)), None)
  
  # If profile exists, get class data if showClasses is true
  class_data = ""
  if profile and 'showClasses' in profile and profile['showClasses'] == "TRUE":
    classes = get_user_data("Classes")
    class_data = [row for row in classes if str(userid) in row['OSIS']]
    class_data = "Classes: " + ", ".join([row['name'] for row in class_data])
    
  return render_template('pubProf.html',
                       profile=profile,
                       user_data=user_data,
                       classes=class_data)

@page_init.route('/reviews/<courseid>')
def course_reviews(courseid):
  courses = get_user_data("Courses")
  course_data = next((row for row in courses if row['id'] == courseid), None)
  # convert course_data to json
  course_data = json.loads(json.dumps(course_data))
  return render_template('course_reviews.html',
                         courseData=course_data, courseName=course_data['Name'])

@page_init.route('/battle/<battleid>')
def battle_page(battleid):
  return render_template('battle.html')

@page_init.route('/Security')
def security():
    return render_template('Security.html')

@page_init.route('/BetaTester')
def beta_tester():
    return redirect('https://docs.google.com/forms/d/e/1FAIpQLScJG1bzeTOFa5dXEQUmCOJTAWMhtEWhSASPkQcRO4dwH2_o8Q/viewform?usp=dialog')

