var osis = 888;
var first_name = "";
var last_name = ""
var grade = 0;

setTimeout(after_wait, 2000);
function after_wait(){
 fetch('/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ data: 'Name' })
})
.then(response => response.json())
.then(data => {
  data = data['Name']
  if(data[0] != "Login"){
    
  first_name = JSON.stringify(data["first_name"]).slice(1, -1);
  last_name = JSON.stringify(data["last_name"]);
  osis = parseInt(JSON.stringify(data["osis"]).slice(1, -1));
  console.log(osis)
  grade = parseInt(JSON.stringify(data["grade"]))
  
  
  document.getElementById('profile').textContent = first_name;
  document.getElementById('profile').href = "/Profile";
  }
})
.catch(error => {
  alert('An error occurred in user_data.js:' +error);
});
console.log(osis)
}
