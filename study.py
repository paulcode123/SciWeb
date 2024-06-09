# import session from flask
from flask import session
from database import get_data, update_data, post_data
import requests
from bs4 import BeautifulSoup

# Function to handle/redirect the study response
def study_response(previous_response):
    # print("in study response", session["study"]["question_number"])
    if previous_response == "start":
        session["study"]={}
        session["study"]["question_number"] = 0
        # study mode used to set system prompt: challenge_user or play_dumb
        session["study"]["mode"] = "play_dumb"
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
        print("classes: "+str(classes))
        return {"index": index, "topics": topics, "classes": classes}
    elif session["study"]["question_number"] == 1:
        session["study"]["topics"] = previous_response
        session["study"]["question_number"] += 1
        session.modified = True
        return "What mode would you like to study in? Challenge User or Play Dumb?"
    else:
        if session["study"]["question_number"] == 2:
            if "challenge" in previous_response.lower():
                session["study"]["mode"] = "challenge_user"
            elif "play" in previous_response.lower():
                session["study"]["mode"] = "play_dumb"
            session["study"]["history"] = load_study_history()
        session["study"]["history"].append({"role": "user", "content": previous_response})
        response = get_insights(session["study"]["history"])
        session["study"]["history"].append({"role": "assistant", "content": response})
        session["study"]["question_number"] += 1
        session.modified = True
        # if question number is a multiple of 5, save the study history
        if session["study"]["question_number"] % 5 == 0:
            save_study_history()
        return response
    
# Match the user's response to the class in the user's classes
def parse_class_name(response, classes):
    class_list = [item["name"] for item in classes]
    prompt = [{"role": "system", "content": "Give the index of the given list that most closely matches the class name. First element has index 0."}, {"role": "user", "content": "list: "+str(class_list)+", name: "+response}]
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

# recursive function run from get_notebook_topics
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

# Get the section titles from the notebook for the given class
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
  print("raw insights: "+str(insights))
  insights = insights['choices'][0]['message']['content']
  # print("insights: "+str(insights))
  return insights

# Load the study history from the database for the user  
def load_study_history():
    data = get_data("Study")
    # filter for osis column matching session["user_data"]["osis"]
    data = [item for item in data if str(session['user_data']['osis']) in str(item['OSIS'])]
    system_prompt = get_system_prompt()
    if len(data) == 0:
        session["study"]["exists"] = False
        session.modified = True
        return [{"role": "system", "content": system_prompt}]
    data = data[0]["Q&As"].split("///")
    for d in range(len(data)):
        # alternate between user and assistant
        role = "user" if d % 2 == 0 else "assistant"
        data[d] = {"role": role, "content": data[d]}
    # add the system prompt to the beginning of the history
    data.insert(0, {"role": "system", "content": system_prompt})
    session["study"]["history"] = data
    session["study"]["exists"] = True
    session.modified = True
    print("history: "+str(data))
    return data

# Save the study history to the database for the user
def save_study_history():
    data = session["study"]["history"]
    # remove the system prompts from the history, which is the first element
    data = data[1:]
    data = "///".join([item["content"] for item in data])
    data = {"OSIS": session["user_data"]["osis"], "Q&As": data}
    if session["study"]["exists"]:
        update_data(session["user_data"]["osis"], "OSIS", data, "Study")
    else:
        post_data("Study", data)

# Get the system prompt for the study session
def get_system_prompt():
    if session["study"]["mode"] == "challenge_user":
        return "Generate 1 practice question that will challenge the user's understanding of the topics: " + ", ".join(session["study"]["topics"])
    elif session["study"]["mode"] == "play_dumb":
        return "Play dumb and ask the user to explain the topics: " + ", ".join(session["study"]["topics"])