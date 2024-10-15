# import session from flask
from flask import session
import requests
import openai
import time
from database import get_data
from jupiter import get_grades


# Query the LLM API to get insights
def get_insights(prompts, format):
  from main import init
  vars = init()
  completion = vars['client'].beta.chat.completions.parse(
    model="gpt-4o-mini",
    messages=prompts,
    response_format=format,
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