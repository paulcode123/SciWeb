var form;
var tbody;
var grades;

var times;
var weights;
var grade_spreads;
var grades;
var val_sums;


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

    setClasses(weights, categories)
    setStats(stats)
    // setGoalProgress()
    setCompliments(compliments)
    
    draw_graphs(grade_spreads, times, weights, grades, ['All', 'all'], val_sums)
    
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
function setClasses(weights, categories){
    var classes = Object.keys(weights)
    var class_div = document.getElementById("classes")
    var categories_div = document.getElementById("categories")
    console.log(classes)
    for(let x=0;x<classes.length;x++){
      // var child_label = document.createElement("label");
      let text = document.createElement("label");
      let checkbox = document.createElement("input");
      let checkmark = document.createElement("span");

      checkbox.type = 'checkbox';
      checkbox.value = classes[x].toLowerCase();
      checkbox.name = 'class';

      text.textContent = "     "+ classes[x];
      text.className = 'custom-checkbox';

      checkmark.className = 'checkmark';
      checkbox.addEventListener('change', function() {
        if(this.checked) {
          text.style.backgroundColor = 'green'; // Directly change the background color
        } else {
          text.style.backgroundColor = 'darkgray'; // Revert to original color
        }
      });
      text.appendChild(checkmark);
      text.appendChild(checkbox);
      class_div.appendChild(text);
    }

    console.log(categories)
for(let x=0;x<categories.length;x++){
      let label = document.createElement("label");
      let input = document.createElement("input");
      input.type = 'checkbox'
      input.value = categories[x];
      label.textContent = "     "+ categories[x];
      input.name = 'class'
      label.className = 'custom-checkbox';
      input.addEventListener('change', function() {
        if(this.checked) {
          label.style.backgroundColor = 'green'; // Directly change the background color
        } else {
          label.style.backgroundColor = 'darkgray'; // Revert to original color
        }
      });
      label.appendChild(input);
      categories_div.appendChild(label);
    }
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
function draw_gotc(grade_spreads, times, weights, grades, cat, val_sums, goals=null, goal_set_coords=null){
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
      spread_names.push(spread_class + " " + spread_category);
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
  let trace = {
    x: times,
    y: spread,
    mode: 'lines',
    line: {
      color: randomColor,
      width: 1
    },
    name: spread_names[i]
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
    range: [min_x - 3, max_x + 3]
  },
  yaxis: {
    title: 'Grades',
  },
  displayModeBar: false,
  //shapes: goals // Add the goal zone shape
  // images: goals
};

// create final, combined line: at each timepoint, sum the weighted grade_spreads
let final = [];
for (let i = 0; i < times.length; i++) {
  let gradesum = 0;
  let weightsum = 0;
  for (let j = 0; j < spreads.length; j++) {
    gradesum += spreads[j][i]*w[j];
    weightsum += w[j];
  }
  sum = gradesum/weightsum;
  final.push(sum);
}
console.log(final)


// create an array with a copy of dict {y: final} for each spread
let finalTraces = [];
let numTraces = [];
for (let i = 0; i < spreads.length; i++) {
  finalTraces.push({y: final});
  numTraces.push(i+1);
}

// Render the graph
Plotly.newPlot('myGraph', spreadTraces, layout);
// Start animation
Plotly.animate('myGraph', {
  data: finalTraces,
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
// hide loading wheel
document.getElementById('loadingWheel').style.visibility = "hidden";
// wait 4000 ms for animation to finish
setTimeout(function(){
  console.log('resizing')
  Plotly.relayout('myGraph', {'yaxis.autorange': true});
}, 4000);
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

  return daysDifference+693596;
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



function draw_histogram(grades, cat) {
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
  // create a histogram for each group
  for (const key in grade_groups) {
    let group = grade_groups[key];
    let data = group.map(grade => grade['score']/grade['value']*100);
   // Calculate the kernel density estimate
   var bandwidth = 1.0; // You can adjust the bandwidth as needed
   var kde = kernelDensityEstimation(data, epanechnikovKernel, bandwidth);
    // Plot the density estimate
    var trace = {
      x: kde.x,
      y: kde.y,
      mode: 'lines',
      name: key,
};
  traces.push(trace);
  }

var layout = {
    title: 'Grade Distribution',
    xaxis: {title: 'Grade'},
    yaxis: {title: 'Density'}
};
// run kde for all grades
var data = grades.map(grade => grade['score']/grade['value']*100);
var kde = kernelDensityEstimation(data, epanechnikovKernel, bandwidth);
let coordcopies = [];
let tracenums = [];
for (let i = 0; i < traces.length; i++) {
  coordcopies.push({y: kde.y, x: kde.x});
  tracenums.push(i);
}

Plotly.newPlot('myHisto', traces, layout);
Plotly.animate('myHisto', {
  data: coordcopies,
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
function draw_graphs(grade_spreads, times, weights, grades, cat, val_sums){
  draw_gotc(grade_spreads, times, weights, grades, cat, val_sums);
  draw_histogram(grades, cat);
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
  draw_graphs(grade_spreads, times, weights, grades, selectedClasses, val_sums);
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
