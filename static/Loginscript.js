const form = document.getElementById('login-form');

form.addEventListener('submit', function(event) {

  // Prevent the form from submitting normally
  event.preventDefault();

  // Get the input values
  const fname = document.getElementById('fname').value;
  const lname = document.getElementById('lname').value;
  const email = document.getElementById('email').value;
  const grade = document.getElementById('grade').value;
  document.getElementById("login-form").reset();
  alert('before calling post_login')
  post_login([fname, lname, email, grade]);
  alert('after calling post_login')

  
  

});
// Using setTimeout
setTimeout(function() {
  get_data()
}, 100); // 100 milliseconds = 0.1 seconds

function get_data(){
 fetch('/name', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ data: 'Hello from JavaScript!' })
})
.then(response => response.json())
.then(data => {
  full_name = JSON.stringify(data)
  full_name = full_name.slice(1, -1);
  // alert(full_name); // Handle the response from Python
  document.getElementById('lslink').textContent = full_name;
  document.getElementById('lslink').href = "/Profile";
})
.catch(error => {
  alert('An error occurred:' +error);
});
}


function post_login(data){
  alert('reached post_login')
  fetch('/post-login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
})
.then(response => response.text())
.then(result => {
    alert(result);  // Log the response from Python
})
.catch(error => {
    alert('An error occurred:', error);
});
}

  

// to push, type "git push origin main" into the shell










