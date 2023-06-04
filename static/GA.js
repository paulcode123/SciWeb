var form;
var tbody;
var full_name;
var grades;
var times;

setTimeout(function() {

  get_data();
}, 300); // 100 milliseconds = 0.1 seconds
function set_button(grades, times){

// tbody = form.querySelector('tbody'); // Get the tbody element inside the form

  // Get the canvas element and create a new Chart object
const canvas = document.querySelector('#myChart');

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
            borderColor: "#2c7e8f",
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

};

function get_data() {
  

fetch('/grades', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ data: 'Hello from JavaScript!' })
})
.then(response => response.json())
.then(data => {
  
  
  grades = JSON.stringify(data['grade_spread']);
  times = JSON.stringify(data['times']);

  // alert(full_name); // Handle the response from Python
  
  set_button(grades, times)
})
.catch(error => {
  alert('An error occurred:' +error);
});



fetch('/name', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ "message":"blank" })
})
.then(response => response.json())
.then(data => {
  full_name = JSON.stringify(data)
  full_name = full_name.slice(1, -1);
  // alert(full_name); // Handle the response from Python
  if (full_name != "Login"){
    
  
  document.getElementById('Gslink').textContent = full_name;
  document.getElementById('Gslink').href = "/Profile";
  }
}
