# with open('static/credentials.json') as file:
#     creds = json.load(file)
  
# client_id = creds['web']['client_id']
# client_secret = creds['web']['client_secret']
# auth_uri = creds['web']['auth_uri']
# token_uri = creds['web']['token_uri']


# flow = credentials.OAuth2WebServerFlow(client_id, client_secret, auth_uri, token_uri)
# auth_url = flow.authorization_url()
# # Redirect the user to `auth_url` and retrieve the authorization code
# # Use the authorization code to fetch an access token and refresh token
# credentials = flow.fetch_token(authorization_response='YOUR_AUTHORIZATION_RESPONSE')

# # Use the access token to make requests to the Google Sheets API
# access_token = credentials.token
# headers = {'Authorization': f'Bearer {access_token}'}

# SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
# SPREADSHEET_ID = '1k7VOAgZY9FVdcyVFaQmY_iW_DXvYQluosM2LYL2Wmc8'
# def main():
#   credentials = None
#   if os.path.exists("token.json"):
#     credentials = Credentials.from_authorized_user_file("token.json", SCOPES)
#   if not credentials or not credentials.valid:
#     if credentials and credentials.expired and credentials.refresh_token:
#       credentials.refresh(Request())
#     else:   
#       flow = InstalledAppFlow.from_client_secrets_file("static/credentials.json", SCOPES)
#       credentials = flow.run_local_server(port=0)
#     with open("token.json", "w") as token:
#       token.write(credentials.to_json())
#   try:
#     service = build("sheets", "v4", credentials=credentials)
#     sheets = service.spreadsheets()

#     result = sheets.values().get(spreadsheetId=SPREADSHEET_ID, range="Users!A1:C3").execute()
#     values = result.get("values", [])
#     for row in values:
#       print(values)
      
#   except:
#     pass
# main()