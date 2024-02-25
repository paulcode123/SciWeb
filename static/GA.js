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
      // var child_label = document.createElement("label");
      let text = document.createElement("label");
      let checkbox = document.createElement("input");
      let checkmark = document.createElement("span");

      checkbox.type = 'checkbox';
      checkbox.value = classes[x].name.toLowerCase();
      checkbox.name = 'class';

      text.textContent = "     "+ classes[x].name;
      text.className = 'custom-checkbox';

      checkmark.className = 'checkmark';
      checkbox.addEventListener('change', function() {
        if(this.checked) {
          text.style.backgroundColor = 'green'; // Directly change the background color
          // Or add a class
          // text.classList.add('checked');
        } else {
          text.style.backgroundColor = 'darkgray'; // Revert to original color
          // Or remove the class
          // text.classList.remove('checked');
        }
      });
      
      text.appendChild(checkmark);
      text.appendChild(checkbox);
      class_div.appendChild(text);
      
      // class_div.appendChild(child_label);
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
      let label = document.createElement("label");
      let input = document.createElement("input");
      input.type = 'checkbox'
      input.value = ust[x];
      label.textContent = "     "+ ust[x];
      input.name = 'class'
      label.className = 'custom-checkbox';
      input.addEventListener('change', function() {
        if(this.checked) {
          label.style.backgroundColor = 'green'; // Directly change the background color
          // Or add a class
          // text.classList.add('checked');
        } else {
          label.style.backgroundColor = 'darkgray'; // Revert to original color
          // Or remove the class
          // text.classList.remove('checked');
        }
      });
      
      label.appendChild(input);
      
      categories_div.appendChild(label);
    }
  
  })
.catch(error => {
  console.error('An error occurred:' +error);
});
setTimeout(function() {

  graph_data(["all", "All"], 15);
}, 300); // 100 milliseconds = 0.1 seconds
function create_graph(grades, times, name, goals, max_date, goal_set_dates){
  
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
    let x = [dateStrings[goal_set_dates[i]], goal.x];
    let y = [grades[goal_set_dates[i]], goal.y];
    let goalTrace = {
      x: x,
      y: y,
      mode: 'lines',
      line: {
        color: 'darkgreen',
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

function graph_data(classes, specificity) {
  

fetch('/grades_over_time', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({classes: classes, specificity: specificity})
})
.then(response => response.json())
.then(data => {
  
  
  grades = JSON.stringify(data['grade_spread']);
  times = JSON.stringify(data['times']);
  goals = data['goals'];
  goal_set_dates = data['goal_set_dates'];
  
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
  
  create_graph(grades, times, name, goals, max_date, goal_set_dates);
  
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
  
  let specificity = document.getElementById("mySlider").value;
  console.log(selectedClasses);
  // document.getElementById("class-form").reset();
  graph_data(selectedClasses, specificity)
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

fetch('/goals_progress', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ data: '' })
})
.then(response => response.json())
.then(data => {
  container_element = document.getElementById("GoalProgressContainer")
  for (let i = 0; i < data.length; i++) {
    const goal = data[i];
    const goalElement = document.createElement("div");
    goalElement.className = "goal";
    var dateBar = document.createElement('progress');
    var gradeBar = document.createElement('progress');
    var br = document.createElement('br');
    
    dateBar.value = parseFloat(goal.percent_time_passed);
    dateBar.max = 1;
    
    gradeBar.value = parseFloat(goal.percent_grade_change);
    gradeBar.max = 1;

    // code to round to 1 decimal place: Math.round(num * 10) / 10

    var title = document.createElement('h3');
    title.textContent = "Your goal for "+goal.class+" "+goal.category;
    var datesText = document.createElement('p');
    datesText.textContent = "Date set: " + goal.date_set+" | Target date: " + goal.goal_date;

    var gradesText = document.createElement('p');
    gradesText.textContent = "Grade when set: " + Math.round(goal.grade_when_set*100)/100+" | Target grade: " + goal.goal_grade;

    var trajectory = document.createElement('p');
    trajectory.textContent = "Current Trajectory by goal date: " + Math.round(goal.current_grade_trajectory*100)/100;

    goalElement.appendChild(title);
    goalElement.appendChild(datesText);
    goalElement.appendChild(dateBar);
    goalElement.appendChild(br);
    goalElement.appendChild(gradesText);
    goalElement.appendChild(gradeBar);
    goalElement.appendChild(trajectory);
    container_element.appendChild(goalElement);
  }
  })


