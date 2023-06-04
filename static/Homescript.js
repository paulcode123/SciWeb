// Using setTimeout


setTimeout(function() {
  getIP();
}, 100); // 100 milliseconds = 0.1 seconds

function get_data(ipadd) {

  
fetch('/home-ip', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ data: ipadd })
})


fetch('/name', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ "message":"blank" })
})
.then(response => response.json())
.then(data => {
  full_name = JSON.stringify(data)
  full_name = full_name.slice(1, -1);
  // alert(full_name); // Handle the response from Python
  if (full_name != "Login"){
    
  
  document.getElementById('Islink').textContent = full_name;
  document.getElementById('Islink').href = "/Profile";
  }
})
.catch(error => {
  alert('An error occurred:' +error);
});
}
function getIP() {
      fetch('https://api.ipify.org?format=json')
        .then(response => response.json())
        .then(data => {
          var ip = data.ip
          
          get_data(ip)
        })
        .catch(error => {
          console.log('Error:', error);
        });
    }
// to push, type "git push origin main" into the shell

