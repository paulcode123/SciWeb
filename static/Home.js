//When button with id="scrolltodash" is clicked, scroll to the div with id=dashboard
document.getElementById('scrolltodash').addEventListener('click', function() {
    document.getElementById('dashboard').scrollIntoView({
        behavior: 'smooth'
    });
});
//bell schedule, values in total minutes of day example: 2AM would be 120 minutes
var bellSchedule = [0, 485, 531, 577, 625, 671, 717, 763, 809, 855, 902]
var thursBellSchedule = [0, 486, 530, 574, 618, 633, 677, 721, 765, 809, 853, 897]


// Create function to show date + time
function getPeriod(){
  // get the time in minutes since midnight
  var today = new Date();
  var time = today.getMinutes() + (today.getHours() * 60)
  console.log(time)
  var isThursday = (today.getDay() === 4);
  if (isThursday == true){
    for(let i = 0; i < thursBellSchedule.length; i++){
      if (time < thursBellSchedule[i + 1]){
        return i
      }
      else if (i < 500){
        return 0
      }
    }
  } else {
    for(let i = 0; i < bellSchedule.length; i++){
      if (time < bellSchedule[i + 1]){
        return i
        
      }
      else if (i < 460){
        return 0
      }
    }
  }
}
function datechecker(){
  var today = new Date();
  if(today.getMinutes() > 500 || today.getDay() == 0 || today.getDay() == 6){
    return false
  }
  else{
    return true
  }
  
}
function updateTime(){
  var period = getPeriod()
  console.log(period)
  var today = new Date();
  var time = today.getMinutes() + (today.getHours() * 60)
  var isThursday = today.getDay() === 4;
  if (isThursday == true){
    var timeRemaining = thursBellSchedule[period + 1] - time;
  } else{
    var timeRemaining = bellSchedule[period + 1] - time;
  }
  return timeRemaining;

}
function hTimer() {
  
    var minRemaining = updateTime(); - 1
    var secRemaining = 60-(new Date().getSeconds());
    
    // if secRemaining is less than 10, add a 0 in front of it
    if (secRemaining < 10){
      secRemaining = "0" + secRemaining;
    }
    document.getElementById("timer").textContent = minRemaining + ":" + secRemaining;
}

// Create function show_recent_messages to display the number and location of messages that were sent in the last 24 hours in classes and assignments that the user is in
function show_recent_messages(messages, classes, assignments){
  //Create a variable to store the data in format [{location: assignment and/or class, num_messages: number of messages sent in the last 24 hours, id: id of the assignment or class}]
  var locations = [];
  var class_ids = get_classes_ids(classes);
  
  //Iterate over all messages
  for (const message of messages) {
    var in_classes = in_user_classes(message.location, classes);
    var in_assignments = in_user_assignments(class_ids, assignments, message.location);
    var recent = is_recent(message.timestamp);
    
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
window.onload = function() {
  if (datechecker() === true){
  setInterval(hTimer, 1000);
  }
  else{
    document.getElementById("timer").textContent = "No School :D";
  }
  
  console.log("Its always around me, all this noise but Not nearly as loud as the voice sayin Let it happen, let it happenIt's gonna feel so good Just let it happen, let it happen. Im a heartbreakerstomperliterallyeverywhereatonce")
  
} 
window.addEventListener("DOMContentLoaded", (event) => {
  console.log("DOM fully loaded and parsed, going with whatg i always longed forrrrrrr feel like a brandnew person making the same msitakes");
});

//Create a fetch request to /data to get Chat, Classes, and Assignments data
async function main(){

const data = await fetchRequest('/data', { data: "Chat, FILTERED Classes, Assignments" });

  
  //Store the data in variables
  var messages = data['Chat']
  var classes = data['Classes']
  var assignments = data['Assignments']
  
  
  show_recent_messages(messages, classes, assignments);
  
  return true;
  


}

// Register service worker for the app
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/static/service-worker.js').then(function(registration) {
      // Registration was successful
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }, function(err) {
      // registration failed :(
      console.log('ServiceWorker registration failed: ', err);
    }).catch(function(err) {
      console.log(err)
    });
  });
} else {
  console.log('Service workers are not supported.');
}


main();