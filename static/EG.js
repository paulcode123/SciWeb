// Add this import at the top of the file
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";



// Jupiter API?

const form = document.querySelector("#gradeform");
const tbody = document.querySelector("#mytbody");
var grades;
const Pullbutton = document.querySelector('#Jupull');

// when OpenGA button is clicked, open the GradeAnalysis page
document.getElementById('OpenGA').addEventListener('click', () => {
  window.location.href = '/GradeAnalysis';
});

//add event listener to the pull button
Pullbutton.addEventListener('click', pullfromJupiter);

async function pullfromJupiter(){
  start_loading(12);
  console.log("pulling from Jupiter")
  // make loading wheel visible
  // document.getElementById('loadingWheel').style.visibility = "visible";
  const osis = document.getElementById('osis').value;
  const password = document.getElementById('password').value;
  const addClasses = document.getElementById('addclasses').checked;
  const encrypt = document.getElementById('encrypt').checked;
  const updateLeagues = document.getElementById('updateLeagues').checked;
  console.log(encrypt)
  // if encrypt is checked, generate a key and set it as a cookie
  var key="none"
  if(encrypt == true){
    console.log("encrypting")
    key = Math.floor(Math.random() * 10000000000000000);
    document.cookie = "gradeKey="+key;
  }
  //Send to python with fetch request
  const data = await fetchRequest('/jupiter', {"osis": osis, "password": password, "addclasses": addClasses, "encrypt": key, "updateLeagues": updateLeagues});
  // document.getElementById('loadingWheel').style.visibility = "hidden";
  if(data['error']){
    alert(data['error']);
  }
  else{
  console.log("got response")
  // document.getElementById('loadingWheel').style.visibility = "hidden";
  // document.getElementById("loadingBar").style.visibility = "hidden";
  // if data is a dict with error key, show error message
  if(data['error']){
    alert(data['error']);
  }
  else{
  grades = data;
  createGradesTable(grades);
  // If new classes were added, send notifications
  if (data.new_classes && data.new_classes.length > 0) {
    notifyClassmates(data.new_classes, data.class_tokens);
  }
  }
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
  await fetchRequest('/post_grades', {"data": grades});
}



  data = await fetchRequest('/data', {"data": 'Name, Grades, Classes'});
  
  
  grades = data['Grades']
  var rawclasses = data['Classes']
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
  const result = await fetchRequest('/delete_data', {"sheet": "Grades", "row_value": osis, "row_name": "osis"});
  
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
  const db = getFirestore();
  
  // Get user's friends
  const friendsData = await fetchRequest('/data', { data: 'Friends' });
  console.log(friendsData)
  const friends = friendsData['Friends'].filter(friend => friend.OSIS === osis && friend.status === 'accepted');

  // Get friends' tokens
  const usersData = await fetchRequest('/data', { data: 'Tokens' });
  const friendTokens = friends.map(friend => {
    const user = usersData.find(u => u.OSIS === friend.targetOSIS);
    return user ? user.token : null;
  }).filter(token => token !== null);

  // Prepare the notification message
  const message = {
    title: "Friend's Grade Update",
    body: `${osis} got ${grade.score}/${grade.value} in ${grade.class} for ${grade.name}!`,
    data: {
      gradeId: grade.id,
      senderOSIS: osis
    }
  };

  console.log(friendTokens)
  // Send notifications to friends
  for (const token of friendTokens) {
    try {
      await addDoc(collection(db, "notifications"), {
        token: token,
        message: message
      });
      console.log("Notification sent successfully to", token);
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  }

  alert("Grade shared with friends!");
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

async function notifyClassmates(newClasses, classTokens) {
  const db = getFirestore();

  for (const className of newClasses) {
    const tokens = classTokens[className];

    // Prepare the notification message
    const message = {
      title: "New Classmate",
      body: `${first_name} has joined ${className}!`,
      data: {
        type: "newClassmate",
        className: className,
        newClassmateOSIS: osis
      }
    };

    // Send notifications to classmates
    for (const token of tokens) {
      try {
        await addDoc(collection(db, "notifications"), {
          token: token,
          message: message
        });
        console.log("Notification sent successfully to", token);
      } catch (error) {
        console.error("Error sending notification:", error);
      }
    }
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
  console.log(grade)
  const modal = document.createElement('div');
  modal.classList.add('edit-modal');
  modal.innerHTML = `
    <div class="edit-modal-content">
      <h3>Edit Grade</h3>
      <p>Assignment: ${grade.name}</p>
      <p>Class: ${grade.class}</p>
      <input type="number" id="editScore" placeholder="New Score" value="${grade.score}">
      <input type="number" id="editValue" placeholder="New Value" value="${grade.value}">
      <input type="number" id="editWeight" placeholder="Weight" value="1">
      <button id="submitEdit">Submit</button>
      <button id="cancelEdit">Cancel</button>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('submitEdit').addEventListener('click', () => submitEdit(grade, modal));
  document.getElementById('cancelEdit').addEventListener('click', () => document.body.removeChild(modal));
}

// Function to submit the edit
async function submitEdit(grade, modal) {
  const newScore = document.getElementById('editScore').value;
  const newValue = document.getElementById('editValue').value;
  const weight = document.getElementById('editWeight').value;

  let score = newScore*weight/newValue;

  const correction = {
    assignment: grade.name,
    class: grade.class,
    score: score,
    value: parseInt(weight),
    osis: osis
  };

  try {
    await fetchRequest('/post_data', { sheet: "GradeCorrections", data: correction });
    alert('Grade correction submitted successfully!');
    document.body.removeChild(modal);
    // Optionally, refresh the grades table here
  } catch (error) {
    console.error('Error submitting grade correction:', error);
    alert('Failed to submit grade correction. Please try again.');
  }
}
