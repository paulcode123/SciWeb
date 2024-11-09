import requests
from google.cloud import storage
import base64
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import json
from flask import session
from google.oauth2 import service_account

#get data from Google Sheets API
def get_data_gsheet(sheet, row_name, row_val):
  from main import init
  print("getting data from gsheet", sheet)
  vars = init()
  ranges = [f"{sheet}!A:{vars['max_column']}"]
  request = vars['service'].spreadsheets().values().batchGet(
    spreadsheetId=vars['spreadsheet_id'], ranges=ranges, majorDimension='ROWS')

  response = request.execute()
  response = response['valueRanges'][0]['values']

  data = []

  headers = response[0]  # Assumes the first row contains headers
  for row in response[1:]:
    row_data = {}
    for index, value in enumerate(row):
      header = headers[index]
      row_data[header] = value
    # if row_name != "", filter by row_name and row_val
    if row_name == "" or row_data[row_name] == str(row_val):
      data.append(row_data)
  
  return data


# Function to post data to sheetdb
def post_data_gsheet(sheet, data):
  # print(data)
  from main import get_name, init
  vars = init()
  user_data = get_name()
  if not isinstance(user_data, tuple) and sheet !="Users" and user_data['osis'] == '3428756' and not vars['allow_demo_change']:
    message = "rejected: can't change demo account data"
    print(message)
    return message
  
  url = vars['sheetdb_url'] + "?sheet=" + sheet
  print(data)
  response = requests.post(url, json=data)
  print("POST error", response.text)
  print(response, url)
  return response


#delete data from sheetdb
def delete_data_gsheet(sheet, row_value, row_name, session):
  from main import init
  vars = init()
  if 'user_data' in session and not isinstance(session['user_data'], tuple) and sheet !="Users" and session['user_data']['osis'] == '3428756' and not vars['allow_demo_change']:
    message = "rejected: can't delete demo account data"
    print(message)
    return message
  print("deleting data", vars['sheetdb_url'])
  url = vars['sheetdb_url'] + "/" + str(row_name) + "/" + str(row_value) + "?sheet=" + sheet
  response = requests.delete(url)
  print(response.text)
  print(response, url)
  return response

def update_data_gsheet(row_val, row_name, new_row, sheet):
  print("in update_data")
  from main import init
  vars = init()
  url = vars['sheetdb_url'] + "/" + str(row_name) + "/" + str(row_val) + "?sheet=" + sheet
  response = requests.patch(url, json=new_row)
  print(response.text)
  print(response, url)
  return response


def upload_file(bucket_name, base64_string, destination_blob_name):
    from main import init
    vars = init()
    """Uploads a file to the bucket."""
    cred = service_account.Credentials.from_service_account_file(vars['google_credentials_path'])
    storage_client = storage.Client(credentials=cred)
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(str(destination_blob_name))

    padding = '=' * ((4 - len(base64_string) % 4) % 4)
    content = base64.urlsafe_b64decode(base64_string + padding)
    
    # Use the blob.upload_from_string method to upload the binary content
    blob.upload_from_string(content)

    print(f"Content uploaded to {destination_blob_name}.")

def download_file(bucket_name, source_blob_name):
    from main import init
    vars = init()
    """Downloads a blob from the bucket and returns it as a base64 string."""
    cred = service_account.Credentials.from_service_account_file(vars['google_credentials_path'])
    storage_client = storage.Client(credentials=cred)
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(str(source_blob_name))

    # Download the blob's content as a bytes object.
    content = blob.download_as_bytes()

    # Convert the bytes object to a base64 encoded string.
    base64_encoded_content = base64.b64encode(content).decode()

    print(f"Blob {source_blob_name} downloaded and converted to base64.")
    return base64_encoded_content

def init_firebase():
  # If the Firebase Admin SDK has not yet been initialized, do so
  if not firebase_admin._apps:
    cred = credentials.Certificate('service_key.json')
    firebase_admin.initialize_app(cred)

def get_data_firebase(collection, row_name, row_val, operator):
    print(f"Getting data from firebase: {collection}")
    
    # Initialize Firestore DB
    db = firestore.client()

    # Create an empty list to hold the documents
    results = []

    # Reference to the Firestore collection
    collection_ref = db.collection(collection)
    
    # Attempt to get documents from the collection
    try:
        if row_name == "":
            docs = collection_ref.stream()
        else:
            if operator == 'in':
                # For 'in' operator, ensure row_val is a list
                if not isinstance(row_val, list):
                    row_val = [row_val]
                docs = collection_ref.where(row_name, operator, row_val).stream()
            else:
                # For other operators, convert to string
                docs = collection_ref.where(row_name, operator, row_val).stream()
        
        for doc in docs:
            # Each doc is a DocumentSnapshot, convert to dict and append to results
            doc_dict = doc.to_dict()
            doc_dict['docid'] = doc.id  # Include the document ID in the dictionary
            results.append(doc_dict)
    except Exception as e:
        print(f"An error occurred: {e}")
        return json.dumps({'error': str(e)})
    print(f"returned {len(results)} documents from {collection} with {row_name} {operator} {row_val}")
    return results

def post_firebase_data(collection, data):
    # Initialize Firestore DB
    db = firestore.client()

    # Reference to the Firestore collection
    collection_ref = db.collection(collection)
    
    # Attempt to add a new document to the collection
    try:
        # Add a new document
        doc_ref = collection_ref.add(data)
        # Print the ID of the new document
        print(f"Document added with ID: {doc_ref[1].id}")
        return {'success': True, 'document_id': doc_ref[1].id}
    except Exception as e:
        print(f"An error occurred: {e}")
        return {'error': str(e)}

