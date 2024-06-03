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


//Create a fetch request to /data to get Chat, Classes, Assignments, Grades data
console.log("fetching data")
fetch('/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ data: "Chat, FILTERED Classes, Assignments, FILTERED Grades" })
})
.then(response => response.json())
.then(data => {
  console.log("got data")
  //Store the data in variables
  var messages = data['Chat']
  var classes = data['Classes']
  var assignments = data['Assignments']
  
  
  show_recent_messages(messages, classes, assignments);
  display_recent_scores(data.Grades);
  console.log("done")
  return true;
})
.catch(error => {
  console.error('An error occurred in Home.js: ' +error);
  return false;
});

function display_recent_scores(grades) {
  const recentScoresDiv = document.getElementById('recent_scores');
  recentScoresDiv.innerHTML = ''; // Clear existing content

  function is_recent(timestamp){
    //Check if the timestamp is less than 24 hours ago
    if (timestamp > Date.now() - 86400000){
      return true;
    }
    return false;
  }

  grades.forEach(grade => {
      const gradeDate = new Date(grade.date);
      if (gradeDate >= past48Hours) {
          // Create a card for each recent grade
          const scoreCard = document.createElement('div');
          scoreCard.className = 'score-card';

          // Assignment name
          const assignmentName = document.createElement('h3');
          assignmentName.textContent = grade.assignment_name;
          scoreCard.appendChild(assignmentName);

          // Score
          const score = document.createElement('p');
          score.textContent = `Score: ${grade.score}`;
          scoreCard.appendChild(score);

          // Class and category
          const classLink = document.createElement('a');
          classLink.href = `/class/${grade.class_id}`;
          classLink.textContent = grade.class_name;
          scoreCard.appendChild(classLink);

          const category = document.createElement('p');
          category.textContent = `Category: ${grade.category}`;
          scoreCard.appendChild(category);

          // Impact on grades and GPA
          const impact = calculate_impact(grade, data.grades);
          const impactText = document.createElement('p');
          impactText.textContent = `Impact on GPA: ${impact.gpaImpact}, Class Grade: ${impact.classImpact}, Category Grade: ${impact.categoryImpact}`;
          scoreCard.appendChild(impactText);

          // Append score card to the recent scores div
          recentScoresDiv.appendChild(scoreCard);
      }
  });
}

// Function to calculate the impact of a grade
function calculate_impact(grade, allGrades) {
  const classGrades = allGrades.filter(g => g.class_id === grade.class_id);
  const categoryGrades = classGrades.filter(g => g.category === grade.category);

  let totalScore = 0, totalWeight = 0;
  categoryGrades.forEach(g => {
      totalScore += g.score * g.weight;
      totalWeight += g.weight;
  });

  const newTotalScore = totalScore + (grade.score * grade.weight);
  const newTotalWeight = totalWeight + grade.weight;

  const classImpact = (newTotalScore / newTotalWeight).toFixed(2);
  const gpaImpact = (classImpact / 25).toFixed(2);  // Assume GPA scale factor
  const categoryImpact = (grade.score / newTotalWeight).toFixed(2);

  return { gpaImpact, classImpact, categoryImpact };
}