// const { get } = require("http");

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
      //if the message is a base64 image, display the image
      if (message.text.includes('file:')) {
        
        //get the 7 digit number from the end of the message to use as the file id
        let id = message.text.slice(-7);
        getFile(id).then(([image, type]) => {
        if(type == 'pdf'){
          let pdfElement = document.createElement('a');
          let pdfBlob = base64ToBlob(image, 'application/pdf');
          // Create an object URL for the Blob
          let url = URL.createObjectURL(pdfBlob);
          pdfElement.href = url;
          pdfElement.textContent = 'Open PDF     ➡️';
          pdfElement.target = '_blank'; // Opens the link in a new tab
          pdfElement.className = 'pdf';
          textElement.appendChild(pdfElement);
          console.log('PDF:', pdfElement);
        }
        else{
        let imageElement = document.createElement('img');
        imageElement.src = image;
        imageElement.width = 120;
        imageElement.height = 120;
        textElement.appendChild(imageElement);
        }
        })
      } else {
      textElement.textContent = message.text;
      }
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
  // If image is uploaded, send the image
  var message = '';
  if (document.getElementById('upload').files.length > 0) {
    let image = document.getElementById('upload').files[0];
    // Call your getBase64 function, assuming it's defined to accept a file and do something with the result
    getBase64(image).then(base64 => {
      console.log(base64); // For example, log the base64 string to the console
      //generate random 7 digit number to use as the file id
      let id = Math.floor(Math.random() * 9000000) + 1000000;
      message = "file: " + id;
      uploadFile(base64, id);

    document.getElementById('upload').value = '';
    let chat = {
      text: message,
      location: classId,
      OSIS: osis,
      id: Math.floor(Math.random() * 10000)
    }
    post_message(chat)
    document.getElementById('image-container').innerHTML = '';
  }).catch(error => {
    console.error(error); // Handle any errors
});
return;
  }
  
  let inputField = document.getElementById('message-input');
  message = inputField.value;
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


//add event listener to refresh-chat button to refresh the chat
refreshbtn = document.getElementById('refresh-chat');
refreshbtn.addEventListener('click', function() {
  get_messages();
});





document.getElementById('upload').addEventListener('change', function(event) {
  // Check if files were uploaded
  if (this.files && this.files.length > 0) {
      // Get the first file in the collection
      const file = this.files[0];
      renderImage(URL.createObjectURL(file));
      
  }
});
// add event listener to button with id="clear" to clear the input field
document.getElementById('clear').addEventListener('click', clearInput);
function clearInput() {
  document.getElementById('message-input').value = '';
  document.getElementById('upload').value = '';
  document.getElementById('image-container').innerHTML = '';
}

function renderImage(image) {
  const img = document.createElement('img');
  img.src = image;
  img.width = 60;
  img.height = 60;
  document.getElementById('image-container').appendChild(img);
}

async function getBase64(file) {
  return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file); // Converts the file to Base64
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
  });
}

// Create function for fetch request to get-file route
function getFile(fileId) {
  // Return the fetch promise chain
  return fetch('/get-file', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ file: fileId })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(data => {
    // Assuming `data.file` is the image or file data you want
    let file = data.file;
    let type;
    // console.log(file.slice(11, 14));
    if(file.includes('pngbase64')){
      type = 'png';
      file = file.replace('dataimage/pngbase64', 'data:image/png;base64,');
      file = file.slice(0, -1);
    }
    else if(file.includes('jpegbase64')){
      type = 'jpeg';
      file = file.replace('dataimage/jpegbase64', 'data:image/jpeg;base64,');
    }
    else if(file.includes('pdfbase64')){
      type = 'pdf';
      file = file.replace('dataapplication/pdfbase64', 'data:application/pdf;base64,');
    }
    else{
      console.log('Error: File type not supported', file);
    }
    
    
    return [file, type]; // This will be the resolved value of the promise
  });
}


// Create function for fetch request to upload-file route
function uploadFile(xfile, id) {
  fetch('/upload-file', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ file: xfile, name: id })
  })
  .then(response => response.json())
  .then(data => {
    // Display the image
    return data;
  });
}

function base64ToBlob(base64, type = 'application/octet-stream') {
  base64 = base64.split('base64,')[1];
  // log the last 5 characters of the base64 string
  
  // add equals signs to the end of the base64 string to make it a multiple of 4
  while (base64.length % 4 !== 0) {
      base64 += '=';
  }
  console.log(base64.slice(-5));
  // Decode the base64 string
  const binaryString = window.atob(base64);
  // Create an array buffer of the same length
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
  }
  // Create and return a Blob from the array buffer
  return new Blob([bytes], {type});
}


get_messages()
document.getElementById('loadingWheel').style.display = "none";