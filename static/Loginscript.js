var toggleMode = "Login";

//hide loading wheel
// document.getElementById("loadingWheel").style.display = "none";
const form = document.getElementById('login-form');
console.log("loginscript ip:"+ip);

function demo(){
  startLoading();
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
  startLoading();
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

async function post_login(data){
  try {
    const result = await fetchRequest('/post-login', data);

    if(result['data']=="success"){
      // Check for redirect parameter
      const urlParams = new URLSearchParams(window.location.search);
      const redirectUrl = urlParams.get('redirect');
      
      if (redirectUrl) {
        window.location.href = decodeURIComponent(redirectUrl);
      } else if (toggleMode === "Signup") {
        window.location.href = "/?signup=true";
      } else {
        window.location.href = "/";
      }
    } else {
      endLoading();
      alert("Invalid login credentials");
      document.getElementById("login-form").reset();
    }
  } catch (error) {
    endLoading();
    alert("An error occurred. Please try again.");
    console.error('Login error:', error);
  }
}

// Function to toggle between login and signup modes
function toggleSlider() {
    const toggle = document.getElementById('toggleSlider');
    const submitBtn = document.getElementById('submit');
    const signupFields = document.querySelectorAll('.signup-field');
    const currentMode = toggle.getAttribute('data-mode') || 'login';
    
    if (currentMode === 'login') {
        toggle.setAttribute('data-mode', 'signup');
        submitBtn.textContent = 'Sign Up';
        toggleMode = "Signup";
        signupFields.forEach(field => {
            field.style.display = 'block';
            const input = field.querySelector('input');
            if (input) input.required = true;
        });
    } else {
        toggle.setAttribute('data-mode', 'login');
        submitBtn.textContent = 'Log In';
        toggleMode = "Login";
        signupFields.forEach(field => {
            field.style.display = 'none';
            const input = field.querySelector('input');
            if (input) input.required = false;
        });
    }

    // Update active state of toggle options
    const options = toggle.querySelectorAll('.toggle-option');
    options.forEach(option => {
        option.classList.toggle('active');
    });
}

// Check if already logged in
if (logged_in) {
    document.getElementById('logged-in-popup').style.display = 'block';
}









