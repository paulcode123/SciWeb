const form = document.getElementById('login-form');
console.log("loginscript ip:"+ip);
function demo(){
  console.log(ip)
  post_login({
    "first_name": "Demo", 
    "last_name": "Account", 
    "osis": "342875634", 
    "grade": "15",
    "IP": ip
  });
}
form.addEventListener('submit', function(event) {

  // Prevent the form from submitting normally
  event.preventDefault();

  // Get the input values
  const fname = document.getElementById('fname').value;
  const lname = document.getElementById('lname').value;
  const osis = document.getElementById('osis').value;
  const grade = document.getElementById('grade').value;
  document.getElementById("login-form").reset();
  
  post_login({
    "first_name": fname, 
    "last_name": lname, 
    "osis": osis, 
    "grade": grade,
    "IP": ip
  });
  

  
  

});
// Using setTimeout



function post_login(data){
  
  fetch('/post-login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
})
.then(response => response.text())
.then(result => {
    var a = result;  // Log the response from Python
    //redirect to home page: index.hmtl
    window.location.href = "/";

})
.catch(error => {
    console.log('An error occurred:', error);
});
}

  

// to push, type "git push origin main" into the shell










