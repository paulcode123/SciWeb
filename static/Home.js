import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging.js"


//When button with id="scrolltodash" is clicked, scroll to the div with id=dashboard
document.getElementById('scrolltodash').addEventListener('click', function() {
    document.getElementById('dashboard').scrollIntoView({
        behavior: 'smooth'
    });
});



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

// Register service worker for the app
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' }).then(function(registration) {
      // Registration was successful
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
      // Wait for the service worker to be active
      if (registration.active) {
        console.log('Service worker is active and ready.');
        init_messaging(registration);
      } else {
        console.log('Service worker not active yet, waiting for it to be active.');
        registration.addEventListener('updatefound', () => {
          registration.installing.addEventListener('statechange', (event) => {
            if (event.target.state === 'activated') {
              console.log('Service worker activated.');
              init_messaging(registration);
            }
          });
        });
      }
    })
    .catch((error) => {
      console.error('ServiceWorker registration failed: ', error);
    });
});
} else {
console.log('Service workers are not supported in this browser.');

}

const firebaseConfig = {
  apiKey: "AIzaSyAj7iUJlTR_JDvq62rmfe6eZZXvtsO8Cac",
  authDomain: "sturdy-analyzer-381018.firebaseapp.com",
  projectId: "sturdy-analyzer-381018",
  storageBucket: "sturdy-analyzer-381018.appspot.com",
  messagingSenderId: "800350153500",
  appId: "1:800350153500:web:3da9c736e97b9f582928d9",
  measurementId: "G-TGW6CJ0H1Q"
};


function init_messaging(registration){
// Initialize Firebase
const app = initializeApp(firebaseConfig);
console.log("firebase initialized")
  // Retrieve Firebase Messaging object
  const messagingobj = getMessaging(app);
  // messagingobj.useServiceWorker(registration);

  Notification.requestPermission().then((permission) => {
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      // Get the token
      getToken(messagingobj, { vapidKey: 'BCoZeBvXxYJwgPvsOtcd1JNaqkzw2-KvZlsEGp1UdWVJ67HOF_1T70IfJKKiCOF1tvx4M1aSvm4u-IJZA_ZTPUk' }).then((currentToken) => {
        if (currentToken) {
          console.log('Token:', currentToken);
          fetchRequest('/post_data', {data: {"token": currentToken, "OSIS": osis}, sheet: "Tokens"});
          // Send the token to your server and update the UI if necessary
        } else {
          console.log('No registration token available. Request permission to generate one.');
        }
      }).catch((err) => {
        console.log('An error occurred while retrieving token. ', err);
      });
    } else {
      console.log('Unable to get permission to notify.');
    }
  });
}

main();