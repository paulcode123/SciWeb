// classData is predefined in the html
// console.log("class.js classData: "+classData)
// create user bubbles
// console.log(document.getElementById("description"))
var classData = null;
function display_NB_btn(classData){
  console.log(classData)
document.getElementById("description").textContent = classData['description'];

var button = document.createElement("button");
var href = "/class/"+classData['name']+classData['id']+"/notebook";
button.textContent = "Open Class Notebook";
button.id = "openNB";
button.addEventListener("click", function() {
        // Navigate to the specified URL
        window.location.href = href;
    })


// Append the button to the document body or any desired element
document.getElementById('openNBcont').appendChild(button);
}






function add_user_bubbles(classData){
var userListContainer = document.getElementById('user-list');
  console.log(classData)
// members = classData['OSIS'].split(", ")
//set members as a list of osis values, taking only the numbers and not any combination of spaces and commas in between
members = classData['OSIS'].split(/[\s,]+/).filter(item => item.length > 0);

members.forEach(function(user) {
    var userBubble = document.createElement('div');
    userBubble.textContent = user;
    userBubble.classList.add('user-bubble');
    userBubble.addEventListener('click', function() {
        window.location.href = '/users/' + user; // link to profile page
    });
    userListContainer.appendChild(userBubble);
});
}



//add class form
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
    id: Math.floor(Math.random() * 10000),
    class: classData['id']
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

  fetch('/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ data: "Assignments, FILTERED Classes" })
})
.then(response => response.json())
.then(data => {
  
  var classId = window.location.href.slice(-4);
  var assignmentList = data['Assignments']
  classData = data['Classes'];
  console.log(classId);
  classData = classData.find(item => item.id === classId);
  
  display_classes(assignmentList, classData);
  display_NB_btn(classData);
  add_user_bubbles(classData);
  optionSelected(classData);
  document.getElementById('loadingWheel').style.display = "none";
})
.catch(error => {
  console.error('An error occurred in class.js :' +error);
});
}
get_assignment()

function display_classes(assignmentList, classList){
  const assignmentListContainer = document.getElementById('assignmentList');
    assignmentList.forEach(assignmentData => {
      if(!(assignmentData['class']==classData['id'])){return;}
      
      const assignmentItem = document.createElement('div');
      assignmentItem.classList.add('assignment-item');
      assignmentItem.innerHTML = `
        <h3>Due ${assignmentData.due}</h3>
        <p>Type: ${assignmentData.categories}</p>
        <p>Name: ${assignmentData.name}</p>
      `;
      
      assignmentItem.addEventListener('click', () => {
        window.location.href = "/assignment/" + assignmentData.id;
      });

      assignmentListContainer.appendChild(assignmentItem);
    });
  
}



function optionSelected(classes){
    
  console.log(classes);
  var categories = classes['categories']
  
  if(categories){
    
  categories = JSON.parse(categories).filter(item => typeof item === 'string');
    
  var categoryElement = document.getElementById("assignmentType")
  // Remove all existing options
  while (categoryElement.firstChild) {
    categoryElement.removeChild(categoryElement.firstChild);
}
  // Add new options
  for(let x=0; x<categories.length; x++){
  const newOption = document.createElement("option");
  newOption.value = categories[x];
  newOption.textContent = categories[x];
      // Add the new option to the select element
categoryElement.appendChild(newOption);
  }
  
  }
}