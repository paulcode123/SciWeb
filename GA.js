
function init(){
  getLogin()
  
  
}
init()



const form = document.querySelector('#gradeform'); // Get the form element
const tbody = form.querySelector('tbody'); // Get the tbody element inside the form

form.addEventListener('submit', (event) => {
  
  event.preventDefault(); // Prevent the form from submitting and refreshing the page
  
  // Create an array to store the user inputs
  const inputs = [];
  
  // Loop through all the rows in the tbody
  const rows = tbody.querySelectorAll('tr');
  rows.forEach((row) => {
    // Get the input values for the current row
    const date = row.querySelector('[name^="date"]').value; // Get the input with a name that starts with "date"
    const score = row.querySelector('[name^="score"]').value; // Get the input with a name that starts with "score"
    const value = row.querySelector('[name^="value"]').value; // Get the input with a name that starts with "value"
    const classInput = row.querySelector('[name^="class"]').value; // Get the input with a name that starts with "class"
    const category = row.querySelector('[name^="category"]').value; // Get the input with a name that starts with "category"
    
    // Create an object with the input values and add it to the inputs array
    const inputObj = {
      date: date,
      score: score,
      value: value,
      class: classInput,
      category: category
    };
    inputs.push(inputObj);
  });
  
  
  for (let i = 0;i < inputs.length;i++){
    
    pushGrades(inputs[i]);
  }
    
  // Do something with the inputs array, e.g. send it to a server or store it in local storage
document.getElementById("gradeform").reset();
});





async function pushGrades(input){
  


const response = await fetch('https://sheetdb.io/api/v1/pb8spx7u5gewk?sheet=Grades', {
method: 'POST',
headers: {
'Content-Type': 'application/json'
},
body: JSON.stringify(input)
});

const result = await response.json();
alert(JSON.stringify(result));   
}

async function getLogin(){
const response = await fetch('https://sheetdb.io/api/v1/pb8spx7u5gewk?sort=limit=1', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
});

if (response.ok) {
  const data = await response.json();
  const firstName = data[0].first_name;
  const lastName = data[0].last_name;
  setName(firstName+" "+lastName);
} else {
  alert('Failed to read data from SheetDB');
}

}

function setName(name){
  
  
  document.getElementById('Gslink').textContent = name;
}
