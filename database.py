import requests
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
import pickle
import os


#get data from Google Sheets API
def get_data(sheet):
  from main import init_gapi
  spreadsheet_id, api_key, sheetdb_url, DISCOVERY_SERVICE_URL, service, max_column = init_gapi()
  ranges = [f'{sheet}!A:{max_column}']
  request = service.spreadsheets().values().batchGet(
    spreadsheetId=spreadsheet_id, ranges=ranges, majorDimension='ROWS')

  response = request.execute()
  response = response['valueRanges'][0]['values']

  data = []

  headers = response[0]  # Assumes the first row contains headers
  for row in response[1:]:
    row_data = {}
    for index, value in enumerate(row):
      header = headers[index]
      row_data[header] = value
    data.append(row_data)
  # print("data from get_data:", data)
  return data

def get_gclassroom_api_data():
  SCOPES = ['https://www.googleapis.com/auth/classroom.courses.readonly',
          'https://www.googleapis.com/auth/classroom.coursework.me.readonly']
  creds = None
  # The file token.pickle stores the user's access and refresh tokens, and is
  # created automatically when the authorization flow completes for the first time.
  if os.path.exists('token.pickle'):
      with open('token.pickle', 'rb') as token:
          creds = pickle.load(token)
  # If there are no (valid) credentials available, let the user log in.
  if not creds or not creds.valid:
      print("checkpoint 0")
      flow = InstalledAppFlow.from_client_secrets_file(
          'static/SciWeb_API_secret.json', SCOPES)
      creds = flow.run_local_server(port=8090)
      # Save the credentials for the next run
      with open('token.pickle', 'wb') as token:
          pickle.dump(creds, token)

  try:
      print("checkpoint 1")
      service = build('classroom', 'v1', credentials=creds)

      # Call the Classroom API to fetch the list of courses
      courses = service.courses().list().execute().get('courses', [])
      if not courses:
          print('No courses found.')
          return

      for course in courses:
          print("checkpoint 2")
          print(f"Course: {course['name']} (ID: {course['id']})")

          # Fetch course work for this course
          course_works = service.courses().courseWork().list(courseId=course['id']).execute().get('courseWork', [])
          for work in course_works:
              print(f"\tAssignment: {work['title']} Due: {work.get('dueDate', 'No due date')}")
                
  except Exception as error:
      print(f"An error occurred: {error}")


# Function to post data to sheetdb
def post_data(sheet, data, sheetdb_url, allow_demo_change=False):
  from main import get_name
  user_data = get_name()
  if not isinstance(user_data, tuple) and sheet !="Users" and user_data['osis'] == '3428756' and not allow_demo_change:
    message = "rejected: can't change demo account data"
    print(message)
    return message
  
  url = sheetdb_url + "?sheet=" + sheet
  response = requests.post(url, json=data)
  print(response, url)
  return response


#delete data from sheetdb
def delete_data(sheet, row_value, row_name, session, sheetdb_url, allow_demo_change=False):
  if 'user_data' in session and not isinstance(session['user_data'], tuple) and sheet !="Users" and session['user_data']['osis'] == '3428756' and not allow_demo_change:
    message = "rejected: can't delete demo account data"
    print(message)
    return message
  url = sheetdb_url + "/" + row_name + "/" + str(row_value) + "?sheet=" + sheet
  response = requests.delete(url)
  print(response, url)
  return response

def update_data(row_val, row_name, new_row, sheet, session, sheetdb_url, allow_demo_change=False):
  delete_data(sheet, row_val, row_name, session, sheetdb_url, allow_demo_change)
  post_data(sheet, new_row, sheetdb_url, allow_demo_change)