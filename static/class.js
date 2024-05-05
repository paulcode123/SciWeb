
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



//add user bubbles to the class page, with links to the user's profile page
function add_user_bubbles(classData){
var userListContainer = document.getElementById('user-list');
  console.log(classData)
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
  var data = await fetchRequest('/data', {data: "Assignments, FILTERED Classes"});
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
  add_user_bubbles(classData);
  optionSelected(classData);
  setImageEl(classData)
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
      assignmentItem.innerHTML = `
        <h3>Due ${assignmentData.due}</h3>
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

async function setImageEl(classes){
// add event listener to image upload input element with id="imgupload" to send a fetch request to /upload-file route
document.getElementById('imgupload').addEventListener('change', async function() {
  // const formData = new FormData();
  // convert to Base64 with the getBase64 function
  var img = await getBase64(this.files[0]);
  // generate random 8 digit number
  let id = Math.floor(Math.random() * 90000000) + 10000000;
  const data = await fetchRequest('/upload-file', {file: img, name: id});
  
    console.log(data);
    updateClassPic(id, classes);
  
});
}

async function updateClassPic(id, classes){
  class_id = classes['id']
  classes['img'] = id
  const data = await fetchRequest('/update_data', {"row_value": class_id, "row_name": "id", "data": classes, "sheet": "Classes"});
    console.log(data);
    location.reload();
  
}

document.getElementById('colorLabel').addEventListener('click', function() {
  document.getElementById('color').style.display = 'block';
  document.getElementById('savecolor').style.display = 'block';
});

document.getElementById('savecolor').addEventListener('click', function() {
  var color = document.getElementById('color').value;
  color = make_color_opaque(color);
  // set the background color of body to the color
  document.getElementById('head').style.backgroundColor = color;
  document.getElementById('color').style.display = 'none';
  document.getElementById('savecolor').style.display = 'none';
  classData['color'] = color;
  fetchRequest('/update_data', {"row_value": classData['id'], "row_name": "id", "data": classData, "sheet": "Classes"});
});

//whatever the color is, make it a light shade of that color
function make_color_opaque(hex){

  hex = hex.replace(/^#/, '');
  if (hex.length !== 6) {
      throw new Error('Invalid hex color');
  }
  // Convert hex to RGB
  var r = parseInt(hex.substring(0, 2), 16);
  var g = parseInt(hex.substring(2, 4), 16);
  var b = parseInt(hex.substring(4, 6), 16);

  return "rgba(" + r + ", " + g + ", " + b + ", 0.1)";
}

async function set_class_img(img){
  if (img == ""){return;}
  let response = await fetchRequest('/get-file', {file: img});
  let b64 = response.file;
  if(b64.includes('pngbase64')){
    type = 'png';
    b64 = b64.replace('dataimage/pngbase64', 'data:image/png;base64,');
    b64 = b64.slice(0, -1);
  }
  else if(b64.includes('jpegbase64')){
    type = 'jpeg';
    b64 = b64.replace('dataimage/jpegbase64', 'data:image/jpeg;base64,');
  }
  classimg = document.createElement('img')
  classimg.src = b64;
  console.log(b64)
  document.getElementById('classimgcontainer').appendChild(classimg)
}