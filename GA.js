// UNCOMMENT TO RUN
// getLogin()

const form = document.querySelector("#gradeform");
form.style.display = "none";

const enter_button = document.querySelector("#enter-grades-button");
const open_button = document.querySelector("#open-grades-button");

const tbody = form.querySelector('tbody'); // Get the tbody element inside the form



// UNCOMMENT TO RUN
// enter_button.addEventListener("click", () => {
//   form.style.display = "block";
// });

open_button.addEventListener("click", () => {
  
  getGrades();
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
// alert(JSON.stringify(result));   
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



async function getGrades(){
const response = await fetch('https://sheetdb.io/api/v1/pb8spx7u5gewk?sheet=Grades', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
});

if (response.ok) {
  const data = await response.json();
  grades = []
  for(let i=0; i<data.length; i++){
    grades.push(data[i])
  
  }
  
  processGrades(grades);
} else {
  alert('Failed to read data from SheetDB');
}

}
function processGrades(grades){
  
  
  var smallerNum = 1000000;
  var greaterNum = 0;
  for(let i=0;i<grades.length;i++){
    
    const t_grade = grades[i].date
    
    if(t_grade < smallerNum){
      
      smallerNum = t_grade;
      
    }
    if(grades[i].date > greaterNum){
      
      greaterNum = grades[i].date;
    }
  }

// Calculate the range between the two numbers
const range = greaterNum - smallerNum;

// Calculate the size of each increment
const increment = range / 10;

// Create an array to store the 10 even increments
const increments = [];
const graph_grades = [];
// Iterate through each increment and add it to the array

for (let i = 0; i <= 10; i++) {
  const step = Math.round(parseInt(smallerNum) + (i * increment)+1)
  
  increments.push(step);
  graph_grades.push(calculateGrade(step, grades));
}
  
  graphChart(increments, graph_grades);
  
}
// Function to calculate the grade for a given time
function calculateGrade(time, data) {
  
  const categories = {};
  const weights = {
  "Bio": {
    "homework": 0.3,
    "quiz": 0.2,
    "test": 0.5
  },
  "Eng": {
    "homework": 0.3,
    "quiz": 0.2,
    "test": 0.5
  },
  "Orch": {
    "homework": 0.3,
    "quiz": 0.2,
    "test": 0.5
  },
  "Geo": {
    "homework": 0.3,
    "quiz": 0.2,
    "test": 0.5
  },
  "History": {
    "homework": 0.3,
    "quiz": 0.2,
    "test": 0.5
  }
  
};
  
  for (let i = 0; i < data.length; i++) {
    const datum = data[i];
    if (datum.date >= time) continue;
    
    if (!categories[datum.class]) categories[datum.class] = {};
    if (!categories[datum.class][datum.category]) {
      categories[datum.class][datum.category] = {
        scoreSum: 0,
        valueSum: 0,
        count: 0,
        weight: weights[datum.class][datum.category]
      };
    }
    const category = categories[datum.class][datum.category];
    category.scoreSum += datum.score;
    category.valueSum += datum.value;
    category.count++;
    // alert("score:"+datum.score+"weight:"+category.weight);
  }

  let totalGrade = 0;
  let classCount = 0;
  for (const className in categories) {
    const classData = categories[className];
    let classGrade = 0;
    let categoryCount = 0;
  var weightSum = 0;
    for (const categoryName in classData) {
      const category = classData[categoryName];
      classGrade += (category.scoreSum / category.valueSum)*category.weight;
      weightSum += category.weight
      
      categoryCount++;
    }
    
    if (categoryCount > 0) {
      // classGrade /= categoryCount;
      let multiplier = 2-weightSum
      totalGrade += classGrade*multiplier;
      classCount++;
    }
    
  }
  if (classCount > 0) {
    return totalGrade / classCount;
  } else {
    return 0;
  }
}


function graphChart(increments, grades){
var ctx = document.getElementById('myChart').getContext('2d');
var myChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: increments,
        datasets: [{
            label: 'Grade',
            data: grades,
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1
        }]
    },
    options: {
        scales: {
            yAxes: [{
                ticks: {
                    beginAtZero: true
                }
            }]
        }
    }
});
}



