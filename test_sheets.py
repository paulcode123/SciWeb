import json
from googleapiclient.discovery import build
import socket
import requests

def test_connection():
    # Load API key
    with open('api_keys.json') as f:
        keys = json.load(f)
        api_key = keys['GoogleAPIKey']
    
    print("1. Testing basic internet connectivity...")
    try:
        socket.create_connection(("8.8.8.8", 53), timeout=3)
        print("✓ Internet connection is working")
    except OSError:
        print("✗ No internet connection")
        return
    
    print("\n2. Testing Google Sheets API endpoint...")
    try:
        response = requests.get('https://sheets.googleapis.com/$discovery/rest?version=v4')
        print(f"✓ API endpoint is reachable (status code: {response.status_code})")
    except Exception as e:
        print(f"✗ Cannot reach API endpoint: {e}")
        return
    
    print("\n3. Testing API key with Google Sheets...")
    try:
        service = build('sheets', 'v4', 
                       developerKey=api_key,
                       discoveryServiceUrl='https://sheets.googleapis.com/$discovery/rest?version=v4')
        print("✓ Successfully created Sheets service")
        
        # Try to access the spreadsheet
        spreadsheet_id = '1k7VOAgZY9FVdcyVFaQmY_iW_DXvYQluosM2LYL2Wmc8'
        result = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
        print(f"✓ Successfully accessed spreadsheet: {result.get('properties', {}).get('title')}")
    except Exception as e:
        print(f"✗ Error with API key or spreadsheet access: {e}")

if __name__ == '__main__':
    test_connection() 