import gspread
from oauth2client.service_account import ServiceAccountCredentials

# Define the scope and credentials for the Google Sheets API
scope = ['https://www.googleapis.com/auth/drive']
creds = ServiceAccountCredentials.from_json_keyfile_name('creds.json', scope)

# Connect to the Google Sheet
client = gspread.authorize(creds)
sheet = client.open('Name of your Google Sheet').sheet1

# Read data from the Google Sheet
data = sheet.get_all_records()

# Write data to the Google Sheet
new_row = ['John', 'Doe', '25']
sheet.append_row(new_row)
