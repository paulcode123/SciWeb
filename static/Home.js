import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging.js"
import { typeOutText, await_enter, AI_response } from './counselor.js';

// Add Shepherd.js for the tutorial
const shepherdScript = document.createElement('script');
shepherdScript.src = 'https://cdn.jsdelivr.net/npm/shepherd.js@11.1.1/dist/js/shepherd.min.js';
document.head.appendChild(shepherdScript);

const shepherdStyles = document.createElement('link');
shepherdStyles.rel = 'stylesheet';
shepherdStyles.href = 'https://cdn.jsdelivr.net/npm/shepherd.js@11.1.1/dist/css/shepherd.css';
document.head.appendChild(shepherdStyles);

var notificationsEnabled = false;


// Create function show_recent_messages to display the number and location of messages that were sent in the last 24 hours in classes and assignments that the user is in
function show_recent_messages(messages, classes, assignments, friends, users){
  const recent_messages_container = document.getElementById('recent_messages');
  // Clear container first
  recent_messages_container.innerHTML = '';
  
  const recent_messages = messages.filter(message => is_recent(message.timestamp));
  // show the number of recent messages in large lettering
  const num_messages_div = document.createElement('div');
  num_messages_div.style.fontSize = '48px';
  num_messages_div.style.fontWeight = 'bold';
  num_messages_div.innerHTML = `${recent_messages.length}`;
  recent_messages_container.appendChild(num_messages_div);

  // Remove duplicates when getting unique locations
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
  // Remove initializeChat call from here since it's called in the load event
  
  // Get dashboard position
  const dashboard = document.getElementById('dashboard');
  const dashboardTop = dashboard.offsetTop;
  
  // Start loading animation above the dashboard
  // startLoading(dashboardTop + 180); // 50px above dashboard
  
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
  // endLoading();
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
  video.src = '/static/media/SignUpVid.mp4';
  video.style.width = '100%';
  video.style.height = '100%';
  video.style.objectFit = 'contain';
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;

  // Create button container
  const buttonContainer = document.createElement('div');
  buttonContainer.style.position = 'absolute';
  buttonContainer.style.bottom = '20px';
  buttonContainer.style.left = '0';
  buttonContainer.style.right = '0';
  buttonContainer.style.display = 'flex';
  buttonContainer.style.justifyContent = 'center';
  buttonContainer.style.gap = '20px';

  // Updated unmute button styling
  const unmuteButton = document.createElement('button');
  unmuteButton.textContent = '🔊 Unmute';
  unmuteButton.className = 'video-control-btn';

  // New skip button
  const skipButton = document.createElement('button');
  skipButton.textContent = '⏭️ Skip Intro';
  skipButton.className = 'video-control-btn';

  // Add button styles
  const buttonStyle = `
    background: rgba(228, 76, 101, 0.9);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 25px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: transform 0.2s, background 0.2s;
    text-transform: uppercase;
    letter-spacing: 1px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  `;

  unmuteButton.style.cssText = buttonStyle;
  skipButton.style.cssText = buttonStyle;

  // Add hover effects
  [unmuteButton, skipButton].forEach(btn => {
    btn.addEventListener('mouseover', () => {
      btn.style.transform = 'scale(1.05)';
      btn.style.background = 'rgba(228, 76, 101, 1)';
    });
    btn.addEventListener('mouseout', () => {
      btn.style.transform = 'scale(1)';
      btn.style.background = 'rgba(228, 76, 101, 0.9)';
    });
  });

  unmuteButton.onclick = () => {
    video.muted = false;
    unmuteButton.style.display = 'none';
  };

  // Function to clean up video and start tutorial
  const endVideoAndStartTutorial = () => {
    document.body.removeChild(videoContainer);
    console.log("Video ended");
    // Start the tutorial after the video ends
    setTimeout(startTutorial, 500); // Small delay to ensure smooth transition
  };

  skipButton.onclick = () => {
    endVideoAndStartTutorial();
  };

  video.onended = () => {
    endVideoAndStartTutorial();
  };

  buttonContainer.appendChild(unmuteButton);
  buttonContainer.appendChild(skipButton);
  videoContainer.appendChild(video);
  videoContainer.appendChild(buttonContainer);
  document.body.appendChild(videoContainer);

  const playPromise = video.play();
  if (playPromise !== undefined) {
    playPromise.catch(error => {
      console.log("Autoplay was prevented:", error);
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

// Function to check if device is mobile
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Save token to server
async function saveTokenToServer(token) {
  const deviceName = navigator.userAgent;
  const currentTokens = await fetchRequest('/data', {data: "Name, Tokens"});
  const userTokens = currentTokens['Tokens'].filter(t => parseInt(t.OSIS) == parseInt(osis));
  console.log("userTokens", userTokens);
  const timeStamp = Date.now();
  
  if (userTokens.length === 0) {
    // No existing token, add new one
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
    notificationsEnabled = true;
  } else {
    // Token exists, check if it needs updating
    const existingToken = userTokens[0].token;
    if (token !== existingToken) {
      // Update the token using update_data route
      await fetchRequest('/update_data', {
        sheet: "Tokens",
        data: {
          "token": token,
          "deviceName": deviceName,
          "timeStamp": timeStamp
        },
        row_name: "OSIS",
        row_value: osis
      });
      console.log("Token updated for device:", deviceName);
    }
    updateNotificationUI(true, "Notifications are enabled for this device.");
    notificationsEnabled = true;
  }
}

// Main function to handle messaging setup
async function setupMessaging() {
  if (!('serviceWorker' in navigator)) {
    console.log('Service workers are not supported in this browser.');
    updateNotificationUI(false, "Sorry, but notifications are not supported in this browser.");
    return;
  }

  // Check if this is a mobile device
  const isMobile = isMobileDevice();
  
  try {
    // For desktop devices, just check if notifications exist
    if (!isMobile) {
      const currentTokens = await fetchRequest('/data', {data: "Name, Tokens"});
      const userTokens = currentTokens['Tokens'].filter(t => parseInt(t.OSIS) == parseInt(osis));
      if (userTokens.length > 0) {
        console.log("Notifications are enabled on mobile device");
        updateNotificationUI(true, "Notifications are enabled on your mobile device.");
        notificationsEnabled = true;
      } else {
        updateNotificationUI(false, "Enable notifications on your mobile device to receive updates.");
      }
      return;
    }

    // For mobile devices, proceed with notification setup
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
    updateNotificationUI(false, "Error setting up notifications.");
  }
}




function updateNotificationUI(isEnabled, message) {
  // define all the elements that are used in the function
  const notificationsIcon = document.getElementById('notificationsIcon');
  const notificationsEnabled = document.getElementById('notificationsEnabled');
  const notificationsDisabled = document.getElementById('notificationsDisabled');
  const errorElement = document.getElementById('errorText');

  // update the elements
  notificationsEnabled.style.display = isEnabled ? 'inline' : 'none';
  notificationsDisabled.style.display = isEnabled ? 'none' : 'inline';
  errorElement.style.display = 'none';  // Initially hidden

  // Set up hover behavior
  const iconToShow = isEnabled ? notificationsEnabled : notificationsDisabled;
  iconToShow.title = message;  // Show message on hover

  // Set up hover events for showing/hiding the message
  iconToShow.addEventListener('mouseenter', () => {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    errorElement.style.position = 'absolute';
    errorElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    errorElement.style.color = 'white';
    errorElement.style.padding = '8px';
    errorElement.style.borderRadius = '4px';
    errorElement.style.fontSize = '14px';
    errorElement.style.maxWidth = '200px';
    errorElement.style.textAlign = 'center';
    errorElement.style.transform = 'translateY(30px)';
    errorElement.style.zIndex = '1000';
  });

  iconToShow.addEventListener('mouseleave', () => {
    errorElement.style.display = 'none';
  });
}

// Call setupMessaging when the page loads
window.addEventListener('load', () => {
  setupMessaging();
});

function show_assignments_due_tmrw(assignments){
  const assignments_container = document.getElementById('assignments_due_tmrw');
  // Clear container first
  assignments_container.innerHTML = '';
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Filter and remove duplicates
  const assignments_due_tmrw = assignments
    .filter(assignment => assignment.due_date === tomorrow.toISOString().split('T')[0])
    .filter((assignment, index, self) => 
      index === self.findIndex(a => 
        a.id === assignment.id
      )
    );
  
  const num_assignments_div = document.createElement('div');
  num_assignments_div.style.fontSize = '48px';
  num_assignments_div.style.fontWeight = 'bold';
  num_assignments_div.innerHTML = `${assignments_due_tmrw.length}`;
  assignments_container.appendChild(num_assignments_div);

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
  // Clear container first
  pending_friend_requests_container.innerHTML = '';
  
  // Filter and remove duplicates
  const pending_friend_requests = friends
    .filter(friend => friend.status === 'pending')
    .filter((friend, index, self) => 
      index === self.findIndex(f => 
        f.OSIS === friend.OSIS && f.targetOSIS === friend.targetOSIS
      )
    );

  const num_pending_friend_requests_div = document.createElement('div');
  num_pending_friend_requests_div.style.fontSize = '48px';
  num_pending_friend_requests_div.style.fontWeight = 'bold';
  num_pending_friend_requests_div.innerHTML = `${pending_friend_requests.length}`;
  pending_friend_requests_container.appendChild(num_pending_friend_requests_div);

  pending_friend_requests.forEach(friend => {
    const other_user_osis = friend.OSIS === osis ? friend.targetOSIS : friend.OSIS;
    const other_user_name = users.filter(user => user.osis == other_user_osis)[0].first_name;
    const friend_div = document.createElement('div');
    friend_div.innerHTML = other_user_name;
    pending_friend_requests_container.appendChild(friend_div);
  });

  const friend_requests_link = document.createElement('a');
  friend_requests_link.href = '/Profile';
  friend_requests_link.innerHTML = 'View All';
  pending_friend_requests_container.appendChild(friend_requests_link);
}

function show_recent_grades(grades){
  const recent_grades_container = document.getElementById('recent_grades');
  // Clear the container first to prevent duplicates
  recent_grades_container.innerHTML = '';
  
  // get the date 4 days ago
  const four_days_ago = new Date();
  four_days_ago.setDate(four_days_ago.getDate() - 4);
  
  // filter grades for date 4 days ago and remove duplicates
  const recent_grades = grades
    .filter(grade => new Date(grade.date) > four_days_ago)
    // Remove duplicates based on class, name, and score
    .filter((grade, index, self) => 
      index === self.findIndex(g => 
        g.class === grade.class && 
        g.name === grade.name && 
        g.score === grade.score
      )
    );
  
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

// Add path definitions
const paths = [
    {
        name: "Lock in",
        features: [
            { name: "Scheduler", icon: "fa-calendar", href: "/Schedule", description: "Plan your day" },
            { name: "Assignments", icon: "fa-tasks", href: "/Assignments", description: "Track your work" },
            { name: "Levels", icon: "fa-trophy", href: "/Levels", description: "Track your progress" }
        ]
    },
    {
        name: "Chill out",
        features: [
            { name: "Messages", icon: "fa-comments", href: "/Messages", description: "Chat with friends" },
            { name: "Battles", icon: "fa-gamepad", href: "/Battles", description: "Challenge others" },
            { name: "Leagues", icon: "fa-users", href: "/Leagues", description: "Join communities" }
        ]
    },
    {
        name: "What a scholar",
        features: [
            { name: "Enter Grades", icon: "fa-plus-circle", href: "/EnterGrades", description: "Add new grades" },
            { name: "Evaluate", icon: "fa-chart-line", href: "/Evaluate", description: "Track your performance" },
            { name: "Goals", icon: "fa-bullseye", href: "/Goals", description: "Set & track goals" }
        ]
    },
    {
        name: "Teamwork makes the Dream Work",
        features: [
            { name: "Notebook", icon: "fa-book", href: "/Notebook", description: "Take & share notes" },
            { name: "Classes", icon: "fa-chalkboard-teacher", href: "/Classes", description: "Manage your courses" },
            { name: "Leagues", icon: "fa-users", href: "/Leagues", description: "Join study groups" }
        ]
    }
];

// Initialize paths UI
function initializePaths() {
    const pathWrapper = document.querySelector('.path-wrapper');
    let currentPath = 0;

    // Create path sections
    paths.forEach(path => {
        const pathSection = document.createElement('div');
        pathSection.className = 'path';
        pathSection.innerHTML = `
            <h2>${path.name}</h2>
            ${path.features.map(feature => `
                <div class="feature-box" data-href="${feature.href}">
                    <i class="fas ${feature.icon}"></i>
                    <h3>${feature.name}</h3>
                    <p>${feature.description}</p>
                </div>
            `).join('')}
        `;
        pathWrapper.appendChild(pathSection);
    });

    // Add click handlers to feature boxes
    const featureBoxes = document.querySelectorAll('.feature-box');
    featureBoxes.forEach(box => {
        box.addEventListener('click', () => {
            const href = box.getAttribute('data-href');
            if (href) {
                window.location.href = href;
            }
        });
    });

    // Navigation handlers
    document.querySelector('.nav-arrow.next').addEventListener('click', () => {
        if (currentPath < paths.length - 1) {
            currentPath++;
            updatePathPosition();
        }
    });

    document.querySelector('.nav-arrow.prev').addEventListener('click', () => {
        if (currentPath > 0) {
            currentPath--;
            updatePathPosition();
        }
    });

    function updatePathPosition() {
        pathWrapper.style.transform = `translateX(-${currentPath * 100}%)`;
    }
}

// Update chat initialization
async function initializeChat() {
    const greeting = document.getElementById('initial-greeting');
    // wait until first_name is defined
    while (!first_name) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    const initialPrompt = `Hey there, ${first_name}!`;
    
    // Type out initial greeting
    await typeOutText(initialPrompt, 50, greeting);

    // Initialize the chat interface
    const userInput = document.getElementById('user-input');
    const chatLog = document.getElementById('chat-log');

    // Handle chat input focus
    userInput.addEventListener('focus', () => {
        greeting.style.opacity = 0;
        setTimeout(() => greeting.style.display = 'none', 500);
    });

    // Start the counselor chat
    var prompts = [{
        "role": "system", 
        "content": "You are the user's College Counselor. It's your responsibility to tell them their assignments, if they have any tests coming up, recent grades, their goals, etc. You can access any of their data at any time from the database with the get_data/get_grades function."
    }];
    
    const welcomeMessage = "Hello, I am your SciWeb Counselor. How can I help you today?";
    prompts.push({"role": "assistant", "content": welcomeMessage});
    await typeOutText(welcomeMessage, 50, chatLog);

    // Add keydown event listener directly to the input field
    userInput.addEventListener('keydown', async (event) => {
        if (event.key === 'Enter') {
            const userResponse = userInput.value.trim();
            if (userResponse) {
                // Clear input field
                userInput.value = '';
                
                // Add user message to chat log
                const userMessageDiv = document.createElement('div');
                userMessageDiv.className = 'user-message';
                userMessageDiv.textContent = userResponse;
                chatLog.appendChild(userMessageDiv);
                chatLog.scrollTop = chatLog.scrollHeight;

                // Add to prompts and get AI response
                prompts.push({"role": "user", "content": userResponse});
                const aiResponse = await AI_response(prompts);
                prompts.push({"role": "assistant", "content": aiResponse});
                await typeOutText(aiResponse, 50, chatLog);
            }
        }
    });
}

// Call on load - consolidate all initialization here
window.addEventListener('load', async () => {
    initializePaths();
    setupMessaging();
    await initializeChat();
    await main();  // Move main() call here to ensure proper order
});

function startTutorial() {
  console.log("Starting tutorial");
  
  // Check if Shepherd is loaded
  if (typeof Shepherd === 'undefined') {
    console.log("Waiting for Shepherd to load...");
    setTimeout(startTutorial, 100);
    return;
  }
  
  const tour = new Shepherd.Tour({
    useModalOverlay: true,
    defaultStepOptions: {
      classes: 'shadow-md bg-purple-dark',
      scrollTo: true,
      cancelIcon: {
        enabled: true
      },
      popperOptions: {
        modifiers: [{ name: 'offset', options: { offset: [0, 12] } }]
      }
    }
  });

  // Welcome step
  tour.addStep({
    id: 'welcome',
    text: 'Welcome to SciWeb! Let\'s take a quick tour to help you get started.',
    buttons: [{
      text: 'Let\'s go!',
      action: tour.next
    }]
  });

  // AI Counselor
  tour.addStep({
    id: 'ai-counselor',
    text: 'Meet your AI counselor! You can ask them anything about your assignments, grades, or get help with your academic journey.',
    attachTo: {
      element: '.ai-section',
      on: 'bottom'
    },
    buttons: [{
      text: 'Next',
      action: tour.next
    }]
  });

  // Features Section
  tour.addStep({
    id: 'features',
    text: 'These are your main features. You can swipe through different paths to access various tools.',
    attachTo: {
      element: '.features-section',
      on: 'bottom'
    },
    buttons: [{
      text: 'Next',
      action: tour.next
    }]
  });

  // Dashboard Overview
  tour.addStep({
    id: 'dashboard',
    text: 'Your dashboard gives you a quick overview of everything important: recent messages, upcoming assignments, and your latest grades.',
    attachTo: {
      element: '#dashboard',
      on: 'top'
    },
    buttons: [{
      text: 'Let\'s check grades',
      action: () => {
        // Find and click the Enter Grades feature box or navigate directly
        const gradeBox = Array.from(document.querySelectorAll('.feature-box'))
          .find(box => box.querySelector('h3').textContent === 'Enter Grades');
        if (gradeBox) {
          window.location.href = '/EnterGrades?tutorial=true';
        } else {
          window.location.href = '/EnterGrades?tutorial=true';
        }
      }
    }]
  });

  // TodoList (will navigate to TodoTree page)
  tour.addStep({
    id: 'todo',
    text: 'Next, let\'s check out the Todo List where you can organize your tasks and track your progress.',
    attachTo: {
      element: '.feature-box[data-href="/TodoTree"]',
      on: 'bottom'
    },
    buttons: [{
      text: 'Show me the Todo List',
      action: () => {
        window.location.href = '/TodoTree';
      }
    }]
  });

  // Profile (will be shown when they return)
  tour.addStep({
    id: 'profile',
    text: 'Don\'t forget to set up your profile and notification preferences!',
    attachTo: {
      element: '#notificationsIcon',
      on: 'bottom'
    },
    buttons: [{
      text: 'Next',
      action: tour.next
    }]
  });

  // Messages
  tour.addStep({
    id: 'messages',
    text: 'Finally, check out Messages to connect with your classmates and join class discussions.',
    attachTo: {
      element: '#recent_messages',
      on: 'left'
    },
    buttons: [{
      text: 'Try sending a message',
      action: () => {
        // Find and click the Messages feature box
        const messageBox = Array.from(document.querySelectorAll('.feature-box'))
          .find(box => box.querySelector('h3').textContent === 'Messages');
        if (messageBox) {
          messageBox.click();
        }
      }
    }]
  });

  // Final step
  tour.addStep({
    id: 'finish',
    text: 'That\'s it! You\'re all set to start using SciWeb. Remember, your AI counselor is always here to help!',
    buttons: [{
      text: 'Start Using SciWeb',
      action: tour.complete
    }]
  });

  // Handle tour completion
  tour.on('complete', () => {
    localStorage.setItem('tutorialCompleted', 'true');
  });

  // Start the tour
  tour.start();
}

