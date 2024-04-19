async function postFriend(data){
    await fetchRequest('/post-friend', data)
    
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