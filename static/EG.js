// Add Shepherd.js for the tutorial
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";


const shepherdScript = document.createElement('script');
shepherdScript.src = 'https://cdn.jsdelivr.net/npm/shepherd.js@11.1.1/dist/js/shepherd.min.js';
document.head.appendChild(shepherdScript);

const shepherdStyles = document.createElement('link');
shepherdStyles.rel = 'stylesheet';
shepherdStyles.href = 'https://cdn.jsdelivr.net/npm/shepherd.js@11.1.1/dist/css/shepherd.css';
document.head.appendChild(shepherdStyles);

// Jupiter API?
const form = document.querySelector("#gradeform");
const tbody = document.querySelector("#mytbody");
var grades;
const Pullbutton = document.querySelector('#Jupull');
var rawclasses;
var friends;

// when OpenGA button is clicked, open the GradeAnalysis page
document.getElementById('OpenGA').addEventListener('click', () => {
  // Check if we're in tutorial mode
  const urlParams = new URLSearchParams(window.location.search);
  const inTutorial = urlParams.get('tutorial') === 'true';
  // Pass tutorial parameter if we're in tutorial mode
  window.location.href = inTutorial ? '/GradeAnalysis?tutorial=true' : '/GradeAnalysis';
});

//add event listener to the pull button
Pullbutton.addEventListener('click', pullfromJupiter);

async function pullfromJupiter(){
  startLoading();
  const addClasses = document.getElementById('addclasses').checked;
  const loadingTime = addClasses ? 45 : 25;
  start_loading(loadingTime);
  
  // Create status display element
  const statusDiv = document.createElement('div');
  statusDiv.id = 'status-updates';
  document.body.appendChild(statusDiv);

  const osis = document.getElementById('osis').value;
  const password = document.getElementById('password').value;
  const addclasses = document.getElementById('addclasses').checked;
  const updateLeagues = document.getElementById('updateLeagues').checked;
  
  try {
    // First authenticate
    statusDiv.innerHTML = '<p>Authenticating...</p>';
    const authResponse = await fetchRequest('/jupiter_auth', {
      "osis": osis,
      "password": password,
      "addclasses": addclasses,
      "updateLeagues": updateLeagues
    });

    if (!authResponse || authResponse.error) {
      throw new Error(authResponse?.error || 'Authentication failed');
    }

    // Process classes
    statusDiv.innerHTML = '<p>Getting classes and tokens data...</p>';
    const classesResponse = await fetchRequest('/jupiter_process_classes', {});
    if (!classesResponse || classesResponse.error) {
      throw new Error(classesResponse?.error || 'Failed to process classes');
    }

    // Process grades
    statusDiv.innerHTML = '<p>Processing grades...</p>';
    const gradesResponse = await fetchRequest('/jupiter_process_grades', {
      classes: classesResponse.classes
    });
    if (!gradesResponse || gradesResponse.error) {
      throw new Error(gradesResponse?.error || 'Failed to process grades');
    }

    // Success - show completion animation and update grades table
    statusDiv.remove();
    const checkDiv = document.createElement('div');
    checkDiv.className = 'completion-check';
    const checkIcon = document.createElement('div');
    checkIcon.className = 'check-icon';
    checkDiv.appendChild(checkIcon);
    document.body.appendChild(checkDiv);
    // if join classes was checked, remove the classes sheet from cache
    if(addclasses){
      localStorage.removeItem('Classes');
    }
    
    setTimeout(() => {
      checkDiv.classList.add('fade-out');
      setTimeout(() => {
        checkDiv.remove();
        createGradesTable(gradesResponse.grades);
      }, 300);
    }, 1200);

    // Set grades in cache
    localStorage.setItem('Grades', JSON.stringify({
      data: gradesResponse.grades,
      timestamp: Date.now()
    }));

  } catch (error) {
    console.error('Error:', error);
    statusDiv.remove();
    alert(error.message || 'An error occurred while fetching grades');
  } finally {
    endLoading();
  }
}

