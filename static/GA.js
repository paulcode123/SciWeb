var form;
var tbody;
var grades;

var times;
var weights;
var grade_spreads;
var grades;
var val_sums;

var currentCategories;
var goals;

var combinedx;
var combinedy;

async function main(){
  const data = await fetchRequest('/GAsetup', { data: '' });

    if(data['error']){
      const errorMessage = document.getElementById("error");
      errorMessage.textContent = data['error'];
      // hide loading wheel
      document.getElementById('loadingWheel').style.visibility = "hidden";
      // stop any further execution
      window.stop();
      return;
    }
    console.log(data)
    // data includes Weights, times, grade_spreads, grades, categories, stats, compliments
    weights = data["Weights"];
    times = data["times"];
    grade_spreads = data["grade_spreads"];
    grades = data["grades"];
    categories = data["categories"];
    stats = data["stats"];
    compliments = data["compliments"];
    val_sums = data["cat_value_sums"];
    goals = data["goals"];

    setClasses(weights)
    setStats(stats)
    
    setCompliments(compliments)
    
    draw_graphs(grade_spreads, times, weights, grades, ['All', 'all'], val_sums, 5, goals);
    setGoalTable(goals)
}

function setStats(stats){
  console.log(stats)
  // set p tags to stats
  document.getElementById("s1").textContent = stats["gpa"] + "%"
  document.getElementById("s2").textContent = stats["raw_avg"] + "%"
  document.getElementById("s3").textContent = stats["avg_change"] + "%"
  document.getElementById("s4").textContent = stats["most_improved_class"]
  // get the next sibling of the p tag and set the text content to stats[grade_changes][class_name]
  document.getElementById("s4").nextElementSibling.textContent += "(+"+stats["grade_changes"][stats["most_improved_class"]]+"%)"
  document.getElementById("s5").textContent = stats["most_worsened_class"]
  document.getElementById("s5").nextElementSibling.textContent += "("+stats["grade_changes"][stats["most_worsened_class"]]+"%)"
  document.getElementById("s6").textContent = stats["past30_avg"] + "%"
}
function setClasses(weights){
    var classes = Object.keys(weights)
    var class_div = document.getElementById("classes")
    console.log(classes)
    
      //create an all checkbox that checks all the checkboxes in the class and their subcategories
      let [t, cb, m] = createCheckbox("All");
      t.appendChild(m);
      t.appendChild(cb);
      class_div.appendChild(t);
      cb.addEventListener('change', function() {
        if(this.checked) {
          t.style.backgroundColor = 'rgba(228, 76, 101, 1)'; // Directly change the background color
          checkboxes = document.querySelectorAll('input[name="class"]');
          for (let i = 0; i < checkboxes.length; i++) {
            checkboxes[i].checked = true;
            console.log(checkboxes[i], "checked")
            checkboxes[i].dispatchEvent(new Event('change'));
          }
        } else {
          t.style.backgroundColor = '#1b1c1c'; // Revert to original color
          checkboxes = document.querySelectorAll('input[name="class"]:checked');
          for (let i = 0; i < checkboxes.length; i++) {
            checkboxes[i].checked = false;
            checkboxes[i].dispatchEvent(new Event('change'));
          }
        }
      });

      for(let x=0;x<classes.length;x++){
      // define the class checkboxes
      let subcategories = document.createElement("div");
      let [text, checkbox, checkmark] = createCheckbox(classes[x])

      // for each category in the class, create a checkbox
      for (const category in weights[classes[x]]) {
        let label = document.createElement("label");
        let input = document.createElement("input");
        input.type = 'checkbox';
        input.value = category.toLowerCase();
        input.name = 'class';
        label.textContent = "     "+ category;
        label.className = 'category-checkbox';
        input.addEventListener('change', function() {
          if(this.checked) {
            label.style.backgroundColor = 'rgba(228, 76, 101, 1)'; // Directly change the background color
          } else {
            label.style.backgroundColor = '#1b1c1c'; // Revert to original color
          }
        });
        label.appendChild(input);
        subcategories.appendChild(label);
      }

      // hide subcategories by default
      subcategories.style.display = 'none';

      checkbox.addEventListener('change', function() {
        checkboxes = subcategories.querySelectorAll('input[name="class"]');
        if(this.checked) {
          text.style.backgroundColor = 'rgba(228, 76, 101, 1)'; // Directly change the background color
          subcategories.style.display = 'block';
          // check all subcategories
          for (let i = 0; i < checkboxes.length; i++) {
            checkboxes[i].checked = true;
            checkboxes[i].dispatchEvent(new Event('change'));
          }
        } else {
          text.style.backgroundColor = '#1b1c1c'; // Revert to original color
          subcategories.style.display = 'none';
          // uncheck all subcategories
          for (let i = 0; i < checkboxes.length; i++) {
            checkboxes[i].checked = false;
            checkboxes[i].dispatchEvent(new Event('change'));
          }
        }
      });
      text.appendChild(checkmark);
      text.appendChild(checkbox);
      class_div.appendChild(text);
      class_div.appendChild(subcategories);
    }

}

