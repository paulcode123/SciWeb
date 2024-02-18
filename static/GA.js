var form;
var tbody;

var grades;
var times;

fetch('/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ data: 'Classes' })
})
.then(response => response.json())
.then(data => {
    var classes = data['Classes']
    classes = classes.filter(item => item.OSIS.includes(osis));
    var class_div = document.getElementById("classes")
    var categories_div = document.getElementById("categories")
    for(let x=0;x<classes.length;x++){
      var label = document.createElement("label");
      var input = document.createElement("input");
      input.type = 'checkbox'
      input.value = classes[x].name.toLowerCase();
      label.textContent = "     "+ classes[x].name;
      input.name = 'class'
      label.appendChild(input);
      
      class_div.appendChild(label);
    }
  const uniqueStrings = new Set();

// Iterate through the data and collect unique strings
for (const entry of classes) {
  const categories = JSON.parse(entry.categories);
  if (Array.isArray(categories)) {
    for (const item of categories) {
      if (typeof item === 'string') {
        uniqueStrings.add(item);
      }
    }
  }
}

// Convert the set to an array if needed
const ust = Array.from(uniqueStrings);
  
for(let x=0;x<ust.length;x++){
      var label = document.createElement("label");
      var input = document.createElement("input");
      input.type = 'checkbox'
      input.value = ust[x];
      label.textContent = "     "+ ust[x];
      input.name = 'class'
      label.appendChild(input);
      
      categories_div.appendChild(label);
    }
  
  })
.catch(error => {
  console.error('An error occurred:' +error);
});
setTimeout(function() {

  graph_data(["all", "All"]);
}, 300); // 100 milliseconds = 0.1 seconds
function create_graph(grades, times, name, goals, max_date){
  
const canvas = document.querySelector('#myGraph');

// Clean grade and time data
times = times.slice(1, -1);
grades = grades.slice(1, -1);
times = times.split(",");
grades = grades.split(",");

console.log(grades)
console.log(times)

// Convert dates from ordinal(eg. 79432) to strings(eg. 12/31/2021)
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
console.log(dateStrings)

// Main grade line
const trace = {
  x: dateStrings,
  y: grades,
  mode: 'lines',
  line: {
    color: '#2c7e8f'
  }
}
// Create the data array
var data = [trace];

// Get number of instances of 'none' in grades
let noneCount = grades.filter(grade => grade === '"none"').length;
console.log(noneCount)
  // For each goal, have a dotted line going from the rightmost point on the grades line to the corresponding goal
  for (let i = 0; i < goals.length; i++) {
    let goal = goals[i];
    let x = [dateStrings[dateStrings.length-noneCount-1], goal.x];
    let y = [grades[grades.length-noneCount-1], goal.y];
    let goalTrace = {
      x: x,
      y: y,
      mode: 'lines',
      line: {
        color: '#2c7e8f',
        dash: 'dot'
      }
    };
    data.push(goalTrace);
  }

console.log(data)


// Define the goal zone

console.log(goals)
console.log(max_date)
min_grade = Math.min(...grades.filter(value => value !== '"none"').map(Number));
console.log(min_grade)
min_x = min_grade-(0.3*(100-min_grade))
// Define the layout
const layout = {
  title: name,
  xaxis: {
    title: 'Date',
    range: [dateStrings[0], max_date]
  },
  yaxis: {
    title: 'Grades',
    // make max value 100, while leaving min value the lowest point on the graph
    range: [min_x, 100]
  },
  displayModeBar: false,
  //shapes: goals // Add the goal zone shape
  images: goals
};

// Render the graph
Plotly.newPlot('myGraph', data, layout);
console.log(document.getElementById('loadingWheel').style.visibility)
document.getElementById('loadingWheel').style.visibility = "hidden";

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
  
  max_date = data['max_date'];
  
  let joined_classes = classes.join(', ');
  if(joined_classes=='all, All'){
    joined_classes = "All";
  }
  else{
    console.log(classes);
  }
    
  var name =  joined_classes +" grades over time"
  //if insights exist, display them
  if (data['insights'] !== undefined) {
    var insights = data['insights'];
    displayInsights(insights);
  }
  
  create_graph(grades, times, name, goals, max_date);
  
})
.catch(error => {
  console.error('An error occurred:' +error);
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
  console.log(document.getElementById('loadingWheel').style.visibility)
  document.getElementById('loadingWheel').style.visibility = "visible";
  document.getElementById('loadingWheel').style.display = "block";
  console.log(document.getElementById('loadingWheel').style.visibility)
  console.log(selectedClasses);
  // document.getElementById("class-form").reset();
  graph_data(selectedClasses)
  console.log("done")
  
  });




const insightContainer = document.getElementById("insightContainer");

function displayInsights(insights) {
  
  insights = insights.split('\n').filter(item => item.trim() !== '');
  for(let x=0;x<insights.length;x++){
    
  const box = document.createElement("div");
  box.className = "box";

  const lightbulb = document.createElement("div");
  lightbulb.className = "lightbulb";

  const text = document.createElement("span");
  text.textContent = insights[x];

  box.appendChild(lightbulb);
  box.appendChild(text);
  insightContainer.appendChild(box);
  }
  
}



