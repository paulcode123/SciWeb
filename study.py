# import session from flask
from flask import session
from database import get_data
# Function to handle/redirect the study response
def study_response(previous_response):
    if previous_response == "start":
        session["study"]={}
        session["study"]["question_number"] = 0
        return "Which class would you like to study for?"
    elif session["study"]["question_number"] == 0:
        session["study"]["question_number"] += 1
        class_name = parse_class_name(previous_response)
        session["study"]["class"] = class_name
        classes = get_data("Classes")
        topics = get_notebook_topics(class_name, classes)
        return class_name+"|||"+classes+"|||"+topics
    else:
        pass
    