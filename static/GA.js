var form;
var tbody;

var grades;
var times;

setTimeout(function() {

  graph_data("all");
}, 300); // 100 milliseconds = 0.1 seconds
function create_graph(grades, times, name){
  console.log(name)
const canvas = document.querySelector('#myGraph');

times = times.slice(1, -1);
grades = grades.slice(1, -1);
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

console.log("c1")
const trace = {
    x: dateStrings,
    y: grades,
    mode: 'lines',
    line: {
      color: '#2c7e8f'
    }
  };

  // Create the data array
  const data = [trace];

  // Define the layout
  const layout = {
    title: name,
    xaxis: {
      title: 'Date'
    },
    yaxis: {
      title: 'Grades'
    },
    displayModeBar: false
  };

  // Render the graph
   Plotly.newPlot('myGraph', data, layout)

};

function graph_data(classes) {
  

fetch('/grades_over_time', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ data: classes })
})
.then(response => response.json())
.then(data => {
  
  
  grades = JSON.stringify(data['grade_spread']);
  times = JSON.stringify(data['times']);
  if (classes != "all"){
  let joined_classes = classes.join(', ');
  var name =  joined_classes +" grades over time"
  }
  else{
    var name = "Total grade over time"
  }
  create_graph(grades, times, name)
})
.catch(error => {
  alert('An error occurred:' +error);
});
}

document.getElementById("class-form").addEventListener("submit", function(event) {
  event.preventDefault();
  
  const checkboxes = document.querySelectorAll('input[name="class"]:checked');
  const selectedClasses = Array.from(checkboxes).map(function(checkbox) {
    return checkbox.value;
  });
  
  if (selectedClasses.length === 0) {
    const errorMessage = document.getElementById("error-message");
    errorMessage.textContent = "Please select at least one class.";
    return;
  }
  
  console.log(selectedClasses);
  document.getElementById("class-form").reset();
  graph_data(selectedClasses)
  });


