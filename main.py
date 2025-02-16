# Import necessary libraries
# Flask is a web framework for Python that allows backend-frontend communication
from flask import Flask
# json is a library for parsing and creating JSON data
import json
# googleapiclient is a library for working with Google APIs(Getting data from Google Sheets in this case)
from googleapiclient.discovery import build
# openai is a library for working with OpenAI
from openai import OpenAI
# openai is a library for working with OpenAI
import openai

from langchain_community.chat_models import ChatOpenAI
from langchain.memory import ConversationBufferMemory
from langchain_openai import ChatOpenAI


from database import init_firebase
from study import init_pydantic
from routes.page_init import page_init
from routes.analyze_routes import analyze_routes
from routes.data_routes import data_routes
from routes.ai_routes import ai_routes

#get api keys from static/api_keys.json file
keys = json.load(open('api_keys.json'))  



init_firebase()
# Initialize other variables
def init():
  vars = {}
  keys = json.load(open('api_keys.json'))
  vars['openAIAPI'] = keys["OpenAiAPIKey"]
  openai.api_key = vars['openAIAPI']
  vars['spreadsheet_id'] = '1k7VOAgZY9FVdcyVFaQmY_iW_DXvYQluosM2LYL2Wmc8'
  vars['gSheet_api_key'] = keys["GoogleAPIKey"]
  # URL for the SheetDB API, for POST requests
  vars['sheetdb_url'] = 'https://sheetdb.io/api/v1/y0fswwtbyapbd'

  vars['DISCOVERY_SERVICE_URL'] = 'https://sheets.googleapis.com/$discovery/rest?version=v4'

  vars['service'] = build('sheets',
                  'v4',
                  developerKey=vars['gSheet_api_key'],
  discoveryServiceUrl=vars['DISCOVERY_SERVICE_URL'])
  vars['max_column'] = "O"
  vars['AppSecretKey'] = keys["AppSecretKey"]
  # firebase or gsheet
  vars['database'] = 'firebase'
  vars['allow_demo_change'] = True
  vars['client'] = OpenAI(api_key=vars['openAIAPI'])
  vars['google_credentials_path'] = 'cloudRunKey.json'
  
  # Initialize LangChain components
  vars['llm'] = ChatOpenAI(
      api_key=vars['openAIAPI'],
      temperature=0.7,
      model_name="gpt-4o-mini"
  )

  vars['vision_llm'] = ChatOpenAI(
      api_key=vars['openAIAPI'],
      temperature=0.7,
      model_name="gpt-4o"
  )
  
  # Initialize memory for different conversation contexts
  vars['eval_memory'] = ConversationBufferMemory(
      memory_key="chat_history",
      return_messages=True
  )
  init_pydantic()
 
  

  # App secret key for session management
  app.config['SECRET_KEY'] = vars["AppSecretKey"]
  generate_grade_insights = True
  return vars

app = Flask(__name__)
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = True

app.register_blueprint(page_init)
app.register_blueprint(analyze_routes)
app.register_blueprint(data_routes)
app.register_blueprint(ai_routes)



def utility_function():
  # import requests
  # url = "https://us-central1-sturdy-analyzer-381018.cloudfunctions.net/sendNotification"
  # try:
  #   response = requests.post(url)
  #   response.raise_for_status()  # This will raise an exception for error status codes
  #   print(f"Response status: {response.status_code}")
  #   print(f"Response body: {response.text}")
  # except requests.exceptions.RequestException as e:
  #   print(f"Error making request: {str(e)}")
  #   if hasattr(e.response, 'text'):
  #       print(f"Error details: {e.response.text}")
  pass
  




vars = init()

if __name__ == '__main__':

  app.run(host='localhost', port=8080)

