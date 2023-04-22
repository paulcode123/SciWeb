const form = document.getElementById('login-form');

function init(){
  getLogin();
// Get the form element

}
init();

// Attach a submit event listener to the form
form.addEventListener('submit', function(event) {

// Prevent the form from submitting normally
event.preventDefault();

// Get the input values
const fname = document.getElementById('fname').value;
const lname = document.getElementById('lname').value;
const email = document.getElementById('email').value;
const grade = document.getElementById('grade').value;

postLogin(fname, lname, email, grade);

document.getElementById("login-form").reset();

});




async function postLogin(fname, lname, email, grade) {

const data = {
first_name: fname,
last_name: lname,
email: email,
grade: grade
};

const response = await fetch('https://sheetdb.io/api/v1/pb8spx7u5gewk', {
method: 'POST',
headers: {
'Content-Type': 'application/json'
},
body: JSON.stringify(data)
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
  document.getElementById('lslink').textContent = name;
  document.getElementById('Islink').textContent = name;
}




