
//add event lister to button with id=authorizeGclass to redirect to /init_oauth
document.getElementById('authorizeGclass').addEventListener('click', function() {
  window.location.href = "/init_oauth";
});

//create a fetch request to /get-gclasses to get the user's classes from google classroom, then log them to the console
document.getElementById('getGclasses').addEventListener('click', function() {
  fetch('/get-gclasses', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      data: {"data":"none"}
      
    })
})
  .then(response => response.json())
  .then(data => {
    console.log(data);
  })
  .catch(error => {
    console.log('Assignments.js: An error occurred:' +error);
  });
});

//add the assignments to the page
function display_assignments(assignmentList, classList){
  const assignmentListContainer = document.getElementById('assignmentList');
  // For each assignment, get the class name by looping through assignments, looping through classes, and matching the ids
    assignmentList.forEach(assignmentData => {
      let in_user_classes = false;
      for (const item of classList) {
        
        if (item.id === assignmentData['class']) {
            class_name = item.name;
            
            in_user_classes = true;
        }
        
}
console.log(in_user_classes)
//break if the class is not in the user's classes
  if (in_user_classes){
//create a div element for each assignment
      const assignmentItem = document.createElement('div');
      assignmentItem.classList.add('assignment-item');
      assignmentItem.innerHTML = `
        <h3>Due ${assignmentData.due}</h3>
        <p>Class ${class_name}
        <p>Type: ${assignmentData.categories}</p>
        <p>Name: ${assignmentData.name}</p>
      `;
      //add an event listener to each assignment div so that when the user clicks on it, they are taken to the assignment page
      assignmentItem.addEventListener('click', () => {
        window.location.href = "/assignment/" + assignmentData.id;
      });

      assignmentListContainer.appendChild(assignmentItem);
    }
    });
  
}


//fetch the assignments from the database
function get_assignment(){
  fetch('/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ data: "Assignments, FILTERED Classes" })
})
.then(response => response.json())
.then(data => {
  
  
  assignmentList = data['Assignments']
  classList = data["Classes"]
  console.log(classList)
  display_assignments(assignmentList, classList)
  document.getElementById('loadingWheel').style.display = "none";
  
  
})
.catch(error => {
  console.log('Assignments.js: An error occurred:' +error);
});
}
get_assignment()