function createCheckbox(content){
  let text = document.createElement("label");
  let checkbox = document.createElement("input");
  let checkmark = document.createElement("span");
  

  checkbox.type = 'checkbox';
  checkbox.value = content.toLowerCase();
  checkbox.name = 'class';

  text.textContent = "     "+ content;
  text.className = 'class-checkbox';

  checkmark.className = 'checkmark';
  return [text, checkbox, checkmark];
}

async function setGoalProgress(){
    const progress_data = await fetchRequest('/goals_progress', { data: '' });
    
    console.log(progress_data)
    container_element = document.getElementById("GoalProgressContainer")
    for (let i = 0; i < progress_data.length; i++) {
      const goal = progress_data[i];
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
}

main()

// gotc = grades over time chart
function draw_gotc(grade_spreads, times, weights, grades, cat, val_sums, comp_time, goals){
// define the canvas
const canvas = document.querySelector('#myGraph');


// Convert dates from ordinal(eg. 79432) to strings(eg. 12/31/2021)
let dateStrings = [];
for (let i = 0; i < times.length; i++) {
  dateStrings.push(serialToDate(times[i]));
}

// Filter grades for cla(class) and cat(category) into grade_points
let grade_points = [];
for (let i = 0; i < grades.length; i++) {
  let grade = grades[i];
  console.log(cat.includes('all') && cat.includes('All'))
  
  if ((cat.includes(grade['class']) || cat.includes('all')) && (cat.includes(grade['category']) || cat.includes('All'))) {
    grade_points.push(grade);
  }
}
console.log(grade_points)

// Filter grade_spreads for cla(class) and cat(category) grade_spreads
let spreads = [];
let spread_names = [];
let w = [];
for (const spread_class in grade_spreads) {
  for (const spread_category in grade_spreads[spread_class]) {
    let spread = grade_spreads[spread_class][spread_category];
    // if cla includes spread['class'] or all AND cat includes spread['category'] or all, add spread to spreads
    if ((cat.includes(spread_class) || cat.includes('all')) && (cat.includes(spread_category) || cat.includes('All'))) {
      spreads.push(spread);
      spread_names.push(spread_category + " " + spread_class); // Switch order to "category class"
      w.push(weights[spread_class][spread_category]);
    }
  }
}


// Graph all the spreads as lines over times
let spreadTraces = [];
for (let i = 0; i < spreads.length; i++) {
  // generate random color
  let randomColor = Math.floor(Math.random()*16777215).toString(16);
  let spread = spreads[i];
  // correct 99.993 to 100
  spread = spread.map(value => value === 99.993 ? 100 : value);
  let trace = {
    x: times,
    y: spread,
    mode: 'lines',
    line: {
      color: randomColor,
      width: 1
    },
    name: spread_names[i],
    hovertemplate: `${spread_names[i]}<br>Date: %{x}<br>Grade: %{y}<extra></extra>`, // Custom hover template
    text: spread_names[i] // Use text for the full label
  };
  spreadTraces.push(trace);
}

// Add a scatter plot for individual grades
grade_points_dates = grade_points.map(point => point['date']);
grade_point_sizes = grade_points.map(point => {
  score = point['score'];
  value = point['value'];
  category = point['category'].toLowerCase();
  class_name = point['class'].toLowerCase();
  cat_weight = weights[class_name][category];
  try{
  cat_grade = grade_spreads[class_name][category].slice(-1)[0];
  }
  catch{
    console.error("No grade spread for class: "+class_name+" and category: "+category)
  }
  cat_val_sum = val_sums[class_name][category];
  return (value/cat_val_sum)*cat_weight;
});

const scatterPlotTrace = {
  // Get all the x coordinates from grade_points
  x: grade_points_dates,
  // convert point['date'] to ordinal date
  y: grade_points.map(point => point['score']/point['value']*100),
  mode: 'markers', // This makes it a scatter plot
  type: 'scatter', // Explicitly stating the plot type is optional but can be helpful
  marker: {
    color: 'rgba(255, 127, 14, 0.5)', // Example color
    size: grade_points.map(point => point['value']/5) // This sets the size of the markers
  },
  text: grade_points.map(point => point['name']), // An array of strings for hover text, one for each point
  hoverinfo: 'text', // Specify to show only the custom text on hover
  name: 'Individual Grades(click to show)',
  visible: 'legendonly'
};
spreadTraces.unshift(scatterPlotTrace)


// combine times and grade_point_dates
all_dates = times.concat(grade_points_dates)
// find min and max of all_dates
min_x = Math.min(...all_dates)
max_x = Math.max(...all_dates)
console.log(min_x, max_x)
// Define the layout
const layout = {
  title: "Grades Over Time",
  xaxis: {
    title: 'Date',
    tickvals: times,
    ticktext: dateStrings,
    range: [min_x - 3, max_x + 3],
    showgrid: false
  },
  yaxis: {
    title: 'Grades',
    showgrid: false
  },
  showlegend: false,
  displayModeBar: false,
  paper_bgcolor: 'rgba(0,0,0,0)', // Transparent background
  plot_bgcolor: 'rgba(0,0,0,0)',  // Transparent plot area
  font: {
    color: 'white' // White text
  },
  hovermode: 'closest' // Show hover info only for the closest point
};

// create final, combined line: at each timepoint, sum the weighted grade_spreads
let final = [];
for (let i = 0; i < times.length; i++) {
  let gradesum = 0;
  let weightsum = 0;
  for (let j = 0; j < spreads.length; j++) {
    // Check if the category value is exactly 99.993
    if (spreads[j][i] !== 99.993) {
      gradesum += spreads[j][i] * w[j];
      weightsum += w[j];
    }
  }
  // Only calculate the sum if weightsum is greater than 0 to avoid division by zero
  let sum = weightsum > 0 ? gradesum / weightsum : 100;
  final.push(sum);
}
console.log(final)

combinedx = times;
combinedy = final;

// create an array with a copy of dict {y: final} for each spread
let finalTraces = [];
let numTraces = [];
for (let i = 0; i < spreads.length; i++) {
  finalTraces.push({y: final});
  numTraces.push(i+1);
}

// Render the graph
Plotly.newPlot('myGraph', spreadTraces, layout);

// update goals
updateGoals(goals, cat);

// when checkbox with id 'individual' is clicked, show or hide the scatter plot
document.getElementById('individual').addEventListener('change', function() {
  if(this.checked) {
    spreadTraces[0].visible = true;
  } else {
    spreadTraces[0].visible = 'legendonly';
  }
  Plotly.react('myGraph', spreadTraces, layout);
});
// hide loading wheel
document.getElementById('loadingWheel').style.visibility = "hidden";
setTimeout(function(){
  console.log(comp_time)
  // Start animation
  animationGOTC(numTraces, finalTraces, "combine");
  console.log(finalTraces)
  // when checkbox with id 'components' is clicked, split or combine the line components
  document.getElementById('components').addEventListener('change', function() {
    if(this.checked) {
      // Split the lines when checked
      console.log(spreads)
      traces = spreads.map(spread => {return {y: spread}});
      animationGOTC(numTraces, traces);
    } else {
      // Combine the lines when unchecked
      animationGOTC(numTraces, finalTraces);
    }
  });
}, comp_time*500);
}

function animationGOTC(numTraces, traces){
  
  Plotly.animate('myGraph', {
    data: traces,
    traces: numTraces,
    layout: {}
  }, {
    transition: {
      duration: 3000,
      easing: 'cubic-in-out'
    },
    frame: {
      duration: 3000
    }
  });
  // wait 4000 ms for animation to finish
setTimeout(function(){
  console.log('resizing')
  Plotly.relayout('myGraph', {'yaxis.autorange': true});
}, 4000);
}


// Add event listener to button addGoal to set a plotly onclick event to add a goal
document.getElementById('addGoal').addEventListener('click', function() {
  console.log('addGoal clicked');
  var myPlot = document.getElementById('myGraph');

  function clickHandler(data) {
    console.log("adding goal", myPlot.layout)
    var xaxis = myPlot.layout.xaxis;
    var yaxis = myPlot.layout.yaxis;
    var clickx = data.event.clientX;
    var clicky = data.event.clientY
    var left = myPlot.getBoundingClientRect().left;
    var top = myPlot.getBoundingClientRect().top
    var minx = xaxis.range[0]
    var maxx = xaxis.range[1]
    var miny = yaxis.range[0];
    var maxy = yaxis.range[1];

    // Calculate the relative position of the click
    var relX = (clickx - left) / myPlot.clientWidth;
    var relY = (clicky - top) / myPlot.clientHeight;

    // Convert relative position to data coordinates
    var x = xaxis.range[0] + relX * (maxx-minx);
    var y = yaxis.range[0] + (1 - relY) * (maxy-miny);
    

    addGoal(x, y);

    // Remove the click event listener after it runs
    myPlot.removeListener('click', clickHandler);
    console.log('click event listener removed');
  }
  // Compress the graph on the horizontal axis and add new date values
  var currentRange = myPlot.layout.xaxis.range;
  var newEndDate = currentRange[1]+60
  var tickvals = myPlot.layout.xaxis.tickvals;
  var ticktext = myPlot.layout.xaxis.ticktext;
  var interval = tickvals[1]-tickvals[0];
  while(tickvals[tickvals.length-1]<newEndDate){
    newTick = tickvals[tickvals.length-1]+interval;
    tickvals.push(newTick);
    date = serialToDate(newTick);
    ticktext.push(date);
  }
  // set xaxis range to currentRange[0] to newEndDate
  

  Plotly.relayout(myPlot, {
    'xaxis.range': [currentRange[0], newEndDate]
  });

  // Attach the click handler
  myPlot.on('plotly_click', clickHandler);
  console.log('click event listener added', myPlot);
});


// log the goal to the database and update goals
async function addGoal(xData, yData) {
  
  // convert xData(serial date) to string date
  let dateString = serialToDate(xData);
  // set dateSet to today's date
  let dateSet = new Date();
  let dateSetString = (dateSet.getMonth() + 1) + '/' + dateSet.getDate() + '/' + (dateSet.getFullYear());
  // generate a random 5 digit id
  let id = Math.floor(Math.random() * 90000) + 10000;
  let data = {date: dateString, grade: yData, categories: currentCategories, date_set: dateSetString, OSIS: osis, id: id}
  await fetchRequest('/post_data', {sheet: "Goals", data: data});
  goals.push(data)
  console.log(goals, data)
  // update goals
  updateGoals(goals, currentCategories);
  // update goalTable
  setGoalTable(goals);
}

function updateGoals(goals, categories) {
  // if goals does not exist, return
  if (!goals) {
    return;
  }
  // for each goal in goals where goal['categories'] matches categories, add a line on the graph
  graph = document.getElementById('myGraph');
  medals = [];
  lines = [];
  for (let i = 0; i < goals.length; i++) {
    let goal = goals[i];
    console.log(goal['categories'], categories)
    if (goal['categories'].every(category => categories.includes(category))) {
      // convert goal['date'] to serial date
      let xgoal = dateToSerial(goal['date']);
      let ygoal = goal['grade'];
      let xinitdate = goal['date_set'];
      let xinit = dateToSerial(xinitdate);
      // get yinit by interpolating from combinedx and combinedy
      let yinit = interpolate(xinit, combinedx, combinedy);

      console.log("in updateGoals", xgoal, ygoal, xinit, yinit);
      // create a line from (xinit, yinit) to (xgoal, ygoal) on the graph
      let line = {
        x: [xinit, xgoal],
        y: [yinit, ygoal],
        mode: 'lines',
        line: {
          color: 'rgba(255, 255, 255, 0.5)',
          width: 1
        },
        name: 'Goal'
      };
      lines.push(line);
      // add the image(/static/media/GoalMedal.png) of a medal, representing the goal, at (xgoal, ygoal)
      sizex = (graph.layout.xaxis.range[1]-graph.layout.xaxis.range[0])/5;
      sizey = (graph.layout.yaxis.range[1]-graph.layout.yaxis.range[0])/5;
      
      let image = {
        source: '/static/media/GoalMedal.png',
        x: xgoal,
        y: ygoal,
        xref: 'x',
        yref: 'y',
        sizinf: 'contain',
        sizex: 5,
        sizey: 5,
        xanchor: 'center',
        yanchor: 'middle'
      };
      medals.push(image);
    }
  }
  console.log(medals)
  Plotly.addTraces(graph, lines);
  Plotly.relayout(graph, {
    images: medals,
    'images[0].xref': 'paper',
    'images[0].yref': 'paper',
    'images[0].sizex': 0.05,
    'images[0].sizey': 0.05
  });
}

function interpolate(x, xs, ys) {
  if (x > xs[xs.length - 1]) {
      x = xs[xs.length - 1];
  }
  for (let i = 0; i < xs.length - 1; i++) {
      if (x >= xs[i] && x <= xs[i + 1]) {
          let x1 = xs[i], x2 = xs[i + 1];
          let y1 = ys[i], y2 = ys[i + 1];
          return y1 + (y2 - y1) * (x - x1) / (x2 - x1);
      }
  }
  throw new Error('x is out of bounds. x = ' + x + ', xs = ' + xs);
}

function dateToSerial(dateString) {
  // Parse the input date string
  let [month, day, year] = dateString.split('/').map(Number);

  // Create a date object for the input date
  let inputDate = new Date(year, month - 1, day);

  // Create a date object for January 1, 1 AD
  let startDate = new Date(1, 0, 1); // Month is zero-indexed

  // Calculate the difference in time (in milliseconds)
  let timeDifference = inputDate.getTime() - startDate.getTime();

  // Convert the difference from milliseconds to days
  let daysDifference = Math.floor(timeDifference / (1000 * 60 * 60 * 24));

  return daysDifference+693962;
}


function serialToDate(serial) {
  // Calculate the date from the ordinal number
  let baseDate = new Date(1, 0, 1);
  let date = new Date(baseDate.getTime() + (serial - 1) * 24 * 60 * 60 * 1000);
  
  // Format the date as m/d/yyyy
  let day = date.getDate().toString();
  let month = (date.getMonth() + 1).toString(); // Add 1 to convert from 0-indexed to 1-indexed
  let year = (date.getFullYear()-1900).toString();
  let dateString = month + "/" + day + "/" + year;
  
  return dateString;
}



function draw_histogram(grades, cat, comp_time) {
  let grade_points = [];
  for (let i = 0; i < grades.length; i++) {
    let grade = grades[i];
    console.log(cat.includes('all') && cat.includes('All'))
    
    if ((cat.includes(grade['class'].toLowerCase()) || cat.includes('all')) && (cat.includes(grade['category'].toLowerCase()) || cat.includes('All'))) {
      grade_points.push(grade);
    }
  }
  // sort grades into groups based on same class and category
  let grade_groups = {};
  for (let i = 0; i < grade_points.length; i++) {
    let grade = grade_points[i];
    let key = grade['class'] + " " + grade['category'];
    if (key in grade_groups) {
      grade_groups[key].push(grade);
    } else {
      grade_groups[key] = [grade];
    }
  }
  let traces = [];
  let individualTraces = []; // Store individual traces
  // create a histogram for each group
  for (const key in grade_groups) {
    let group = grade_groups[key];
    let data = group.map(grade => grade['score']/grade['value']*100);
    
    // Calculate bandwidth based on data variance
    var bandwidth = Math.sqrt(data.reduce((acc, val) => acc + Math.pow(val - data.reduce((a, b) => a + b) / data.length, 2), 0) / data.length);
    bandwidth = Math.max(bandwidth, 0.5); // Ensure minimum bandwidth
    
    var kde = kernelDensityEstimation(data, epanechnikovKernel, bandwidth);
    // Plot the density estimate
    var trace = {
      x: kde.x,
      y: kde.y,
      mode: 'lines',
      name: key,
    };
    traces.push(trace);
    individualTraces.push({x: kde.x, y: kde.y}); // Store individual KDE
  }

var layout = {
    title: 'Grade Distribution',
    xaxis: {title: 'Grade', showgrid: false},
    yaxis: {title: 'Density', showgrid: false},
    showlegend: false,
    displayModeBar: false,
    paper_bgcolor: 'rgba(0,0,0,0)', // Transparent background
    plot_bgcolor: 'rgba(0,0,0,0)',  // Transparent plot area
    font: {
    color: 'white' // White text
  }
};
// Store the combined KDE
var data = grades.map(grade => grade['score']/grade['value']*100);
var kde = kernelDensityEstimation(data, epanechnikovKernel, bandwidth);
let combinedTrace = {x: kde.x, y: kde.y};

// Define tracenums
let tracenums = Array.from({length: traces.length}, (_, i) => i);


Plotly.newPlot('myHisto', traces, layout);
setTimeout(function(){
  animationHistogram(tracenums, Array(traces.length).fill(combinedTrace));
}, comp_time*500);

// Update the event listener for the checkbox
document.getElementById('componentsHisto').addEventListener('change', function() {
  if(this.checked) {
    animationHistogram(tracenums, individualTraces);
  } else {
    animationHistogram(tracenums, Array(traces.length).fill(combinedTrace));
  }
});
}

function animationHistogram(tracenums, traces){
  
  Plotly.animate('myHisto', {
    data: traces,
    traces: tracenums,
    layout: {}
  }, {
    transition: {
      duration: 3000,
      easing: 'cubic-in-out'
    },
    frame: {
      duration: 3000
    }
  });
  setTimeout(function(){
    console.log('resizing')
    Plotly.relayout('myHisto', {'yaxis.autorange': true});
  }, 4000);
}

// create a function to call draw_histogram and draw_gotc with all of the necessary parameters
function draw_graphs(grade_spreads, times, weights, grades, cat, val_sums, comp_time=0, goals){
  currentCategories = cat;
  draw_gotc(grade_spreads, times, weights, grades, cat, val_sums, comp_time, goals);
  draw_histogram(grades, cat, comp_time);
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
  draw_graphs(grade_spreads, times, weights, grades, selectedClasses, val_sums, specificity);
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



async function getInsights(){
  document.getElementById('loadingWheel').style.visibility = "visible";
  const data = await fetchRequest('/insights', { data: '' });
  
  
  
  displayInsights(data);
  document.getElementById('loadingWheel').style.visibility = "hidden";

  }


function percentile(arr, p) {
  const sorted = arr.slice().sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = lower + 1;
  const weight = index % 1;

  if (upper >= sorted.length) return sorted[lower];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}



let slideIndex = 0;

        function moveSlide(n) {
            showSlide(slideIndex += n);
        }

        function currentSlide(n) {
            showSlide(slideIndex = n);
        }

        function showSlide(n) {
            const slides = document.querySelectorAll('.slide');
            const dots = document.querySelectorAll('.dot');
            
            if (n >= slides.length) slideIndex = 0;
            if (n < 0) slideIndex = slides.length - 1;
            
            slides.forEach(slide => slide.style.display = 'none');
            dots.forEach(dot => dot.classList.remove('active'));
            
            slides[slideIndex].style.display = 'flex';
            dots[slideIndex].classList.add('active');
        }

        function setCompliments(compliments) {
            const carousel = document.getElementById("crs");
            const dotsContainer = document.querySelector(".dots");

            // Clear existing slides and dots
            carousel.innerHTML = '';
            dotsContainer.innerHTML = '';

            for (let x = 0; x < compliments.length; x++) {
                let slide = document.createElement("div");
                slide.className = "slide";
                let text = document.createElement("p");
                text.textContent = compliments[x];

                // Generate random color
                let randomColor = Math.floor(Math.random() * 16777215).toString(16);
                randomColor = randomColor.padStart(6, '0');
                console.log(randomColor);
                slide.style.backgroundColor = "#" + randomColor;

                slide.appendChild(text);
                carousel.appendChild(slide);

                // Create dot
                let dot = document.createElement("span");
                dot.className = "dot";
                dot.onclick = () => currentSlide(x);
                dotsContainer.appendChild(dot);
            }

            // Show the first slide
            showSlide(slideIndex);
        }



// Epanechnikov kernel function
function epanechnikovKernel(u) {
  return Math.abs(u) <= 1 ? 0.75 * (1 - u * u) : 0;
}

// Kernel density estimation function
function kernelDensityEstimation(data, kernel, bandwidth) {
  var n = data.length;
  var xMin = Math.min.apply(null, data);
  var xMax = Math.max.apply(null, data);
  
  // Check if all values are the same
  if (xMin === xMax) {
    // Create a Gaussian-like hill centered at the single value
    var x = [], y = [];
    for (var i = 0; i < 100; i++) {
      var xi = xMin - 5 * bandwidth + i * (10 * bandwidth / 100);
      var yi = Math.exp(-Math.pow(xi - xMin, 2) / (2 * Math.pow(bandwidth, 2)));
      x.push(xi);
      y.push(yi);
    }
    return {x: x, y: y};
  }
  
  // Original KDE calculation for non-uniform data
  var xRange = xMax - xMin;
  var x = [], y = [];
  
  for (var i = 0; i < 100; i++) {
    var xi = xMin + i * (xRange / 100);
    var yi = 0;
    for (var j = 0; j < n; j++) {
      yi += kernel((xi - data[j]) / bandwidth);
    }
    yi /= (n * bandwidth);
    x.push(xi);
    y.push(yi);
  }
  return {x: x, y: y};
}


function shareStat(stat, id){
  text = first_name+"My"+" "+stat+" is "+document.getElementById(id).textContent+"! Check out my other stats on my bxsciweb profile!"
  navigator.share({
    title: first_name+"'s Grade Analytics",
    text: text,
    url: 'https://bxsciweb.org/users/'+osis
  })
}

async function shareGraph(id) {
  // Get the Plotly graph element
  var graph = document.getElementById(id)

  // Use html2canvas to take a screenshot of the div
  html2canvas(graph).then(canvas => {
    // Convert the canvas to a Blob
    canvas.toBlob(blob => {
      const file = new File([blob], "graph.png", { type: "image/png" });

      // Use the navigator.share API to share the image
      if (navigator.share) {
        navigator.share({
          title: 'Graph Image',
          text: 'Check out this graph!',
          files: [file]
        }).then(() => {
          console.log('Share successful');
        }).catch(error => {
          console.error('Error sharing', error);
        });
      } else {
        console.error('Web Share API not supported');
      }
    });
  }).catch(error => {
    console.error('Error taking screenshot', error);
  });
}

function setGoalTable(goals) {
  const tableBody = document.getElementById('goalTableBody');
  tableBody.innerHTML = ''; // Clear existing rows

  goals.forEach((goal, index) => {
    const row = document.createElement('tr');
    
    const dateSet = new Date(goal.date_set);
    const goalDate = new Date(goal.date);
    const today = new Date();
    const daysLeft = Math.ceil((goalDate - today) / (1000 * 60 * 60 * 24));
    
    const totalDays = Math.ceil((goalDate - dateSet) / (1000 * 60 * 60 * 24));
    const daysPassed = totalDays - daysLeft;
    const percentTimeComplete = Math.round((daysPassed / totalDays) * 100);

    // Interpolate the grade when set
    const gradeWhenSet = interpolate(dateToSerial(goal.date_set), combinedx, combinedy);
    const currentGrade = interpolate(dateToSerial(today.toLocaleDateString()), combinedx, combinedy);

    const totalGradeChange = goal.grade - gradeWhenSet;
    const currentGradeChange = currentGrade - gradeWhenSet;
    const percentGradeComplete = Math.round((currentGradeChange / totalGradeChange) * 100);

    const expectedGrade = gradeWhenSet + (totalGradeChange * (daysPassed / totalDays));
    const percentAboveBelow = Math.round((currentGrade - expectedGrade) * 100) / 100;

    row.innerHTML = `
      <td>${daysLeft}</td>
      <td>${percentTimeComplete}%</td>
      <td>${percentGradeComplete}%</td>
      <td>${percentAboveBelow > 0 ? '+' : ''}${percentAboveBelow}%</td>
      <td>${goal.grade.toFixed(2)}%</td>
      <td>${goal.categories.join(', ')}</td>
      <td><span class="delete-goal" data-id="${goal.id}">🗑️</span></td>
    `;

    tableBody.appendChild(row);
  });

  // Add event listeners for delete buttons
  document.querySelectorAll('.delete-goal').forEach(button => {
    button.addEventListener('click', async function() {
      const goalId = this.getAttribute('data-id');
      goals = await deleteGoal(goalId);
      // Refresh the graph and table
      draw_graphs(grade_spreads, times, weights, grades, currentCategories, val_sums, 5, goals);
      setGoalTable(goals);
    });
  });
}

async function deleteGoal(goalId) {
  await fetchRequest('/delete_data', { sheet: "Goals", row_name: "id", row_value: parseInt(goalId) });
  goals = goals.filter(goal => parseInt(goal.id) != parseInt(goalId));
  return goals
}