// Using setTimeout
var ip;



function get_data(ipadd) {

  
fetch('/home-ip', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  
  body: ipadd
})
}


console.log("getting IP")
fetch('https://api.ipify.org?format=json')
  .then(response => response.json())
  .then(data => {
    ip = String(data.ip);
    console.log("got IP")
    get_data(ip)
  })
  .catch(error => {
    console.log('Error:', error);
  });

// to push, type "git push origin main" into the shell

