



// Jupiter API?

const form = document.querySelector("#gradeform");
const tbody = document.querySelector("#mytbody");
var grades;
const Pullbutton = document.querySelector('#Jupull');

//add event listener to the pull button
Pullbutton.addEventListener('click', pullfromJupiter);

async function pullfromJupiter(){
  console.log("pulling from Jupiter")
  // make loading wheel visible
  document.getElementById('loadingWheel').style.visibility = "visible";
  const osis = document.getElementById('osis').value;
  const password = document.getElementById('password').value;
  const addClasses = document.getElementById('addclasses').checked;
  const encrypt = document.getElementById('encrypt').checked;
  const updateLeagues = document.getElementById('updateLeagues').checked;
  console.log(encrypt)
  // if encrypt is checked, generate a key and set it as a cookie
  var key="none"
  if(encrypt == true){
    console.log("encrypting")
    key = Math.floor(Math.random() * 10000000000000000);
    document.cookie = "gradeKey="+key;
  }
  //Send to python with fetch request
  const data = await fetchRequest('/jupiter', {"osis": osis, "password": password, "addclasses": addClasses, "encrypt": key, "updateLeagues": updateLeagues});
  
  console.log("got response")
  grades = data;
  createGradesTable(grades);
  document.getElementById('loadingWheel').style.visibility = "hidden";
}

//When the user selects a class, update the category dropdown with the categories for that class
function optionSelected(classNum, classes){
  console.log(classNum);
  console.log(classes);
  var selectedClass = document.getElementById("class"+classNum).value;
  var categories = classes.filter(item => item.name == selectedClass)[0].categories;
  
  if(categories){
    
  categories = JSON.parse(categories).filter(item => typeof item === 'string');
    
  var categoryElement = document.getElementById("category"+classNum)
  // Remove all existing options
  while (categoryElement.firstChild) {
    categoryElement.removeChild(categoryElement.firstChild);
}
  // Add nex options
  for(let x=0; x<categories.length; x++){
  const newOption = document.createElement("option");
  newOption.value = categories[x];
  newOption.textContent = categories[x];
      // Add the new option to the select element
categoryElement.appendChild(newOption);
  }
  
  }
}

//When the user submits the form, get the values from the form and create a grade object
form.addEventListener('submit', (event) => {
  
  const inputs = [];
  event.preventDefault(); // Prevent the form from submitting and refreshing the page
var pasted = document.getElementById('pasted').value;
  //if the user pasted grades, parse the pasted text: not working yet
  if (pasted != ""){
    
pasted = pasted.split(/\s(?=\d+\/\d+)/);
    console.log(pasted)
  var assignments = [];
for (let i = 0; i < pasted.length; i += 2) {
  const mergedItem = pasted.slice(i, i + 2).join(' ');
  assignments.push(mergedItem);
}


  assignments.forEach((line) => {
    var words = line.split(" ");
    line = line.replace('%', '');
    const booleanValue = line.includes("%");
    const numericValue = booleanValue ? 2 : 0;
    const name_list = words.slice(1, (words.length-(4+numericValue)))
    const full_score = words[words.length-(4+numericValue)];
  const inputObj = {
      date: words[0],
      score: full_score.split("/")[0],
      value: full_score.split("/")[1],
      class: document.getElementById('pastedcn').value,
      category: words[words.length-1],
      name: name_list.join(" ")
    };
   
    inputs.push(inputObj);
  
});
  }
  //If the user didn't paste grades, get the grades from the form
  else{
  


  
  // Create an array to store the user inputs
  

  // Loop through all the rows in the tbody
  const rows = tbody.querySelectorAll('tr');
  rows.forEach((row) => {
    // Get the input values for the current row
    const date = row.querySelector('[name^="date"]').value; // Get the input with a name that starts with "date"
    const score = row.querySelector('[name^="score"]').value; // Get the input with a name that starts with "score"
    const value = row.querySelector('[name^="value"]').value; // Get the input with a name that starts with "value"
    const classInput = row.querySelector('[id^="class"]').value; // Get the input with a name that starts with "class"
    const category = row.querySelector('[id^="category"]').value; // Get the input with a name that starts with "category"
  const name = row.querySelector('[name^="name"]').value; 
    // If all values in row are filled in, create an object with the input values and add it to the inputs array
    if(date != "" && score != "" && value != "" && classInput != "" && category != "" && name != ""){
    const inputObj = {
      date: date,
      score: score,
      value: value,
      class: classInput,
      category: category,
      name: name,
      osis: osis,
      id: Math.floor(Math.random() * 10000)
    };
    inputs.push(inputObj);
    }
  });
  
  }
  // Do something with the inputs array, e.g. send it to a server or store it in local storage
  console.log(inputs);
  document.getElementById("gradeform").reset();
  
  post_grades(inputs);
  
});


// Using setTimeout



async function post_grades(grades){
  await fetchRequest('/post-grades', grades);
}




