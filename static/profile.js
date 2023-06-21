var userData;
setTimeout(function() {
  

fetch('/profile-data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ data: "data being sent Py=>JS" })
})
.then(response => response.json())
.then(data => {
  userData = data['Data'];
  console.log(userData);
  displayUserInfo(userData);
})
.catch(error => {
  alert('An error occurred at profile.js:' +error);
});
}, 300);

function displayUserInfo(userData){
  
  document.getElementById("first-name-text").textContent = userData.first_name;
  document.getElementById("last-name-text").textContent = userData.last_name;
  document.getElementById("osis-text").textContent = userData.osis;
  document.getElementById("grade-text").textContent = userData.grade;
}
function editField(fieldName) {
  const textElement = document.getElementById(`${fieldName}-text`);
  const inputElement = document.getElementById(`${fieldName}-input`);

  textElement.style.visibility = "hidden";
  inputElement.style.position = "absolute";
  inputElement.style.visibility = "visible";
  inputElement.style.position = "static";
  inputElement.value = textElement.textContent;

document.getElementById(`${fieldName}_edit`).style.visibility = "hidden";
document.getElementById(`${fieldName}_submit`).style.visibility = "visible";
  
    }

    function submitField(fieldName) {
      const textElement = document.getElementById(`${fieldName}-text`);
  const inputElement = document.getElementById(`${fieldName}-input`);

  textElement.style.visibility = "visible";
  inputElement.style.position = "static";
  inputElement.style.visibility = "hidden";
  inputElement.style.position = "absolute";
  textElement.textContent = inputElement.value;

  document.getElementById(`${fieldName}_edit`).style.visibility = "visible";
  document.getElementById(`${fieldName}_submit`).style.visibility = "hidden";
      
  userData[fieldName] = inputElement.value;
  console.log(userData);
  update_data(userData)
    }



function update_data(data){
  
  fetch('/update-login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
})
.then(response => response.text())
.then(result => {
    var a = result;  // Log the response from Python
})
.catch(error => {
    alert('An error occurred:', error);
});
}