var classData = null;


//add class form
const createBtn = document.getElementById('createBtn');
const formContainer = document.getElementById('formContainer');
const assignmentForm = document.getElementById('assignmentForm');
const cancelBtn = document.getElementById('cancelBtn');

createBtn.addEventListener('click', () => {
  formContainer.style.display = 'flex';
  populateCategoryDropdown();
});

cancelBtn.addEventListener('click', () => {
  formContainer.style.display = 'none';
  assignmentForm.reset();
});

// Close modal if clicking outside the form
formContainer.addEventListener('click', (e) => {
  if (e.target === formContainer) {
    formContainer.style.display = 'none';
    assignmentForm.reset();
  }
});

function populateCategoryDropdown() {
  const categorySelect = document.getElementById('assignmentType');
  categorySelect.innerHTML = ''; // Clear existing options
  
  let categories = classData.categories;
  if (typeof categories === 'string') {
    categories = JSON.parse(categories);
  }
  
  // Filter out the weights and keep only category names
  const categoryNames = categories.filter((_, index) => index % 2 === 0);
  
  categoryNames.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });
}

assignmentForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const assignmentObj = {
    name: document.getElementById('name').value,
    category: document.getElementById('assignmentType').value,
    points: document.getElementById('points').value,
    due: document.getElementById('due').value,
    id: Math.floor(Math.random() * 10000).toString(),
    class: classData.id,
    class_name: classData.name
  };

  post_assignment(assignmentObj);
  formContainer.style.display = 'none';
  assignmentForm.reset();
});

function post_assignment(data){
  var new_row = classData
  new_row['assignments'] = new_row['assignments'] + ", "+data['id']
  fetchRequest('/post_data', {data: data, sheet: "Assignments"});
  fetchRequest('/update_data', {"row_value": classData['id'], "row_name": "id", "data": new_row, "sheet": "Classes"});
  location.reload();
}


async function get_assignment(){
  startLoading();
  var data = await fetchRequest('/data', {data: "Classes, Assignments, Name, Users"});
  var classId = window.location.href.slice(-4);
  var assignmentList = data['Assignments']
  classData = data['Classes'];
  classData = classData.find(item => item.id == classId);

  // Set up the page
  setupPage(classData, data);
  
  endLoading();
}

function setupPage(classData, data) {
  // Set background color
  document.getElementById('class-section').style.backgroundColor = classData.color || 'var(--background-dark)';
  
  // Set up design elements
  set_class_img(classData.img);
  setImageEl(classData, "Classes");
  set_color_EL("Classes", classData);
  
  // Display class content
  display_assignments(data.Assignments, classData);
  display_NB_btn(classData);
  add_user_bubbles(classData, data.Users);
  
  // Set up join functionality
  show_Join(data.Name, classData, "Classes");
  
  // Set up editable fields if user is class owner
  if (isClassOwner(classData)) {
    setupEditableFields(classData);
  }
}

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

function leaveClass(classData) {
  if (confirm("Are you sure you want to leave this class?")) {
    //remove the user from the string of the class members' osis
    classData['OSIS'] = classData['OSIS'].replace(osis, "");

    fetchRequest('/update_data', {
      "row_value": classData['id'],
      "row_name": "id",
      "data": classData,
      "sheet": "Classes"
    }).then(response => {
      if (response.message === "success") {
        alert("You have left the class successfully.");
        window.location.href = "/Classes";  // Redirect to the Classes page
      } else {
        alert("There was an error leaving the class. Please try again.");
      }
    });
  }
}


function displaySchedule(schedule) {
  const scheduleContainer = document.getElementById('scheduleContainer');
  scheduleContainer.innerHTML = '<h4>Schedule:</h4>';
  if (typeof schedule === 'string') {
    scheduleContainer.innerHTML += `<p>${schedule}</p>`;
  } else if (Array.isArray(schedule)) {
    const scheduleList = document.createElement('ul');
    schedule.forEach(item => {
      const listItem = document.createElement('li');
      listItem.textContent = item;
      scheduleList.appendChild(listItem);
    });
    scheduleContainer.appendChild(scheduleList);
  }
}

function displayCategories(categories) {
  const container = document.getElementById('categoriesContainer');
  container.innerHTML = '';
  
  if (typeof categories === 'string') {
    categories = JSON.parse(categories);
  }

  const table = document.createElement('table');
  table.className = 'categories-table';
  
  for (let i = 0; i < categories.length; i += 2) {
    const row = table.insertRow();
    const categoryCell = row.insertCell();
    const weightCell = row.insertCell();
    
    categoryCell.textContent = categories[i];
    weightCell.textContent = `${categories[i+1]}%`;
  }
  
  container.appendChild(table);
}

function add_user_bubbles(classData, users) {
  const userList = document.getElementById('user-list');
  userList.innerHTML = '';
  
  const userOSIS = classData.OSIS.split(',').filter(osis => osis.trim());
  
  userOSIS.forEach(osis => {
    const user = users.find(u => u.osis === osis);
    if (!user) return;

    const bubble = document.createElement('div');
    bubble.className = 'user-bubble';
    bubble.textContent = `${user.first_name} ${user.last_name}`;
    bubble.addEventListener('click', () => {
      window.location.href = `/profile/${user.osis}`;
    });
    
    userList.appendChild(bubble);
  });
}

// Add helper functions
function setupEditableFields(classData) {
  const editableFields = document.querySelectorAll('[contenteditable="true"]');
  editableFields.forEach(field => {
    field.addEventListener('blur', async () => {
      const updatedData = { ...classData };
      updatedData[field.id] = field.textContent;
      
      await fetchRequest('/update_data', {
        row_value: classData.id,
        row_name: "id",
        data: updatedData,
        sheet: "Classes"
      });
    });
  });
}

function isClassOwner(classData) {
  // Add logic to check if current user is class owner
  return classData.teacher === currentUserName; // You'll need to define currentUserName
}

// Add error handling to setdesign functions
function set_color_EL(sheet, classData) {
  const saveColorBtn = document.getElementById('savecolor');
  const colorInput = document.getElementById('color');
  
  if (!saveColorBtn || !colorInput) return;

  saveColorBtn.addEventListener('click', function() {
    const color = make_color_opaque(colorInput.value);
    document.getElementById('class-section').style.backgroundColor = color;
    colorInput.style.display = 'none';
    saveColorBtn.style.display = 'none';
    
    classData.color = color;
    fetchRequest('/update_data', {
      "row_value": classData.id,
      "row_name": "id",
      "data": classData,
      "sheet": sheet
    });
  });
}