fetch('/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ data: 'FILTERED Grades, FILTERED Classes' })
})
.then(response => response.json())
.then(data => {
  
  
  grades = data['Grades']
  var rawclasses = data['Classes']
  const classes = rawclasses.filter(item => item.OSIS.includes(osis));
  setClassOptions(classes)
  for(let z=1;z<6;z++){
document.getElementById("class"+z).addEventListener("change", () => {optionSelected(z, classes)});
}
  createGradesTable(grades);
  document.getElementById('loadingWheel').style.visibility = "hidden";
})
.catch(error => {
  console.log('An error occurred:' +error);
});

function setClassOptions(filteredClasses){
  
  for(let i=1; i<6; i++){
    const selectElement = document.getElementById("class"+i);
    for(let x=0; x<filteredClasses.length; x++){
      // Create a new option element
      const newOption = document.createElement("option");
      newOption.value = filteredClasses[x].name;
      newOption.textContent = filteredClasses[x].name;

      // Add the new option to the select element
      selectElement.appendChild(newOption);
    }

// Remove the "Please add classes first" option
if(filteredClasses.length != 0){
selectElement.removeChild(selectElement.querySelector('option[value="default"]'));
} else {
  selectElement.querySelector('option[value="default"]').textContent = "Please select classes"
}
  }
  
}

//Add previously inputted grades to the table
function createGradesTable(grades) {
  const tableBody = document.getElementById('gradesBody');
  tableBody.innerHTML = ''; // Clear any existing rows
  if (grades.length>1) {
    document.getElementById('DeleteGrades').style.visibility = "visible";
  
  // sort grades by date from most recent to least recent
  grades.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  for (let i = 0; i < grades.length; i++) {
    const row = document.createElement('tr');

    const grade = grades[i];
    const { date, score, value, class: className, category, name } = grade;

    const cells = [
      createTableCell(date),
      createTableCell(score),
      createTableCell(value),
      createTableCell(className),
      createTableCell(category),
      createTableCell(name),
      createEditButton(i)
    ];

    cells.forEach(cell => row.appendChild(cell));
    tableBody.appendChild(row);
  }
}

// Function to create a table cell
function createTableCell(value) {
  const cell = document.createElement('td');
  cell.textContent = value;
  return cell;
}

// Function to create an edit button for a row
function createEditButton(index) {
  const button = document.createElement('button');
  button.textContent = 'Edit';
  button.addEventListener('click', () => {
    const row = document.getElementById('gradesBody').children[index];
    makeRowEditable(row, index);
  });

  const cell = document.createElement('td');
  cell.appendChild(button);
  return cell;
}

// Function to make a row editable
function makeRowEditable(row, index) {
  input_types = ["date", "number", "number", "text", "text", "text"]
  const cells = row.children;
  for (let i = 0; i < cells.length - 1; i++) {
    const cell = cells[i];
    const value = cell.textContent;
    let type = input_types[i];
    cell.innerHTML = `<input type="${type}" value="${value}">`;
    
  }

  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save';

// When the user clicks the save button, save the changes made to the row
saveButton.addEventListener('click', () => {
    saveRowChanges(row, index);
  });

  const actionCell = cells[cells.length - 1];
  actionCell.innerHTML = '';
  actionCell.appendChild(saveButton);
}

// Function to save the changes made to a row
function saveRowChanges(row, index) {
  const cells = row.children;
  const updatedValues = {};

  for (let i = 0; i < cells.length - 1; i++) {
    const cell = cells[i];
    const input = cell.firstChild;
    const value = input.value;
    const property = getPropertyByIndex(i);
    updatedValues[property] = value;
    cell.textContent = value;
  }
  updatedValues['id'] = grades[index]['id']
  updatedValues['osis'] = grades[index]['osis']
  const saveButton = document.createElement('button');
  saveButton.textContent = 'Edit';
  saveButton.addEventListener('click', () => {
    makeRowEditable(row, index);
  });

  const actionCell = cells[cells.length - 1];
  actionCell.innerHTML = '';
  actionCell.appendChild(saveButton);
  index = grades[index]['id']
  // Process the updated values as needed
  console.log('Updated Values:', updatedValues);
  console.log('Original Index:', index);
  update_grades(index, updatedValues)
}

// Function to get the property name based on the index
function getPropertyByIndex(index) {
  const properties = ['date', 'score', 'value', 'class', 'category', 'name'];
  return properties[index];
}
// Create the grades table

async function update_grades(id, grades){
  await fetchRequest('/update-grades', {"grades":grades, "rowid": id});
}

// add event listener
document.getElementById('DeleteGrades').addEventListener('click', DeleteGrades);
async function DeleteGrades(){
  const result = await fetchRequest('/delete-grades', {"osis": osis});
  
    // hide button
    document.getElementById('DeleteGrades').style.visibility = "hidden";
    // remove grades from table
    document.getElementById('gradesBody').innerHTML = '';

}