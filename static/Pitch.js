fetch('/name', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ data: "data being sent Py=>JS" })
})
.then(response => response.json())
.then(data => {
  full_name = JSON.stringify(data)
  full_name = full_name.slice(1, -1);
  // alert(full_name); // Handle the response from Python
  if (full_name != "Login"){
    
  
  document.getElementById('Ptslink').textContent = full_name;
  document.getElementById('Ptslink').href = "/Profile";
  }
})
.catch(error => {
  alert('An error occurred:' +error);
});