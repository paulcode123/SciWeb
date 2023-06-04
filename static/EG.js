// Jupiter API?
const form = document.querySelector("#gradeform");
const tbody = document.querySelector("#mytbody");

const Pullbutton = document.querySelector('#Jupull');
alert("Pullbutton: "+ Pullbutton)
Pullbutton.addEventListener('click', function() {
 
});

form.addEventListener('submit', (event) => {
  alert('1')
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
  alert('2')


  
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
    // Create an object with the input values and add it to the inputs array
    alert('3')
    const inputObj = {
      date: date,
      score: score,
      value: value,
      class: classInput,
      category: category,
      name: name
    };
    inputs.push(inputObj);
  });
  
  }
  // Do something with the inputs array, e.g. send it to a server or store it in local storage
  alert(inputs);
  document.getElementById("gradeform").reset();
  
  post_grades(inputs);
  
});


// Using setTimeout
setTimeout(function() {
  
  get_data();
}, 200); // 100 milliseconds = 0.1 seconds

function get_data() {
  

fetch('/name', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ data: 'Hello from JavaScript!' })
})
.then(response => response.json())
.then(data => {
  
  var full_name = JSON.stringify(data);
 
  full_name = full_name.slice(1, -1);
  
  
  // alert(full_name); // Handle the response from Python
  document.getElementById('EGlink').textContent = full_name;
  document.getElementById('EGlink').href = "/Profile";
})
.catch(error => {
  alert('An error occurred:' +error);
});
}


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





