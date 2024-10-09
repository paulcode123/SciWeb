import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging.js"





// Create function show_recent_messages to display the number and location of messages that were sent in the last 24 hours in classes and assignments that the user is in
function show_recent_messages(messages, classes, assignments){
  //Create a variable to store the data in format [{location: assignment and/or class, num_messages: number of messages sent in the last 24 hours, id: id of the assignment or class}]
  var locations = [];
  var class_ids = get_classes_ids(classes);
  console.log(class_ids)
  //Iterate over all messages
  for (const message of messages) {
    var in_classes = in_user_classes(message.location, classes);
    var in_assignments = in_user_assignments(class_ids, assignments, message.location);
    var recent = is_recent(message.timestamp);
    console.log(in_classes, in_assignments, recent)
    //Check if the message was sent in the last 24 hours
    if (recent && (in_classes !== false || in_assignments !== false)){
      //Check if the location of the message is already in the locations list
      var exists = false;
      for (const location of locations) {
        
        if (location.location === in_classes[0] || location.location === in_assignments[0]){
          location.num_messages += 1;
          exists = true;
          break;
        }
      }
      //If the location is not in the list, add it
      if (!exists){
      // locations.append({location: in_classes[0] || in_assignments[0], num_messages: 1, id: in_classes[1] || in_assignments[1], type: in_classes !== false ? "class" : "assignment"});
      locations.push({location: in_classes[0] || in_assignments[0], num_messages: 1, id: in_classes[1] || in_assignments[1], type: in_classes !== false ? "class" : "assignment"});
      }
    }
  }
  //Display the number of messages sent in the last 24 hours in each location
  var rms = document.getElementById('recent_messages');
  locations.forEach(location => {
    let location_div = document.createElement('div');
    let location_name = document.createElement('h3');
    let location_num = document.createElement('p');
    let link = document.createElement('a');
    location_name.innerHTML = location.location;
    location_num.innerHTML = location.num_messages;
    link.innerHTML = "View";
    link.href = "/"+location.type+"/" + location.location+location.id;
    location_div.appendChild(location_name);
    location_div.appendChild(location_num);
    location_div.appendChild(link);
    rms.appendChild(location_div);
});
}


function is_recent(timestamp){
  //Check if the timestamp is less than 24 hours ago
  if (timestamp > Date.now() - 86400000){
    return true;
  }
  return false;
}

function in_user_classes(message_id, classes){
  //Iterate over all classes
  for (const classData of classes) {
    //Check if the class is in the user's classes
    if (classData.id === message_id){
      return [classData['name'], classData['id']];
    }
  }
  return false;
}

function in_user_assignments(class_ids, assignments, message_id){
  //Iterate over all assignments
  for (const assignment of assignments) {
    //Check if the assignment is in the user's classes
    if (assignment.id == message_id && class_ids.includes(assignment.class)){
      return [assignment['name'], assignment['id']];
    }
  }
  return false;
}

function get_classes_ids(classes){
  //create a list of all the values in the id column of classes
  var ids = [];
  for (const classData of classes) {
    ids.push(classData.id);
  }
  return ids;
}


//Create a fetch request to /data to get Chat, Classes, and Assignments data
async function main(){
console.log("fetching data")
const data = await fetchRequest('/data', { data: "Chat, FILTERED Classes, Assignments" });

  console.log("got data")
  //Store the data in variables
  var messages = data['Chat']
  var classes = data['Classes']
  var assignments = data['Assignments']
  
  
  show_recent_messages(messages, classes, assignments);
  console.log("done")
  return true;
}



main();

function playFullScreenVideo() {
  const videoContainer = document.createElement('div');
  videoContainer.style.position = 'fixed';
  videoContainer.style.top = '0';
  videoContainer.style.left = '0';
  videoContainer.style.width = '100%';
  videoContainer.style.height = '100%';
  videoContainer.style.backgroundColor = 'black';
  videoContainer.style.zIndex = '9999';

  const video = document.createElement('video');
  video.src = '/static/media/SignUpVid.mp4'; // Adjust the path as needed
  video.style.width = '100%';
  video.style.height = '100%';
  video.style.objectFit = 'contain';
  video.autoplay = true;
  video.muted = true; // Mute the video initially
  video.playsInline = true; // For iOS support

  const unmuteButton = document.createElement('button');
  unmuteButton.textContent = 'Unmute';
  unmuteButton.style.position = 'absolute';
  unmuteButton.style.bottom = '20px';
  unmuteButton.style.left = '50%';
  unmuteButton.style.transform = 'translateX(-50%)';
  unmuteButton.style.padding = '10px 20px';
  unmuteButton.style.fontSize = '16px';
  unmuteButton.style.cursor = 'pointer';

  unmuteButton.onclick = () => {
    video.muted = false;
    unmuteButton.style.display = 'none';
  };

  video.onended = () => {
    document.body.removeChild(videoContainer);
  };

  videoContainer.appendChild(video);
  videoContainer.appendChild(unmuteButton);
  document.body.appendChild(videoContainer);
  

  // Attempt to play the video
  const playPromise = video.play();

  if (playPromise !== undefined) {
    playPromise.then(_ => {
      // Autoplay started successfully
      console.log("Video started playing automatically");
    }).catch(error => {
      // Autoplay was prevented
      console.log("Autoplay was prevented. Please interact with the page to play the video.");
      // You could add a play button here if needed
    });
  }
}

