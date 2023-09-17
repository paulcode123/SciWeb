// Jupiter API?

const form = document.querySelector("#gradeform");
const tbody = document.querySelector("#mytbody");
var grades;
const Pullbutton = document.querySelector('#Jupull');

// Pullbutton.addEventListener('click', function() {
 
// });

form.addEventListener('submit', (event) => {
  
  const inputs = [];
  event.preventDefault(); // Prevent the form from submitting and refreshing the page
var pasted = document.getElementById('pasted').value;
  if (pasted != ""){
    
pasted = pasted.split(/\s(?=\d+\/\d+)/);
    alert(pasted)
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
  else{
  


  
  // Create an array to store the user inputs
  

  // Loop through all the rows in the tbody
  const rows = tbody.querySelectorAll('tr');
  rows.forEach((row) => {
    // Get the input values for the current row
    const date = row.querySelector('[name^="date"]').value; // Get the input with a name that starts with "date"
    const score = row.querySelector('[name^="score"]').value; // Get the input with a name that starts with "score"
    const value = row.querySelector('[name^="value"]').value; // Get the input with a name that starts with "value"
    const classInput = row.querySelector('[name^="class"]').value; // Get the input with a name that starts with "class"
    const category = row.querySelector('[name^="category"]').value; // Get the input with a name that starts with "category"
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
  alert(inputs);
  document.getElementById("gradeform").reset();
  
  post_grades(inputs);
  
});


// Using setTimeout



function post_grades(grades){
  fetch('/post-grades', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(grades)
})
.then(response => response.text())
.then(result => {
    alert(result);  // Log the response from Python
})
.catch(error => {
    alert('An error occurred:', error);
});
}


fetch('/grades', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ data: 'Hello from JavaScript!' })
})
.then(response => response.json())
.then(data => {
  
  
  grades = data
  createGradesTable();
})
.catch(error => {
  alert('An error occurred:' +error);
});



function createGradesTable() {
  const tableBody = document.getElementById('gradesBody');
  tableBody.innerHTML = ''; // Clear any existing rows

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
  const cells = row.children;
  for (let i = 0; i < cells.length - 1; i++) {
    const cell = cells[i];
    const value = cell.textContent;
    cell.innerHTML = `<input type="text" value="${value}">`;
  }

  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save';

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

function update_grades(id, grades){
  fetch('/update-grades', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({"grades":grades, "rowid": id})
})
.then(response => response.text())
.then(result => {
    console.log(result);  // Log the response from Python
})
.catch(error => {
    alert('An error occurred:', error);
});
}