//When the user selects a class, update the category dropdown with the categories for that class
function optionSelected(classNum, classes){
  console.log(classNum);
  console.log(classes);
  var selectedClass = document.getElementById("class"+classNum).value;
  var categories = classes.filter(item => item.name == selectedClass)[0].categories;
  
  if(categories){
    
  categories = JSON.parse(categories).filter(item => typeof item === 'string');
    
  var categoryElement = document.getElementById("category"+classNum)
  // Remove all existing options
  while (categoryElement.firstChild) {
    categoryElement.removeChild(categoryElement.firstChild);
}
  // Add nex options
  for(let x=0; x<categories.length; x++){
  const newOption = document.createElement("option");
  newOption.value = categories[x];
  newOption.textContent = categories[x];
      // Add the new option to the select element
categoryElement.appendChild(newOption);
  }
  
  }
}

//When the user submits the form, get the values from the form and create a grade object
form.addEventListener('submit', (event) => {
  
  const inputs = [];
  event.preventDefault(); // Prevent the form from submitting and refreshing the page
var pasted = document.getElementById('pasted').value;
  //if the user pasted grades, parse the pasted text: not working yet
  if (pasted != ""){
    
pasted = pasted.split(/\s(?=\d+\/\d+)/);
    console.log(pasted)
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
  //If the user didn't paste grades, get the grades from the form
  else{
  


  
  // Create an array to store the user inputs
  

  // Loop through all the rows in the tbody
  const rows = tbody.querySelectorAll('tr');
  rows.forEach((row) => {
    // Get the input values for the current row
    const date = row.querySelector('[name^="date"]').value; // Get the input with a name that starts with "date"
    const score = row.querySelector('[name^="score"]').value; // Get the input with a name that starts with "score"
    const value = row.querySelector('[name^="value"]').value; // Get the input with a name that starts with "value"
    const classInput = row.querySelector('[id^="class"]').value; // Get the input with a name that starts with "class"
    const category = row.querySelector('[id^="category"]').value; // Get the input with a name that starts with "category"
  const name = row.querySelector('[name^="name"]').value; 
    // If all values in row are filled in, create an object with the input values and add it to the inputs array
    if(date != "" && score != "" && value != "" && classInput != "" && category != "" && name != ""){
    const inputObj = {
      date: date,
      score: score,
      value: value,
      class: classInput,
      category: category,
      name: name,
      osis: osis,
      id: Math.floor(Math.random() * 10000)
    };
    inputs.push(inputObj);
    }
  });
  
  }
  // Do something with the inputs array, e.g. send it to a server or store it in local storage
  console.log(inputs);
  document.getElementById("gradeform").reset();
  
  post_grades(inputs);
  
});



async function post_grades(grades){
  startLoading();
  await fetchRequest('/post_grades', {"data": grades});
  endLoading();
}



  var data = await fetchRequest('/data', {"data": 'Name, Grades, Classes, Friends'});
  
  
  grades = data['Grades']
  rawclasses = data['Classes']
  friends = data['Friends']
  const classes = rawclasses.filter(item => (item.OSIS.toString()).includes(osis));
  if(classes.length == 0){
    // check "Join Classes" checkbox in jupiter form to add classes
    document.getElementById('addclasses').checked = true;
  }
  setClassOptions(classes)
  for(let z=1;z<6;z++){
document.getElementById("class"+z).addEventListener("change", () => {optionSelected(z, classes)});
}
  createGradesTable(grades);
  // document.getElementById('loadingWheel').style.visibility = "hidden";


function setClassOptions(filteredClasses){
  
  for(let i=1; i<6; i++){
    const selectElement = document.getElementById("class"+i);
    for(let x=0; x<filteredClasses.length; x++){
      // Create a new option element
      const newOption = document.createElement("option");
      newOption.value = filteredClasses[x].name;
      newOption.textContent = filteredClasses[x].name;

      // Add the new option to the select element
      selectElement.appendChild(newOption);
    }

// Remove the "Please add classes first" option
if(filteredClasses.length != 0){
selectElement.removeChild(selectElement.querySelector('option[value="default"]'));
} else {
  selectElement.querySelector('option[value="default"]').textContent = "Please select classes"
}
  }
  
}


// Function to create a table cell
function createTableCell(value) {
  const cell = document.createElement('td');
  cell.textContent = value;
  return cell;
}

// Function to create an share button for the row
function createShareButton(index) {
  const row = document.getElementById('gradesBody').children[index];
  const cell = document.createElement('td');
  // add the image /static/media/shareicon.png, and onclick, run navigator.share
  const span = document.createElement('span');
  const icon = document.createElement('img');
  icon.src = '/static/media/shareicon.png';
  icon.style.width = '20px';
  icon.style.height = '20px';
  span.appendChild(icon);
  span.addEventListener('click', () => {
    const grade = grades[index];
    navigator.share({
      title: 'Grade',
      text: `I got a ${grade.score}/${grade.value} on ${grade.name} in ${grade.class}! Check out your grades using the link below.`,
      url: "https://bxsciweb.org/EnterGrades"
    });
  });
  cell.appendChild(span);
  return cell;
}







async function update_grades(id, grades){
  await fetchRequest('/update_data', {"sheet": "Grades", "data": grades, "row_name": "id", "row_value": id});
}

// add event listener
document.getElementById('DeleteGrades').addEventListener('click', DeleteGrades);
async function DeleteGrades(){
  // clear grades from cache
  localStorage.removeItem('Grades');
  
    // hide button
    document.getElementById('DeleteGrades').style.visibility = "hidden";
    document.getElementById('OpenGA').style.visibility = "hidden";
    document.getElementById('DownloadGrades').style.visibility = "hidden";
    // remove grades from table
    document.getElementById('gradesBody').innerHTML = '';

}

function start_loading(time){
const loadingBar = document.querySelector('.loading-bar');
loadingBar.style.display = 'block';
let width = 0;
const interval = setInterval(function() {
  if (width >= 100) {
    clearInterval(interval);
  } else {
    width++;
    loadingBar.style.width = width + '%';
  }
}, time*10); // 100ms interval for 10 seconds total
}

// add event listener to button with it toggleGradeForm to show form with id 'gradeform' and change last char of button text from > to v
document.getElementById('toggleGradeForm').addEventListener('click', toggleGradeForm);
function toggleGradeForm(){
  const form = document.getElementById('gradeform');
  const button = document.getElementById('toggleGradeForm');
  if(button.textContent.slice(-1) == '>'){
    form.style.display = 'block';
    button.textContent = button.textContent.slice(0, -1) + 'v';
  } else {
    form.style.display = 'none';
    button.textContent = button.textContent.slice(0, -1) + '>';
  }
}

// if button with id "DownloadGrades" is clicked, download grades as a csv
document.getElementById('DownloadGrades').addEventListener('click', downloadGrades);

function downloadGrades() {
  const csv = convertToCSV(grades);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'grades.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

function convertToCSV(grades) {
  if (grades.length === 0) return '';

  const headers = Object.keys(grades[0]);
  const csvRows = [headers.join(',')];

  for (const grade of grades) {
    let values = headers.map(header => grade[header]);
    // replace any commas in values with a //
    values = values.map(value => (value.toString()).replace(/,/g, '//'));
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

// When an item is uploaded to the input field with id="csvfile", parse it into a list of dictionaries, run CreateGradesTable on it, and post it to the server
document.getElementById('csvfile').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  const text = await file.text();
  const grades = parseCSV(text);
  console.log(grades);
  
  post_grades(grades);
  createGradesTable(grades);
  
});


function parseCSV(text) {
  const lines = text.split('\n');
  const headers = lines[0].split(',');

  const grades = lines.slice(1).map(line => {
    let values = line.split(',');
    
    // Replace any // in values with a comma
    values = values.map(value => value.replace(/\/\//g, ','));
    const grade = {};
    headers.forEach((header, index) => {
      grade[header] = values[index];
    });
    return grade;
  });

  return grades;
}










function createGradesTable(grades) {
  const tableBody = document.getElementById('gradesBody');
  tableBody.innerHTML = ''; // Clear any existing rows
  if (grades.length>1) {
    document.getElementById('DeleteGrades').style.visibility = "visible";
    document.getElementById('OpenGA').style.visibility = "visible";
    document.getElementById('DownloadGrades').style.visibility = "visible";
  
  // sort grades by date from most recent to least recent
  grades.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  for (let i = 0; i < grades.length; i++) {
    const row = document.createElement('tr');

    const grade = grades[i];
    const { date, score, value, class: className, category, name } = grade;

    const cells = [
      createTableCell(date),
      createTableCell(score),
      createTableCell(value),
      createTableCell(className),
      createTableCell(category),
      createTableCell(name),
      createShareButton(i),
      createShowFriendsButton(grade),
      createEditButton(grade) // New column for edit button
    ];

    cells.forEach(cell => row.appendChild(cell));
    tableBody.appendChild(row);
  }
  
  // Reset search bar
  if (document.getElementById('gradeSearch')) {
    document.getElementById('gradeSearch').value = '';
  }
}



// Function to create the Show Friends button
function createShowFriendsButton(grade) {
  const cell = document.createElement('td');
  const button = document.createElement('button');
  button.textContent = 'Show Friends';
  button.classList.add('show-friends-button');
  button.addEventListener('click', () => showFriends(grade));
  cell.appendChild(button);
  return cell;
}

async function showFriends(grade) {
  // filter friends where status is "accepted"
  const acceptedFriends = friends.filter(item => item.status == "accepted");

  // for each friend, out of columns "OSIS" and "targetOSIS", add the one that is not the user's osis to a list
  const friendOSIS = []
  for(let i=0; i<acceptedFriends.length; i++){
    if(parseInt(acceptedFriends[i].OSIS) != parseInt(osis)){
      friendOSIS.push(parseInt(acceptedFriends[i].OSIS))
    } else {
      friendOSIS.push(parseInt(acceptedFriends[i].targetOSIS))
    }
  }
  fetchRequest('/send_notification', { OSIS: friendOSIS, title: first_name+" shared a grade with you!", body: `${first_name} got a ${grade.score}/${grade.value} on ${grade.name} in ${grade.class}!`, url: "https://bxsciweb.org/Stream"});
}

// Function to handle high five
async function handleHighFive(gradeId, senderOSIS) {
  const db = getFirestore();
  const usersData = await fetchRequest('/data', { data: 'Tokens' });
  const sender = usersData.find(u => u.OSIS === senderOSIS);

  if (sender && sender.token) {
    const message = {
      title: "High Five Received!",
      body: `${osis} gave you a high five for your grade!`,
      data: {
        type: "highFive",
        receiverOSIS: senderOSIS
      }
    };

    try {
      await addDoc(collection(db, "notifications"), {
        token: sender.token,
        message: message
      });
      console.log("High five notification sent successfully");
    } catch (error) {
      console.error("Error sending high five notification:", error);
    }
  }
}

// Add this to your existing event listeners
document.addEventListener('DOMContentLoaded', () => {
  // ... existing code ...

  // Listen for notifications
  const db = getFirestore();
  const notificationsRef = collection(db, "notifications");
  onSnapshot(notificationsRef, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const notification = change.doc.data();
        if (notification.message.data.type === "highFive" && notification.message.data.receiverOSIS === osis) {
          showNotification(notification.message.title, notification.message.body);
        } else if (notification.message.data.senderOSIS && notification.message.data.senderOSIS !== osis) {
          showNotification(notification.message.title, notification.message.body, () => {
            handleHighFive(notification.message.data.gradeId, notification.message.data.senderOSIS);
          });
        }
      }
    });
  });
});

function showNotification(title, body, onClickCallback = null) {
  if ("Notification" in window) {
    Notification.requestPermission().then(function (permission) {
      if (permission === "granted") {
        const notification = new Notification(title, {
          body: body,
          icon: '/static/media/favicon.png'
        });

        if (onClickCallback) {
          notification.onclick = () => {
            onClickCallback();
            notification.close();
          };
        }
      }
    });
  }
}


// Function to create the edit button
function createEditButton(grade) {
  const cell = document.createElement('td');
  const button = document.createElement('button');
  button.innerHTML = '✏️'; // Pencil emoji
  button.classList.add('edit-grade-button');
  button.addEventListener('click', () => showEditModal(grade));
  cell.appendChild(button);
  return cell;
}

// Function to show the edit modal
function showEditModal(grade) {
  const modal = document.createElement('div');
  modal.classList.add('edit-modal');
  modal.innerHTML = `
    <div class="edit-modal-content">
      <h3>Edit Grade</h3>
      <div class="edit-field">
        <label for="editName">Assignment Name:</label>
        <input type="text" id="editName" value="${grade.name}">
      </div>
      <div class="edit-field">
        <label for="editDate">Date:</label>
        <input type="date" id="editDate" value="${grade.date}">
      </div>
      <div class="edit-field">
        <label for="editScore">Score:</label>
        <input type="number" id="editScore" step="0.01" value="${grade.score}">
      </div>
      <div class="edit-field">
        <label for="editValue">Total Value:</label>
        <input type="number" id="editValue" step="0.01" value="${grade.value}">
      </div>
      <div class="edit-field">
        <label for="editWeight">Weight (scales score and value):</label>
        <input type="number" id="editWeight" step="0.01" value="${grade.value}">
      </div>
      <div class="edit-buttons">
        <button id="submitEdit" class="primary-button">Apply Override</button>
        <button id="cancelEdit" class="secondary-button">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Add event listener for weight changes
  const weightInput = document.getElementById('editWeight');
  const valueInput = document.getElementById('editValue');
  const scoreInput = document.getElementById('editScore');
  
  weightInput.addEventListener('input', () => {
    const weight = parseFloat(weightInput.value) || grade.value;
    const value = parseFloat(valueInput.value) || grade.value;
    const score = parseFloat(scoreInput.value) || grade.score;
    
    if (weight !== value) {
      // Scale the score and value based on the weight
      const scaleFactor = weight / value;
      valueInput.value = weight;
      scoreInput.value = (score * scaleFactor).toFixed(2);
    }
  });

  document.getElementById('submitEdit').addEventListener('click', () => submitEdit(grade, modal));
  document.getElementById('cancelEdit').addEventListener('click', () => document.body.removeChild(modal));
}

// Function to submit the edit
async function submitEdit(grade, modal) {
  const newName = document.getElementById('editName').value;
  const newDate = document.getElementById('editDate').value;
  const newScore = document.getElementById('editScore').value;
  const newValue = document.getElementById('editValue').value;

  const correction = {
    assignment: grade.name,
    class: grade.class,
    score: parseFloat(newScore),
    value: parseFloat(newValue),
    date: newDate,
    new_name: newName,
    OSIS: osis
  };

  try {
    await fetchRequest('/post_data', { sheet: "GradeCorrections", data: correction });
    alert('Grade correction saved! Repull from Jupiter to apply it.');
    document.body.removeChild(modal);
  } catch (error) {
    console.error('Error submitting grade correction:', error);
    alert('Failed to submit grade correction. Please try again.');
  }
}

// Add this at the end of your file for testing
// document.addEventListener('DOMContentLoaded', () => {
//   console.log("DOMContentLoaded");
//     // Create completion animation
//     const checkDiv = document.createElement('div');
//     checkDiv.className = 'completion-check';
//     const checkIcon = document.createElement('div');
//     checkIcon.className = 'check-icon';
//     checkDiv.appendChild(checkIcon);
//     document.body.appendChild(checkDiv);
    
//     // Remove animation after delay
//     setTimeout(() => {
//         checkDiv.classList.add('fade-out');
//         setTimeout(() => {
//             checkDiv.remove();
//         }, 300);
//     }, 1200);
// });

// Add this after your other document.ready event listeners
document.getElementById('gradeSearch').addEventListener('input', filterGrades);

function filterGrades() {
  const searchTerm = document.getElementById('gradeSearch').value.toLowerCase();
  const rows = document.getElementById('gradesBody').getElementsByTagName('tr');

  for (let row of rows) {
    const cells = row.getElementsByTagName('td');
    let shouldShow = false;
    
    // Check cells 1 (score), 3 (class), 4 (category), and 5 (name)
    // Skip cell 0 (date), cell 2 (value), and last cells (buttons)
    const cellsToSearch = [1, 3, 4, 5];
    
    for (let i of cellsToSearch) {
      if (cells[i] && cells[i].textContent.toLowerCase().includes(searchTerm)) {
        shouldShow = true;
        break;
      }
    }
    
    row.style.display = shouldShow || searchTerm === '' ? '' : 'none';
  }
}

// Add this function after the other initialization code
function startGradesTutorial() {
  console.log("Starting grades tutorial");
  
  // Check if Shepherd is loaded
  if (typeof Shepherd === 'undefined') {
    console.log("Waiting for Shepherd to load...");
    setTimeout(startGradesTutorial, 100);
    return;
  }

  const tour = new Shepherd.Tour({
    useModalOverlay: true,
    defaultStepOptions: {
      classes: 'shadow-md bg-purple-dark',
      scrollTo: true,
      cancelIcon: {
        enabled: true
      },
      popperOptions: {
        modifiers: [{ name: 'offset', options: { offset: [0, 12] } }]
      }
    }
  });

  // Jupiter Login
  tour.addStep({
    id: 'jupiter',
    text: 'The fastest way to get started is to pull your grades directly from Jupiter! Enter your OSIS and password here.',
    attachTo: {
      element: '#Jupull',
      on: 'bottom'
    },
    buttons: [{
      text: 'Next',
      action: tour.next
    }]
  });

  // Manual Entry Form
  tour.addStep({
    id: 'manual-entry',
    text: 'You can also manually enter grades. Click here to show the grade entry form.',
    attachTo: {
      element: '#toggleGradeForm',
      on: 'bottom'
    },
    buttons: [{
      text: 'Show me how',
      action: () => {
        // Show the form if it's hidden
        const form = document.getElementById('gradeform');
        const button = document.getElementById('toggleGradeForm');
        if (form.style.display === 'none') {
          form.style.display = 'block';
          button.textContent = button.textContent.slice(0, -1) + 'v';
        }
        tour.next();
      }
    }]
  });

  // Grade Entry Fields
  tour.addStep({
    id: 'grade-fields',
    text: 'Enter your grade details here. Make sure to select the correct class and category.',
    attachTo: {
      element: '#mytbody',
      on: 'top'
    },
    buttons: [{
      text: 'Next',
      action: tour.next
    }]
  });

  // Grade Analysis
  tour.addStep({
    id: 'grade-analysis',
    text: 'After entering your grades, click here to see detailed analysis of your performance!',
    attachTo: {
      element: '#OpenGA',
      on: 'bottom'
    },
    buttons: [{
      text: 'Show Analysis',
      action: () => {
        window.location.href = '/GradeAnalysis?tutorial=true';
      }
    }]
  });

  // Start the tour
  tour.start();
}

// Add this to your window load event listener
window.addEventListener('load', async () => {
  // Check if we're coming from the home page tutorial
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('tutorial') === 'true') {
    // Small delay to ensure page is fully loaded
    setTimeout(startGradesTutorial, 500);
  }
});
