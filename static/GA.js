var form;
var tbody;

var grades;
var times;

setTimeout(function() {

  graph_data(["all", "All"]);
}, 300); // 100 milliseconds = 0.1 seconds
function create_graph(grades, times, name, goals){
  
const canvas = document.querySelector('#myGraph');

times = times.slice(1, -1);
grades = grades.slice(1, -1);
times = times.split(",");
grades = grades.split(",");

console.log(grades)
console.log(times)
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

// Define the goal zone

console.log(goals)
// Define the layout
const layout = {
  title: name,
  xaxis: {
    title: 'Date'
  },
  yaxis: {
    title: 'Grades'
  },
  displayModeBar: false,
  shapes: goals // Add the goal zone shape
};

// Render the graph
Plotly.newPlot('myGraph', data, layout);


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
  goals = data['goals'];
  
  let joined_classes = classes.join(', ');
  var name =  joined_classes +" grades over time"
  
  create_graph(grades, times, name, goals)
})
.catch(error => {
  alert('An error occurred:' +error);
});
}

document.getElementById("class-form").addEventListener("submit", function(event) {
  event.preventDefault();
  const errorMessage = document.getElementById("error-message");
errorMessage.textContent = "";
  const checkboxes = document.querySelectorAll('input[name="class"]:checked');
  const selectedClasses = Array.from(checkboxes).map(function(checkbox) {
    return checkbox.value;
  });
  
  if (selectedClasses.length === 0) {
    
    errorMessage.textContent = "Please select at least one class.";
    return;
  }
  
  console.log(selectedClasses);
  // document.getElementById("class-form").reset();
  graph_data(selectedClasses)
  });


const insights = [
  "You have a high engagement rate on social media.",
  "Your website traffic has increased by 20% this month.",
  "Your email campaign had a 10% click-through rate.",
  "Your sales revenue has exceeded the target for this quarter.",
];

const insightContainer = document.getElementById("insightContainer");

function displayNewInsight() {
  const randomIndex = Math.floor(Math.random() * insights.length);
  const insightText = insights[randomIndex];

  const box = document.createElement("div");
  box.className = "box";

  const lightbulb = document.createElement("div");
  lightbulb.className = "lightbulb";

  const text = document.createElement("span");
  text.textContent = insightText;

  box.appendChild(lightbulb);
  box.appendChild(text);

  insightContainer.appendChild(box);
}

displayNewInsight();

