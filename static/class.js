
var classData = null;
//display the class notebook button and description
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
  const points = document.getElementById('points').value;
  document.getElementById("assignmentForm").reset();
  // Create and display the object containing the name and due date values
  const assignmentObj = {
    name: name,
    category: type,
    points: points,
    due: due,
    id: Math.floor(Math.random() * 10000),
    class: classData['id'],
    class_name: classData['name']
  };

  post_assignment(assignmentObj);
  
});

function post_assignment(data){
  var new_row = classData
  new_row['assignments'] = new_row['assignments'] + ", "+data['id']
  fetchRequest('/post_data', {data: data, sheet: "Assignments"});
  fetchRequest('/update_data', {"row_value": classData['id'], "row_name": "id", "data": new_row, "sheet": "Classes"});
  location.reload();
}


async function get_assignment(){
  var data = await fetchRequest('/data', {data: "Assignments, Classes, Name, Users"});
  var classId = window.location.href.slice(-4);
  var assignmentList = data['Assignments']
  classData = data['Classes'];
  console.log(data)
  classData = classData.find(item => item.id == classId);
  // set head to classData['color']
  document.getElementById('head').style.backgroundColor = classData['color'];
  set_class_img(classData['img'])
  display_assignments(assignmentList, classData);
  display_NB_btn(classData);
  add_user_bubbles(classData, data['Users']);
  optionSelected(classData);
  setImageEl(classData, "Classes")
  set_color_EL("Classes", classData)
  show_Join(data['Name'], classData, "Classes");
  // if classData['img'] != "", set the background image of the div to the base64 image string
  
  document.getElementById('loadingWheel').style.display = "none";
}
get_assignment()

function display_assignments(assignmentList, classData){
  const assignmentListContainer = document.getElementById('assignmentList');
    assignmentList.forEach(assignmentData => {
      if(!(assignmentData['class']==classData['id'])){return;}
      
      const assignmentItem = document.createElement('div');
      assignmentItem.classList.add('assignment-item');
      const dueDate = processDate(assignmentData.due);
      assignmentItem.innerHTML = `
        <h3>Due ${dueDate}</h3>
        <p>Type: ${assignmentData.category}</p>
        <p>Name: ${assignmentData.name}</p>
      `;
      
      assignmentItem.addEventListener('click', () => {
        window.location.href = "/assignment/" + assignmentData.id;
      });

      assignmentListContainer.appendChild(assignmentItem);
    });
  
}



function optionSelected(classData){
    
  console.log(classData);
  var categories = classData['categories']
  
  if(categories){
    // convert categories to json if it is a string
    if(typeof categories === 'string'){
      categories = JSON.parse(categories);
    }
    categories = categories.filter(item => typeof item === 'string');
    
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
