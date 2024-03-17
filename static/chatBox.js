// let locationData = null;
var classId = window.location.href.slice(-4)
// Function to receive and display messages in the chat box
function receive_messages(messages, users) {
  
  var messageList = document.getElementById('message-list');
  clearMessages()
  // Loop through all the messages and display them
  messages.forEach(message => {
    //if the message is in the current class, display it
    if (message.location ===classId) {
      
      let listItem = document.createElement('li');
      listItem.className = 'message';

      let senderElement = document.createElement('div');
      senderElement.className = 'sender';
      let senderName = 'default';
      
      for (let i = 0; i < users.length; i++) {
        if (users[i].osis == message.OSIS) {
          senderName = users[i].first_name;
          break;
        }
      }
      senderElement.textContent = senderName;

      let textElement = document.createElement('div');
      textElement.textContent = message.text;

      listItem.appendChild(senderElement);
      listItem.appendChild(textElement);
      messageList.appendChild(listItem);
    }
  });
  // Scroll to the bottom of the chat box
  messageList.scrollTop = messageList.scrollHeight;
}


function clearMessages() {
  let messageList = document.getElementById('message-list');
  while (messageList.firstChild) {
    messageList.firstChild.remove();
  }
}


// Handle sending a message
function sendMessage() {
  let inputField = document.getElementById('message-input');
  var message = inputField.value;
  inputField.value = '';
  
  console.log('Message:', message);
  
  let chat = {
    text: message,
    location: classId,
    OSIS: osis,
    id: Math.floor(Math.random() * 10000)
  }
  post_message(chat)
}

// Add event listener to send button
var sendButton = document.getElementById('send-button');
sendButton.addEventListener('click', sendMessage);

// Add event listener to input field for when the user presses Enter, send the message
var inputField = document.getElementById('message-input');
inputField.addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    sendMessage();
  }
});

// receive_messages(['hello', 'world'])
//post messages to py database
function post_message(message){
  

fetch('/post-message', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      data: {"data":message}
      
    })
})
.then(response => response.json())
.then(data => {
  get_messages()
  })
}
//get messages from py
function get_messages(){
  
  fetch('/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ data: "Chat, Users, FILTERED Classes" })
})
.then(response => response.json())
.then(data => {
  
  var messages = data['Chat']
  var users = data['Users']
  locationData = data['Classes']
  
  receive_messages(messages, users);
  return true;
})
.catch(error => {
  console.error('An error occurred in get_messages(), chatBox.js:' +error);
  return false;
});
}


get_messages()
document.getElementById('loadingWheel').style.display = "none";