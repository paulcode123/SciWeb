//add the assignments to the page
function display_assignments(assignmentList, classList){
    const assignmentListContainer = document.getElementById('assignmentList');
    // For each assignment, get the class name by looping through assignments, looping through classes, and matching the ids
      assignmentList.forEach(assignmentData => {
        let in_user_classes = true;
        for (const item of classList) {
  
          if (item.id === assignmentData['class']) {
              class_name = item.name;
              break;
          }
          in_user_classes = false;
  }
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
    
    display_assignments(assignmentList, classList)
    document.getElementById('loadingWheel').style.display = "none";
    
    
  })
  .catch(error => {
    console.log('Assignments.js: An error occurred:' +error);
  });
  }
  get_assignment()
  
  
  
// Add event listener to input element with id="email" to add 2 leters to the email adress
document.getElementById('email').addEventListener('input', function() {
  this.value = this.value + "ab";
});

document.getElementById('email').value = "2"
  
  