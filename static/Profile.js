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
  document.getElementById('Pslink').textContent = full_name;
  document.getElementById('Pslink').href = "/Profile";
})
.catch(error => {
  alert('An error occurred:' +error);
});
}