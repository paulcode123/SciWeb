// UNCOMMENT TO RUN

var form;
var enter_button;
var open_button;
var tbody;
var full_name;
var grades;
var times;
setTimeout(function() {

  set_button();
}, 100); // 100 milliseconds = 0.1 seconds
function set_button(){

form = document.querySelector("#gradeform");
form.style.display = "none";

enter_button = document.querySelector("#enter-grades-button");

open_button = document.querySelector("#open-grades-button");

tbody = form.querySelector('tbody'); // Get the tbody element inside the form




// UNCOMMENT TO RUN

enter_button.addEventListener("click", () => {
  
  form.style.display = "block";
});

open_button.addEventListener("click", () => {

  // Get the canvas element and create a new Chart object
const canvas = document.getElementById('myChart');
times = times.slice(1, -1);
times = times.split(",");
grades = grades.split(",");



let dateStrings = [];
for (let i = 0; i < times.length; i++) {
  let date = new Date(0);
  date.setUTCDate(times[i]);
  let day = date.getUTCDate().toString();
  let month = (date.getUTCMonth()+1).toString(); // Add 1 to convert from 0-indexed to 1-indexed
  let year = (date.getUTCFullYear()-1969).toString();
  let dateString = month + "/" + day + "/" + year;
  dateStrings.push(dateString);
}

alert(times)
const chart = new Chart(canvas, {
    
    type: 'line',
    data: {
        // The labels for the x-axis (horizontal axis)
        labels: dateStrings,
        datasets: [{
            label: 'My Line Graph',
            // The data points for the y-axis (vertical axis)
            data: grades,
            // Set the line color to red
            borderColor: 'red',
            // Set the fill color to transparent
            backgroundColor: 'transparent'
        }]
    },
      
    options: {
        responsive: true,
        scales: {
            yAxes: [{
                ticks: {
                    beginAtZero: true
                }
            }]
        }
    }
});

});

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

  // Do something with the inputs array, e.g. send it to a server or store it in local storage
  document.getElementById("gradeform").reset();
  post_grades(inputs);
});
}
// Using setTimeout
setTimeout(function() {
  
  get_data()
}, 200); // 100 milliseconds = 0.1 seconds

function get_data() {
  

fetch('/GA-data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ data: 'Hello from JavaScript!' })
})
.then(response => response.json())
.then(data => {
  
  full_name = JSON.stringify(data['full_name']);
  full_name = full_name.slice(1, -1);
  grades = JSON.stringify(data['grade_spread']);
  times = JSON.stringify(data['times']);
  
  // alert(full_name); // Handle the response from Python
  document.getElementById('Gslink').textContent = full_name;
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





