var locationData = null;
ClassId = window.location.href.slice(-4)
// Function to receive and display messages in the chat box
function receive_messages(messages, users) {
  
  const messageList = document.getElementById('message-list');
  clearMessages()
  messages.forEach(message => {
    
    if (message.location ===ClassId) {
      
      const listItem = document.createElement('li');
      listItem.className = 'message';

      const senderElement = document.createElement('div');
      senderElement.className = 'sender';
      var senderName = 'default';
      for (let i = 0; i < users.length; i++) {
        if (users[i].osis == message.sender) {
          senderName = users[i].first_name;
          break;
        }
      }
      senderElement.textContent = senderName;

      const textElement = document.createElement('div');
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
  const messageList = document.getElementById('message-list');
  while (messageList.firstChild) {
    messageList.firstChild.remove();
  }
}


// Handle sending a message
function sendMessage() {
  const inputField = document.getElementById('message-input');
  const message = inputField.value;
  inputField.value = '';
  
  console.log('Message:', message);
  
  const chat = {
    text: message,
    location: ClassId,
    sender: osis,
    id: Math.floor(Math.random() * 10000)
  }
  post_message(chat)
}

// Add event listener to send button
const sendButton = document.getElementById('send-button');
sendButton.addEventListener('click', sendMessage);

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
  body: JSON.stringify({ data: "Chat, Users, Classes" })
})
.then(response => response.json())
.then(data => {
  
  const messages = data['Chat']
  const users = data['Users']
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