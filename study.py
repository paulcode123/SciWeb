# import session from flask
from flask import session
<<<<<<< HEAD
<<<<<<< HEAD
import requests
import openai
import time
from database import get_data
from jupiter import get_grades
=======
from database import get_data, update_data, post_data
import requests
from bs4 import BeautifulSoup
>>>>>>> parent of 14841af8 (notebook image passed to GPT-4.0, can not be read)
=======
from database import get_data, update_data, post_data
import requests
from bs4 import BeautifulSoup
>>>>>>> parent of 14841af8 (notebook image passed to GPT-4.0, can not be read)


# Query the LLM API to get insights
<<<<<<< HEAD
<<<<<<< HEAD
def get_insights(prompts, format):
=======
def get_insights(prompts):
>>>>>>> parent of 14841af8 (notebook image passed to GPT-4.0, can not be read)
=======
def get_insights(prompts):
>>>>>>> parent of 14841af8 (notebook image passed to GPT-4.0, can not be read)
  from main import init
  vars = init()
<<<<<<< HEAD
  completion = vars['client'].beta.chat.completions.parse(
    model="gpt-4o-mini",
    messages=prompts,
    response_format=format,
=======
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
        return "Generate 1 practice question that will challenge the user's understanding of one of these topics: " + ", ".join(session["study"]["topics"])
    elif session["study"]["mode"] == "play_dumb":
<<<<<<< HEAD
<<<<<<< HEAD
        return "Play dumb and ask the user to explain something related to one of these topics: " + ", ".join(session["study"]["topics"])

def get_insights_from_image(image): #remememeber 
    

    # Convert image to base64
    buffered = BytesIO()
    image.save(buffered, format="JPEG")
    encoded_image = base64.b64encode(buffered.getvalue()).decode('utf-8')

    response = openai.Image.create(
        image=encoded_image,
        prompt="Transcribe the text in this image"  # Modify as needed
    )


  insights = completion.choices[0].message.parsed
  print("insights: "+str(insights))
  return insights






def get_insights_from_file(prompts, format, file_id):
    from main import init
    vars = init()
    # Create an assistant
    assistant = vars['client'].beta.assistants.create(
        name="Worksheet Analyzer",
        instructions="You are an expert at analyzing educational worksheets and creating study materials.",
        model="gpt-4-1106-preview",
        tools=[{"type": "file_search"}]
    )


    # Create a thread
    thread = vars['client'].beta.threads.create()


    # Add a message to the thread
    message = vars['client'].beta.threads.messages.create(
        thread_id=thread.id,
        role="user",
        content=prompts[1]['content'],
        file_ids=[file_id]
    )


    # Run the assistant
    run = vars['client'].beta.threads.runs.create(
        thread_id=thread.id,
        assistant_id=assistant.id,
        instructions="Analyze the worksheet and provide insights in JSON format."
    )


    # Wait for the run to complete
    while run.status != 'completed':
        time.sleep(1)
        run = vars['client'].beta.threads.runs.retrieve(thread_id=thread.id, run_id=run.id)


    # Retrieve the messages
    messages = vars['client'].beta.threads.messages.list(thread_id=thread.id)


    # Get the last assistant message
    assistant_messages = [msg for msg in messages if msg.role == 'assistant']
    if assistant_messages:
        last_message = assistant_messages[-1]
        insights = last_message.content[0].text.value
        print("insights: " + str(insights))
        return format.parse_raw(insights)
    else:
        raise ValueError("No assistant response found")




# Function to communicate with the OpenAI API
def chat_with_function_calling(prompt):
    from main import init
    vars = init()
    client = vars['client']
    # Define a function for get_data(sheet) that the API can call
    function_definitions = [
        {
            "name": "get_data",
            "description": "Fetches data from the specified sheet in the database",
            "parameters": {
                "type": "object",
                "properties": {
                    "sheet": {
                        "type": "string",
                        "description": "The name of the sheet to fetch data from: Assignments, Classes, Leagues(that the user is in), Chat(the user's messages), Notebooks(notes for the user's classes), Goals(that the user has set for themselves), or Profiles",
                    },
                },
                "required": ["sheet"],
            },
        },
        {
            "name": "get_grades",
            "description": "Gets the user's raw grades from the database",
            "parameters": {},
            "required": [], 
        }
    ]

    # Send the initial request with function calling enabled
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=prompt,
        functions=function_definitions,
        function_call="auto"  # allows GPT to decide if it needs to call a function
    )
    # convert response to dictionary
    response = response.to_dict()
    # Check if a function call is required
    print("response: " + str(response))
    message = response['choices'][0]['message']

    if message.get("function_call"):
        function_name = message["function_call"]["name"]
        arguments = message["function_call"]["arguments"]

        # Call the get_data function if requested
        if function_name == "get_data":
            sheet = eval(arguments).get("sheet")  # Extract sheet name
            function_response = get_data(sheet)
        elif function_name == "get_grades":
            function_response = get_grades()
        follow_up_prompt = {"role": "function", "name": function_name, "content": str(function_response)}
        # Add message and follow_up_prompt to prompts
        prompt.append(message)
        prompt.append(follow_up_prompt)
        # Send the function result back to OpenAI for a complete response
        follow_up_response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=prompt
        )

        # Return the final response
        follow_up_response = follow_up_response.to_dict()
        print("follow_up_response: " + str(follow_up_response))
        return follow_up_response['choices'][0]['message']['content']

    # If no function call was needed, return the initial response
    return message['content']

=======
        return "Play dumb and ask the user to explain something related to one of these topics: " + ", ".join(session["study"]["topics"])
>>>>>>> parent of 14841af8 (notebook image passed to GPT-4.0, can not be read)
=======
        return "Play dumb and ask the user to explain something related to one of these topics: " + ", ".join(session["study"]["topics"])
>>>>>>> parent of 14841af8 (notebook image passed to GPT-4.0, can not be read)
