// classData is predefined in the html

// create user bubbles
document.getElementById("description").textContent = classData['description']
var userListContainer = document.getElementById('user-list');
members = classData['OSIS'].split(", ")
members.forEach(function(user) {
    var userBubble = document.createElement('div');
    userBubble.textContent = user;
    userBubble.classList.add('user-bubble');
    userBubble.addEventListener('click', function() {
        window.location.href = 'profile.html?user=' + user; // link to profile page
    });
    userListContainer.appendChild(userBubble);
});





const createBtn = document.getElementById('createBtn');
const formContainer = document.getElementById('formContainer');
const assignmentForm = document.getElementById('assignmentForm');

// Add event listener to the button
createBtn.addEventListener('click', () => {
  // Toggle the visibility of the form container
  formContainer.style.display = formContainer.style.display === 'none' ? 'block' : 'none';
});

// Add event listener to the form submission
assignmentForm.addEventListener('submit', (e) => {
  e.preventDefault();

  // Get the values from the form inputs
  const name = document.getElementById('name').value;
  const due = document.getElementById('due').value;
  const type = document.getElementById('assignmentType').value;
  document.getElementById("assignmentForm").reset();
  // Create and display the object containing the name and due date values
  const assignmentObj = {
    name: name,
    categories: type,
    due: due,
    id: Math.floor(Math.random() * 10000)
  };

  post_assignment(assignmentObj);
  
});

function post_assignment(data){
  var new_row = classData
  new_row['assignments'] = new_row['assignments'] + data['id']
  fetch('/post-assignment', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      data: {"data":data, "classid": classData['id'], "newrow": new_row}
      
    })
})
.then(response => response.json())
.then(data => {
  location.reload();
  })
}



function get_assignment(){
  fetch('/Assignments-data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ data: "data being sent Py=>JS" })
})
.then(response => response.json())
.then(data => {
  
  
  assignmentList = data['Assignments']
  console.log(assignmentList)
  display_classes(assignmentList)
  
  
})
.catch(error => {
  alert('An error occurred:' +error);
});
}
get_assignment()

function display_classes(assignmentList){
  const assignmentListContainer = document.getElementById('assignmentList');
    assignmentList.forEach(assignmentData => {
      if(!((classData.assignments).includes(assignmentData["id"]))){return;}
      
      const assignmentItem = document.createElement('div');
      assignmentItem.classList.add('assignment-item');
      assignmentItem.innerHTML = `
        <h3>Due ${assignmentData.due}</h3>
        <p>Type: ${assignmentData.categories}</p>
        <p>Name: ${assignmentData.name}</p>
      `;
      
      assignmentItem.addEventListener('click', () => {
        window.location.href = "/assignment/" + assignmentData.name + assignmentData.id;
      });

      assignmentListContainer.appendChild(assignmentItem);
    });
  
}