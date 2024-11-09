import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging.js"
import { typeOutText, await_enter, AI_response } from './counselor.js';





// Create function show_recent_messages to display the number and location of messages that were sent in the last 24 hours in classes and assignments that the user is in
function show_recent_messages(messages, classes, assignments, friends, users){
  const recent_messages_container = document.getElementById('recent_messages');
  const recent_messages = messages.filter(message => is_recent(message.timestamp));
  // show the number of recent messages in large lettering
  const num_messages_div = document.createElement('div');
  num_messages_div.style.fontSize = '48px';
  num_messages_div.style.fontWeight = 'bold';
  num_messages_div.innerHTML = `${recent_messages.length}`;
  recent_messages_container.appendChild(num_messages_div);
  // for each location of recent messages, display the number of messages, the location, and the link to the message page
  // get unique locations
  const unique_locations = [...new Set(recent_messages.map(message => message.location))];
  unique_locations.forEach(location => {
    const message_div = document.createElement('div');
    let name = get_location_name(location, classes, assignments, friends, users);
    let num_messages = recent_messages.filter(message => message.location == location).length;
    let link = `/Messages?thread=${location}`;
    const message_link = document.createElement('a');
    message_link.href = link;
    message_link.innerHTML = `${name}`;
    message_div.appendChild(message_link);
    message_div.innerHTML += ` (${num_messages})`;
    recent_messages_container.appendChild(message_div);
  });
}


function is_recent(timestamp){
  //Check if the timestamp is less than 24 hours ago
  if (timestamp > Date.now() - 86400000){
    return true;
  }
  return false;
}

function get_location_name(location, classes, assignments, friends, users){
  // if one of the ids of a class is the location, return the name of the class
  if (classes.some(c => c.id == location)){
    return classes.filter(c => c.id == location)[0].name;
  }
  // if one of the ids of an assignment is the location, return the name of the assignment
  if (assignments.some(a => a.id == location)){
    return assignments.filter(a => a.id == location)[0].name;
  }
  // if one of the ids of a league is the location, return the name of the league
  if (leagues.some(l => l.id == location)){
    return leagues.filter(l => l.id == location)[0].name;
  }
  // if one of the ids of a friend is the location, return the name of the friend
  if (friends.some(f => f.OSIS+f.targetOSIS == location || f.targetOSIS+f.OSIS == location)){
    if (f.OSIS == osis){
      return users.filter(u => u.osis == f.targetOSIS)[0].first_name;
    } else {
      return users.filter(u => u.osis == f.OSIS)[0].first_name;
    }
  }
  return "Unknown Location";
}

