var osis = 888;
var first_name = "";
var last_name = ""
var grade = 0;

setTimeout(after_wait, 2000);
function after_wait(){
 fetch('/name', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ data: 'Hello from JavaScript!' })
})
.then(response => response.json())
.then(data => {
  
  first_name = JSON.stringify(data["first_name"]).slice(1, -1);
  last_name = JSON.stringify(data["last_name"]);
  osis = parseInt(JSON.stringify(data["osis"]).slice(1, -1));
  console.log(osis)
  grade = parseInt(JSON.stringify(data["grade"]))
  
  if(first_name != "Login"){
  document.getElementById('profile').textContent = first_name;
  document.getElementById('profile').href = "/Profile";
  }
})
.catch(error => {
  alert('An error occurred:' +error);
});
console.log(osis)
}
