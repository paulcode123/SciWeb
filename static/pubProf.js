function postFriend(data){
    fetch('/accept-friend', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
  })
  .then(response => response.text())
  .then(result => {
      var a = result;  // Log the response from Python
      
  })
  }
  function inviteFriend(){
    let location = window.location.href;
    console.log(location);
    let osis = location.slice(-7);
    data = {
        "OSIS": "void",
        "status": "pending",
        "targetOSIS": osis,
        "id": Math.floor(Math.random() * 10000)
    }
    postFriend(data);
  }