//Create a fetch request to /data to get Chat, Classes, and Assignments data
async function main(){
  initializeChat(first_name);
  // Get dashboard position
  const dashboard = document.getElementById('dashboard');
  const dashboardTop = dashboard.offsetTop;
  
  // Start loading animation above the dashboard
  startLoading(dashboardTop + 180); // 50px above dashboard
  
  console.log("fetching data")
  const data = await fetchRequest('/data', { data: "Name, Chat, Classes, Assignments, Aspirations, Friends, Grades, Users" });

  console.log("got data")
  //Store the data in variables
  var messages = data['Chat']
  var classes = data['Classes']
  var assignments = data['Assignments']
  var aspirations = data['Aspirations']
  var friends = data['Friends']
  var grades = data['Grades']
  var users = data['Users']
  
  show_recent_messages(messages, classes, assignments, friends, users);
  show_assignments_due_tmrw(assignments);
  show_aspirations_due_today(aspirations);
  show_pending_friend_requests(friends, users);
  show_recent_grades(grades);
  console.log("done")
  endLoading();
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
  const currentTokens = await fetchRequest('/data', {data: "Name, Tokens"});
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

function show_assignments_due_tmrw(assignments){
  const assignments_container = document.getElementById('assignments_due_tmrw');
  // get tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  // filter assignment due date for tomorrow
  const assignments_due_tmrw = assignments.filter(assignment => assignment.due_date === tomorrow.toISOString().split('T')[0]);
  
  // display the number of assignments due tomorrow in large lettering
  const num_assignments_div = document.createElement('div');
  num_assignments_div.style.fontSize = '48px';
  num_assignments_div.style.fontWeight = 'bold';
  num_assignments_div.innerHTML = `${assignments_due_tmrw.length}`;
  assignments_container.appendChild(num_assignments_div);

  // display the assignments due tomorrow with class/name and link to assignment page
  assignments_due_tmrw.forEach(assignment => {
    const assignment_div = document.createElement('div');
    const assignment_link = document.createElement('a');
    assignment_link.href = `/assignment/${assignment.id}`;
    assignment_link.innerHTML = `${assignment.class} - ${assignment.name}`;
    assignment_div.appendChild(assignment_link);
    assignments_container.appendChild(assignment_div);
  });
}

function show_aspirations_due_today(aspirations){
  return true;
}

function show_pending_friend_requests(friends, users){
  const pending_friend_requests_container = document.getElementById('pending_friend_requests');
  // filter for requests where request.status is pending
  const pending_friend_requests = friends.filter(friend => friend.status === 'pending');
  // display the number of pending friend requests in large lettering
  const num_pending_friend_requests_div = document.createElement('div');
  num_pending_friend_requests_div.style.fontSize = '48px';
  num_pending_friend_requests_div.style.fontWeight = 'bold';
  num_pending_friend_requests_div.innerHTML = `${pending_friend_requests.length}`;
  pending_friend_requests_container.appendChild(num_pending_friend_requests_div);
  // display the pending friend requests with name and link to profile page
  pending_friend_requests.forEach(friend => {
    // get other user's osis: there is OSIS and targetOSIS, pick the one that is not osis
    const other_user_osis = friend.OSIS === osis ? friend.targetOSIS : friend.OSIS;
    // get other user's name
    const other_user_name = users.filter(user => user.osis == other_user_osis)[0].first_name;
    const friend_div = document.createElement('div');
    friend_div.innerHTML = other_user_name;
    pending_friend_requests_container.appendChild(friend_div);
  });
  // add a link to the friend requests page
  const friend_requests_link = document.createElement('a');
  friend_requests_link.href = '/Profile';
  friend_requests_link.innerHTML = 'View All';
  pending_friend_requests_container.appendChild(friend_requests_link);
}

function show_recent_grades(grades){
  const recent_grades_container = document.getElementById('recent_grades');
  // get the date 4 days ago
  const four_days_ago = new Date();
  four_days_ago.setDate(four_days_ago.getDate() - 4);
  // filter grades for date 4 days ago
  const recent_grades = grades.filter(grade => new Date(grade.date) > four_days_ago);
  // display the number of recent grades in large lettering
  const num_grades_div = document.createElement('div');
  num_grades_div.style.fontSize = '48px';
  num_grades_div.style.fontWeight = 'bold';
  num_grades_div.innerHTML = `${recent_grades.length}`;
  recent_grades_container.appendChild(num_grades_div);
  // display the recent grades with class name and grade
  recent_grades.forEach(grade => {
    const grade_div = document.createElement('div');
    grade_div.innerHTML = `${grade.class} - ${grade.name}  →  ${grade.score}/${grade.value}`;
    recent_grades_container.appendChild(grade_div);
  });
}

// Add this function to start the chat
async function initializeChat(userName) {
  console.log("initializing chat")
    const chatLog = document.getElementById('chatLog');
    const prompts = [
        {"role": "system", "content": "You are the user's College Counselor. It's your responsibility to tell them their assignments, if they have any tests coming up, recent grades, their goals, etc. You can access any of their data at any time from the database with the get_data/get_grades function."}
    ];
    
    const initialPrompt = `Hey there, ${userName}! How can I help you today?`;
    prompts.push({"role": "assistant", "content": initialPrompt});
    await typeOutText(initialPrompt, 50, chatLog);

    // Start the chat loop
    while (true) {
        const userResponse = await await_enter();
        prompts.push({"role": "user", "content": userResponse});
        const aiResponse = await AI_response(prompts);
        await typeOutText(aiResponse, 50, chatLog);
    }
}