// Add this code at the end of the file
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('signup') === 'true') {
  playFullScreenVideo();
}


// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAj7iUJlTR_JDvq62rmfe6eZZXvtsO8Cac",
  authDomain: "sturdy-analyzer-381018.firebaseapp.com",
  projectId: "sturdy-analyzer-381018",
  storageBucket: "sturdy-analyzer-381018.appspot.com",
  messagingSenderId: "800350153500",
  appId: "1:800350153500:web:3da9c736e97b9f582928d9",
  measurementId: "G-TGW6CJ0H1Q"
};

// VAPID key for web push
const vapidKey = 'BCoZeBvXxYJwgPvsOtcd1JNaqkzw2-KvZlsEGp1UdWVJ67HOF_1T70IfJKKiCOF1tvx4M1aSvm4u-IJZA_ZTPUk';

// Initialize Firebase and get messaging object
function initializeFirebase() {
  const app = initializeApp(firebaseConfig);
  return getMessaging(app);
}

// Request notification permission
async function requestNotificationPermission() {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    updateNotificationUI(false, "Please allow notifications for SciWeb.");
    throw new Error('Notification permission not granted.');
  }
}

// Get FCM token
async function getFCMToken(messaging) {
  try {
    const currentToken = await getToken(messaging, { vapidKey: vapidKey });
    if (!currentToken) {
      updateNotificationUI(false, "No registration token available.");
      throw new Error('No registration token available.');
    }
    return currentToken;
  } catch (error) {
    console.error('An error occurred while retrieving token.', error);
    updateNotificationUI(false, "An error occurred while retrieving token.");
    throw error;
  }
}

// Save token to server
async function saveTokenToServer(token) {
  const deviceName = navigator.userAgent;
  const currentTokens = await fetchRequest('/data', {data: "FILTERED Tokens"});
  const userTokens = currentTokens['Tokens'].filter(t => t.OSIS === osis);
  const timeStamp = Date.now();
  
  if (!userTokens.some(t => t.token === token)) {
    await fetchRequest('/post_data', {
      data: {
        "token": token,
        "OSIS": osis,
        "deviceName": deviceName,
        "timeStamp": timeStamp
      },
      sheet: "Tokens"
    });
    console.log("New token added for device:", deviceName);
    updateNotificationUI(true, "Notifications are enabled for this device.");
  } else {
    console.log("Token already exists for this user and device.");
    updateNotificationUI(true, "Notifications are already enabled for this device.");
  }
}

// Main function to handle messaging setup
async function setupMessaging() {
  if (!('serviceWorker' in navigator)) {
    console.log('Service workers are not supported in this browser.');
    updateNotificationUI(false, "Sorry, but notifications are not supported in this browser.");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
    console.log('ServiceWorker registration successful with scope:', registration.scope);

    await new Promise((resolve) => {
      if (registration.active) {
        resolve();
      } else {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              resolve();
            }
          });
        });
      }
    });

    const messaging = initializeFirebase();
    await requestNotificationPermission();
    const token = await getFCMToken(messaging);
    await saveTokenToServer(token);

    // Set up message listener
    onMessage(messaging, (payload) => {
      console.log('Message received:', payload);
      // Handle incoming message here
    });

  } catch (error) {
    console.error('Error setting up messaging:', error);
  }
}




function updateNotificationUI(isEnabled, errorText) {
  // define all the elements that are used in the function
  const notificationsIcon = document.getElementById('notificationsIcon');
  const notificationsEnabled = document.getElementById('notificationsEnabled');
  const notificationsDisabled = document.getElementById('notificationsDisabled');
  const retryButton = document.getElementById('retryButton');
  const errorElement = document.getElementById('errorText');
  // update the elements
  notificationsEnabled.style.display = isEnabled ? 'inline' : 'none';
  notificationsDisabled.style.display = isEnabled ? 'none' : 'inline';
  errorElement.style.display = isEnabled ? 'none' : 'block';
  retryButton.style.display = isEnabled ? 'none' : 'block';

  errorElement.innerHTML = errorText;
}

function initializeFeatureBoxes() {
  const featureBoxes = document.querySelectorAll('.feature-box');
  featureBoxes.forEach(box => {
      box.addEventListener('click', () => {
          window.location.href = box.dataset.href;
      });
  });
}

// Call setupMessaging when the page loads
window.addEventListener('load', () => {
  setupMessaging();
  initializeFeatureBoxes();
});
