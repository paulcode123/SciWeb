from flask import session, redirect, url_for, request
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import os
#this is aaron
def set_vars():
  CLIENT_SECRETS_FILE = "gclassrm.json"
  os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
  SCOPES = ['https://www.googleapis.com/auth/classroom.courses.readonly',
          'https://www.googleapis.com/auth/classroom.coursework.me']
  return CLIENT_SECRETS_FILE, SCOPES

def init_oauth():
  CLIENT_SECRETS_FILE, SCOPES = set_vars()
  flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE, scopes=SCOPES,
        redirect_uri=url_for('oauth2callback_handler', _external=True))

  authorization_url, state = flow.authorization_url(
      access_type='offline',
      include_granted_scopes='true')

  session['state'] = state
  return redirect(authorization_url)

def oauth2callback():
    CLIENT_SECRETS_FILE, SCOPES = set_vars()
    state = session['state']

    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE, scopes=SCOPES, state=state,
        redirect_uri=url_for('oauth2callback_handler', _external=True))
    flow.fetch_token(authorization_response=request.url)

    credentials = flow.credentials
    session['credentials'] = credentials_to_dict(credentials)

    return redirect(url_for('index'))

def credentials_to_dict(credentials):
    return {
        'token': credentials.token,
        'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri,
        'client_id': credentials.client_id,
        'client_secret': credentials.client_secret,
        'scopes': credentials.scopes
    }

def list_courses():
    if 'credentials' not in session:
        return redirect('login')
    
    # Load credentials from the session
    creds_data = session['credentials']
    credentials = Credentials(
        token=creds_data['token'],
        refresh_token=creds_data['refresh_token'],
        token_uri=creds_data['token_uri'],
        client_id=creds_data['client_id'],
        client_secret=creds_data['client_secret'],
        scopes=creds_data['scopes']
    )

    # Refresh credentials if expired
    if credentials.expired:
        credentials.refresh(Request())

    # Save refreshed credentials back to session
    session['credentials'] = credentials_to_dict(credentials)

    # Build the Classroom service
    service = build('classroom', 'v1', credentials=credentials)
    courses = service.courses().list().execute()
    
    # Example: Return course names
    course_names = [course['name'] for course in courses.get('courses', [])]
    return '<br>'.join(course_names)