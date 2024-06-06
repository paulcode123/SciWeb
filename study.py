# import session from flask
from flask import session
from database import get_data
import requests
from bs4 import BeautifulSoup

# Function to handle/redirect the study response
def study_response(previous_response):
    print("in study response")
    if previous_response == "start":
        session["study"]={}
        session["study"]["question_number"] = 0
        session.modified = True
        print(session['study'])
        return "Which class would you like to study for?"
    elif session["study"]["question_number"] == 0:
        print('in question 0')
        session["study"]["question_number"] += 1
        session.modified = True
        classes = get_data("Classes")
        # filter classes for session["user_data"]["osis"] in OSIS column
        classes = [item for item in classes if str(session['user_data']['osis']) in str(item['OSIS'])]
        class_name, index = parse_class_name(previous_response, classes)
        session["study"]["class"] = class_name
        classId = classes[index]["id"]
        topics = get_notebook_topics(classId)
        print("topics: "+str(topics))
        return {"index": index, "topics": topics, "classes": classes}
    else:
        if session["study"]["question_number"] == 1:
            session["study"]["topics"] = previous_response
        session["study"]["question_number"] += 1
        print(session['study'])
        return 'pass'
    

def parse_class_name(response, classes):
    class_list = [item["name"] for item in classes]
    prompt = [{"role": "system", "content": "Give the index of the given list that most closely matches the class name."}, {"role": "user", "content": "list: "+str(class_list)+", name: "+response}]
    response = get_insights(prompt)
    # remove all punctuation from the response
    response = response.replace(",", "").replace(".", "")
    print("response: "+str(response))
    # if there is a number in the response, get the first number that appears in the response
    index=None
    for word in response.split(' '):
        print("word: "+str(word))
        if word.isdigit():
            print("word is digit")
            index = int(word)
            break
    class_name = class_list[index]
    return class_name, index


def extract_data_text(element, level=0):
    data_texts = []
    input_element = element.find('input', {'data-text': True})
    if input_element:
        prefix = '>' * level
        data_texts.append(prefix + input_element['data-text'])

    # Find all nested divs with class 'tab'
    nested_tabs = element.find_all('div', class_='tab', recursive=True)
    for nested_tab in nested_tabs:
        data_texts.extend(extract_data_text(nested_tab, level + 1))
    
    return data_texts

def get_notebook_topics(classId):
    notebooks = get_data("Notebooks")
    notebook = [item for item in notebooks if item["classID"] == classId]
    if len(notebook) == 0:
        return 'no data'
    notebook = notebook[0]
    html = notebook["innerHTML"]
    soup = BeautifulSoup(html, 'html.parser')
    top_level_tabs = soup.find_all('div', class_='tab', recursive=False)
    data_text_list = []
    for tab in top_level_tabs:
        data_text_list.extend(extract_data_text(tab))

    return data_text_list

# Query the LLM API to get insights
def get_insights(prompts):
  from main import init
  vars = init()
  headers = {
    'Authorization': f"Bearer {vars['openAIAPI']}",
    'Content-Type': 'application/json'
}
  
  payload = {
    "model": "gpt-3.5-turbo",
    "messages": prompts
}
  insights = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
  insights = insights.json()
  # print("raw insights: "+str(insights))
  insights = insights['choices'][0]['message']['content']
  # print("insights: "+str(insights))
  return insights
  