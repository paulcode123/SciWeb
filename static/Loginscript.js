var toggleMode = "Login";

//hide loading wheel
// document.getElementById("loadingWheel").style.display = "none";
const form = document.getElementById('login-form');
console.log("loginscript ip:"+ip);
function demo(){
  // document.getElementById("loadingWheel").style.display = "block";
  console.log(ip)
  post_login({data: {
    "first_name": "Demo", 
    "last_name": "Account", 
    "osis": "3428756",
    "password": "password",
    "grade": "15",
    "IP": ip
  }, mode: "Login"});
}
form.addEventListener('submit', function(event) {
  // document.getElementById("loadingWheel").style.display = "block";
  // Prevent the form from submitting normally
  event.preventDefault();

  // Get the input values
  const fname = document.getElementById('fname').value;
  const lname = document.getElementById('lname').value;
  const password = document.getElementById('password').value;
  const grade = document.getElementById('grade').value;
  const email = document.getElementById('email').value;
  //generate random 7 digit osis
  const osis = Math.floor(Math.random() * 9000000)+1000000;
  document.getElementById("login-form").reset();
  
  post_login({data:{
    "first_name": fname, 
    "last_name": lname, 
    "osis": osis, 
    "grade": grade,
    "password": password,
    "email": email,
    "IP": ip
  }, mode: toggleMode});
  

  
  

});
// Using setTimeout



async function post_login(data){
  const result = await fetchRequest('/post-login', data);

  if(result['data']=="success"){
    if (toggleMode === "Signup") {
      window.location.href = "/?signup=true";
    } else {
      window.location.href = "/";
    }
  } else {
    alert("Invalid login credentials");
    // document.getElementById("loadingWheel").style.display = "none";
    // clear form
    document.getElementById("login-form").reset();
  }
}

function toggleSlider() {
  var slider = document.getElementById("toggleSlider");
  var text = document.getElementById("sliderText");
  var passwordfield = document.getElementById("password");
  var gradefield = document.getElementById("grade");
  var lastnamefield = document.getElementById("lname");
  var lnamelabel = document.getElementById("lnamelabel");
  var gradelabel = document.getElementById("gradelabel");
  var submitbutton = document.getElementById("submit");
  var emailfield = document.getElementById("email");
  var emaillabel = document.getElementById("emaillabel");

  if (slider.classList.contains("on")) {
    slider.classList.remove("on");
    text.textContent = "Log-In";
    text.classList.remove("right");
    text.classList.add("left");
    toggleMode = "Login";
    submitbutton.value = "Log In";
    passwordfield.autocomplete = "current-password";
    // hide grade and last name fields
    gradefield.style.display = "none";
    lastnamefield.style.display = "none";
    lnamelabel.style.display = "none";
    gradelabel.style.display = "none";
    emailfield.style.display = "none";
    emaillabel.style.display = "none";
    // make sure these fields are not required
    gradefield.required = false;
    lastnamefield.required = false;
    emailfield.required = false;
  } else {
    slider.classList.add("on");
    text.textContent = "Sign-Up";
    text.classList.remove("left");
    text.classList.add("right");
    toggleMode = "Signup";
    submitbutton.value = "Sign Up";
    passwordfield.autocomplete = "new-password";
    // show grade and last name fields
    gradefield.style.display = "block";
    lastnamefield.style.display = "block";
    lnamelabel.style.display = "block";
    gradelabel.style.display = "block";
    emailfield.style.display = "block";
    emaillabel.style.display = "block";
    // make sure these fields are required
    gradefield.required = true;
    lastnamefield.required = true;
    emailfield.required = true;
  }
}

function checkLoginStatus() {
  if (logged_in) {
    document.getElementById('logged-in-popup').style.display = 'block';

  }
}

checkLoginStatus();