def update_data_firebase(row_val, row_name, new_row, collection):
    # Initialize Firestore DB
    db = firestore.client()

    # Reference the specified collection
    collection_ref = db.collection(collection)

    # Query for documents with the matching row_name and row_val
    print(row_val, row_name, collection)
    docs = collection_ref.where(row_name, '==', row_val).stream()
    
    # Keep track of updates
    updated_documents = []
    
    # Update each matching document
    for doc in docs:
        print(doc.id, "updated")
        doc_ref = collection_ref.document(doc.id)
        doc_ref.update(new_row)
        updated_documents.append(doc.id)

    return updated_documents

def delete_data_firebase(row_val, row_name, collection):
    print("deleting data from firebase: ", type(row_val))
    # Initialize Firestore DB
    db = firestore.client()

    # Reference to the specified collection
    collection_ref = db.collection(collection)
    print(row_val, row_name, collection)
    # Query for documents with the matching row_name and row_val
    docs = collection_ref.where(row_name, '==', row_val).stream()

    # Keep track of deleted documents
    deleted_documents = []

    # Delete each matching document
    for doc in docs:
        print(doc.id, "deleted")
        doc_ref = collection_ref.document(doc.id)
        doc_ref.delete()
        deleted_documents.append(doc.id)

    return deleted_documents

def get_data(collection, row_name="", row_val="", operator="=="):
  from main import init
  vars = init()
  if vars['database'] == 'gsheet':
    return get_data_gsheet(collection, row_name, row_val)
  return get_data_firebase(collection, row_name, row_val, operator)

def post_data(collection, data):
    print("posting data")
    from main import init
    vars = init()
    if vars['database'] == 'gsheet':
      return post_data_gsheet(collection, data)
    return post_firebase_data(collection, data)

def update_data(row_val, row_name, new_row, collection):
  from main import init
  vars = init()
  if vars['database'] == 'gsheet':
    return update_data_gsheet(row_val, row_name, new_row, collection)
  return update_data_firebase(row_val, row_name, new_row, collection)

def delete_data(row_val, row_name, collection):
  from main import init
  vars = init()
  if vars['database'] == 'gsheet':
    return delete_data_gsheet(collection, row_val, row_name, session)
  return delete_data_firebase(row_val, row_name, collection)

def get_user_data(sheet, prev_sheets=[]):
  from main import get_name
  from jupiter import get_grades
  print("sheet", sheet)
  # if trying to get just the user's data, call the get_name function
  if sheet=="Name":
    return get_name()
  
  # if session['user_data'] is not defined, throw an error
  if 'user_data' not in session:
    return json.dumps({"error": "User data not found"})
  
  # special case for the Grades, since it's not a normal sheet: it must be processed differently
  if sheet=="Grades":
    return get_grades()
  
  # if the sheet is one of these exceptions that require special filtering
  if sheet=="FULLUsers":
    return get_data("Users")
  if sheet=="Users":
    #only include the first 3 columns of the Users sheet, first_name, last_name, and osis
    data = get_data(sheet)
    return [{key: item[key] for key in item if key in ['first_name', 'last_name', 'osis']} for item in data]
  if sheet=="Friends":
    #send if the user's osis is in the OSIS or targetOSIS of the row
    combined = get_data("Friends", row_name="OSIS", row_val=str(session['user_data']['osis'])) + get_data("Friends", row_name="targetOSIS", row_val=str(session['user_data']['osis']))
    return combined
  if sheet=="Classes":
    return get_data("Classes", row_name="OSIS", row_val=str(session['user_data']['osis']), operator="array_contains")
  if sheet=="Assignments":
    # send if item['class'] is the id for any of the rows in response['Classes']
    class_ids = [int(item['id']) for item in prev_sheets['Classes']]
    return get_data("Assignments", row_name="class", row_val=class_ids, operator="in")
  if sheet=="Notebooks":
    #  send if the classID is the id for any of the rows in response['Classes']
    class_ids = [str(item['id']) for item in prev_sheets['Classes']]
    return get_data("Notebooks", row_name="classID", row_val=class_ids, operator="in")
  if sheet=="FClasses":
    #send all of the classes that the user's friends are in
    friend_request_data = prev_sheets['Friends']
    friend_osises = [item['targetOSIS'] for item in friend_request_data if str(session['user_data']['osis']) in item['OSIS']] + [item['OSIS'] for item in friend_request_data if str(session['user_data']['osis']) in item['targetOSIS']]
    friend_classes = get_data("Classes", row_name="OSIS", row_val=friend_osises, operator="in")
    return friend_classes
  if sheet=="Chat":
    return get_data("Chat", row_name="OSIS", row_val=str(session['user_data']['osis']), operator="array_contains")
  if sheet=="Leagues":
    return get_data("Leagues", row_name="OSIS", row_val=str(session['user_data']['osis']), operator="array_contains")
  if sheet=="Courses":
     return get_data(sheet)
  if sheet == "Distributions":
    # Get all distributions where the class_name matches any of the user's classes
    class_names = [item['name'] for item in prev_sheets['Classes']]
    distributions = get_data("Distributions", row_name="class_name", row_val=class_names, operator="in")
    
    
    return distributions
  
  #Otherwise, filter the data for the user's osis
  int_data = get_data(sheet, row_name="OSIS", row_val=int(session['user_data']['osis']), operator="==")
  if int_data and len(int_data) > 0:
    return int_data
  return get_data(sheet, row_name="OSIS", row_val=str(session['user_data']['osis']), operator="==")
  
  
