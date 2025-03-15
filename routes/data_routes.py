from flask import Blueprint, request
import hashlib
import traceback

from database import *
from classroom import *
from grades import *
from jupiter import *
from study import *
from prompts import *


data_routes = Blueprint('data_routes', __name__)




# This function is called from many JS files to get data from specific sheets
# The requested sheets are passed in as a list: eg. "Grades, Classes"
# It returns the data from the requested sheet
@data_routes.route('/data', methods=['POST'])
def fetch_data():

    data = request.json
    sheets = data['data']
    response = data.get('prev_sheets', {})  # Get prev_sheets from request
    
    # Split the requested sheets into a list
    sheets = sheets.split(", ")

    for sheet in sheets:
        response[sheet] = get_user_data(sheet, response)
    return json.dumps(response)

@data_routes.route('/post_data', methods=['POST'])
def post_data_route():
  data = request.json

  post_data(data['sheet'], data['data'])
  return json.dumps({"message": "success"})

@data_routes.route('/update_data', methods=['POST'])
def update_data_route():
  data = request.json

  response = update_data(data['row_value'], data['row_name'], data['data'], data['sheet'])
  print("response", response)
  return json.dumps({"message": "success"})

@data_routes.route('/delete_data', methods=['POST'])
def delete_data_route():
  data = request.json

  delete_data(data['row_value'], data['row_name'], data['sheet'])
  return json.dumps({"message": "success"})

@data_routes.route('/get-file', methods=['POST'])
def get_file():
    try:
        data = request.json

        if not data or 'file' not in data:
            return json.dumps({"error": "Missing file ID"}), 400
            
        # Get the file from the bucket
        file_data = download_file("sciweb-files", data['file'])
        if not file_data:
            return json.dumps({"error": "File not found"}), 404
            
        # Extract type from metadata if present
        file_type = 'application/octet-stream'
        if file_data.startswith('data'):
            type_end = file_data.find('base64')
            if type_end > 4:  # 'data' length is 4
                file_type = file_data[4:type_end]
                file_data = file_data[type_end + 6:]  # Skip 'base64' part
                
        return json.dumps({
            "file": file_data,
            "type": file_type
        })
    except Exception as e:
        print(f"Error retrieving file: {str(e)}")
        return json.dumps({"error": str(e)}), 500

@data_routes.route('/upload-file', methods=['POST'])
def upload_file_route():
    try:

        data = request.json
        if not data or 'file' not in data or 'name' not in data:
            return json.dumps({"error": "Missing file or name"}), 400
            
        base64_data = data['file']
        file_name = data['name']
        file_type = data.get('type', 'application/octet-stream')
        
        # Ensure proper base64 padding
        padding = 4 - (len(base64_data) % 4)
        if padding != 4:
            base64_data += '=' * padding
            
        # Upload the file to the bucket with type information
        metadata = f"data{file_type}base64"
        upload_file("sciweb-files", base64_data, file_name, metadata)
        return json.dumps({"message": "success"})
    except Exception as e:
        print(f"Error uploading file: {str(e)}")
        return json.dumps({"error": str(e)}), 500



#When the user logs in, their data is posted to the Users sheet
@data_routes.route('/post-login', methods=['POST'])
def postLogin(): 
  raw_data = request.json

  data = raw_data['data']
  mode = raw_data['mode']
  session['ip_add'] = data['IP']
  logins = get_data("Users")
  # hashed password
  unhashed_password = data['password']
  data['password'] = hashlib.sha256(unhashed_password.encode()).hexdigest()
      
  # if the user has logged in before, update their IP address
  if mode == "Login":    
    for row in logins:
      # If the user's osis is already in the Users sheet...
      if not 'password' in row:
        print("no password in row", row)
      if (row['password'] == data['password'] or row['password'] == unhashed_password) and row['first_name'] == data['first_name']:
        # Add their new IP address to the list of IP addresses
        row['IP'] = f"{session['ip_add']}, {row['IP']}"
        
        update_data(row['password'], 'password', row, "Users")
        session['user_data'] = row
        return json.dumps({"data": "success"})
    return json.dumps({"data": "failure"})
  
  # If the user has not logged in before, add their data to the Users sheet
  session['user_data'] = data
  post_data("Users", data)
  
  # Send welcome email for new signups
  if 'email' in data and data['email']:
    send_welcome_email(data['email'], data['first_name'])
  
  return json.dumps({"data": "success"})

# /send_notification route
@data_routes.route('/send_notification', methods=['POST'])
def send_notification_route():
  data = request.json
  

  # convert list of OSIS to their tokens
  tokens = get_data("Tokens", row_name="OSIS", row_val=data['OSIS'], operator="in")
  for token in tokens:
    send_notification(token['token'], data['title'], data['body'], data['url'])
  return json.dumps({"message": "success"})


@data_routes.route('/schedule_notification', methods=['POST'])
def schedule_notification_route():
    data = request.json

    data=data['data']
    print("Received data:", data)
    
    # Validate required fields
    required_fields = ['OSIS', 'title', 'body', 'scheduled_time']
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        error_msg = f"Missing required fields: {', '.join(missing_fields)}"
        print(error_msg)
        return json.dumps({"error": error_msg}), 400
        
    try:
        # Validate scheduled_time format
        try:
            # Convert to datetime to validate format
            scheduled_time = datetime.fromisoformat(data['scheduled_time'].replace('Z', '+00:00'))
            # Convert back to ISO format string
            data['scheduled_time'] = scheduled_time.isoformat()
        except ValueError as e:
            error_msg = f"Invalid scheduled_time format. Expected ISO format (e.g. '2024-03-20T15:00:00Z'). Error: {str(e)}"
            print(error_msg)
            return json.dumps({"error": error_msg}), 400
            
        # Get tokens for the target OSIS
        tokens = get_data("Tokens", row_name="OSIS", row_val=data['OSIS'], operator="in")
        if not tokens:
            error_msg = f"No FCM tokens found for OSIS: {data['OSIS']}"
            print(error_msg)
            return json.dumps({"error": error_msg}), 404
        # only keep token objects which have unique token['token'] values
        token = tokens[0]['token']
        

        # Schedule notification for each token
        success_count = 0
        
        if schedule_delayed_notification(
            token,
            data['title'],
            data['body'],
            data['scheduled_time']
        ):
            success_count += 1
        
        if success_count == 0:
            return json.dumps({"error": "Failed to schedule notifications for all tokens"}), 500
        
        return json.dumps({
            "message": f"Successfully scheduled notifications for {success_count}/{len(tokens)} tokens"
        })
    except Exception as e:
        error_msg = f"Error scheduling notification: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        return json.dumps({"error": error_msg}), 500

@data_routes.route('/home-ip', methods=['POST'])
def get_home_ip():
  r = request.json
  userId = r['userId']
  grades_key = r['grades_key']
  print("grades_key", grades_key)
  if 'user_data' not in session:

    return json.dumps({'Name': ["Login", 404]})
  session['user_data']['grades_key'] = str(grades_key)
  session.modified = True
  print("grades_key", session['user_data']['grades_key'])
  if 'ip_add' not in session:
    # store the ip address in the session
    session['ip_add'] = userId
    
  print("ip from get_home_ip is:", session['ip_add'], "grades_key", grades_key)
  # return the user's data given their IP address
  return json.dumps({'Name': get_name(str(session['ip_add']))})

# /send_email route that calls send_email function in database.py
@data_routes.route('/send_email', methods=['POST'])
def send_email_route():
  data = request.json
  send_email(data['email'], data['message'])
  return json.dumps({"message": "success"})


