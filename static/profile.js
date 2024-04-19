// const { file } = require("get-uri/dist/file");

var userData;
var users;
setTimeout(async function() {
  
data = await fetchRequest('/data', { data: "Name, FILTERED Profiles, FILTERED Friends, Users" })

userData = data['Name'];
console.log(userData);
users = data['Users'];
displayUserInfo(userData);
set_public_profile(data['Profiles']);
console.log(data['Friends']);
showFriends(data['Friends'], users, userData.osis);
document.getElementById('loadingWheel').style.display = "none";

}, 300);

function displayUserInfo(userData){
  
  document.getElementById("first-name-text").textContent = userData.first_name;
  document.getElementById("last-name-text").textContent = userData.last_name;
  document.getElementById("password-text").textContent = userData.password;
  document.getElementById("grade-text").textContent = userData.grade;
}
function editField(fieldName) {
  const textElement = document.getElementById(`${fieldName}-text`);
  const inputElement = document.getElementById(`${fieldName}-input`);

  textElement.style.visibility = "hidden";
  inputElement.style.position = "absolute";
  inputElement.style.visibility = "visible";
  inputElement.style.position = "static";
  inputElement.value = textElement.textContent;

document.getElementById(`${fieldName}_edit`).style.visibility = "hidden";
document.getElementById(`${fieldName}_submit`).style.visibility = "visible";
  
    }

    function submitField(fieldName) {
      const textElement = document.getElementById(`${fieldName}-text`);
  const inputElement = document.getElementById(`${fieldName}-input`);

  textElement.style.visibility = "visible";
  inputElement.style.position = "static";
  inputElement.style.visibility = "hidden";
  inputElement.style.position = "absolute";
  textElement.textContent = inputElement.value;

  document.getElementById(`${fieldName}_edit`).style.visibility = "visible";
  document.getElementById(`${fieldName}_submit`).style.visibility = "hidden";
      
  userData[fieldName] = inputElement.value;
  console.log(userData);
  update_data(userData)
    }



async function update_data(data){
  result = await fetchRequest('/update-data', data);
}


//When user clicks save public profile button, update the public profile
async function savePubProf(){
  var picinp = document.getElementById('profilePictureInput');
  var imgPreview = document.getElementById('profilePicturePreview');
  var id;
  if(picinp.files.length != 0){
  let binary = await getBase64(picinp.files[0]);
  //Generate random 7 digit file id
  id = Math.floor(Math.random() * 10000000);
  uploadFile(binary, id);
  }
  //If there is an existing profile pic, set as imgPreview.src
  else if(imgPreview.src != ""){
    let binary = imgPreview.src;
    id = Math.floor(Math.random() * 10000000);
    uploadFile(binary, id);
  }
  else{
    id = "";
  }
  let data = {
    "OSIS": userData.osis,
    "ProfPic": id,
    "AboutMe": document.getElementById('aboutMeInput').value,
    "HobClub": document.getElementById('hobbiesInput').value,
    "Goals": document.getElementById('goalsInput').value,
    "showClasses": document.getElementById('showClassesInput').checked,
    "showFriends": document.getElementById('showFriendsInput').checked
  }
  //Create fetch request to update public profile
  await fetchRequest('/update-public-profile', data);
  
}

function set_public_profile(userData){
  userData = userData[0];
  // if userData doesn't exist, return
  if(userData == undefined){
    return;
  }
  console.log(userData)
  // check is ProPic is undefined
  if(userData.ProfPic != null && userData.ProfPic != "" && userData.ProfPic != undefined){
  
  let imgPreview = document.getElementById('profilePicturePreview');
  getFile(userData.ProfPic).then(image => {
  imgPreview.src = image;
  imgPreview.style.display = 'block';
  })
  }
  //Set the input fields to the user's public profile data if it exists

  document.getElementById('aboutMeInput').value = (userData.AboutMe != null ? userData.AboutMe : "");
  document.getElementById('hobbiesInput').value = (userData.HobClub != null ? userData.HobClub : "");
  document.getElementById('goalsInput').value = (userData.Goals != null ? userData.Goals : "");
  document.getElementById('showClassesInput').checked = userData.showClasses;
  document.getElementById('showFriendsInput').checked = userData.showFriends;
}

document.getElementById('profilePictureInput').addEventListener('change', function(event) {
  const file = event.target.files[0]; // Get the file from the input
  if (file) {
      // Create a URL for the file
      let fileUrl = URL.createObjectURL(file);
      
      // Set the src of the img element to the file URL and show the preview
      let imgPreview = document.getElementById('profilePicturePreview');
      console.log(imgPreview);
      imgPreview.src = fileUrl;
      imgPreview.style.display = 'block';
  }
});



function openTab(event, tabName) {
  // Get all elements with class="tabcontent" and hide them
  var tabContents = document.getElementsByClassName("tabcontent");
  for (var i = 0; i < tabContents.length; i++) {
    tabContents[i].style.display = "none";
  }

  // Get all elements with class="tablinks" and remove the "active" class
  var tabLinks = document.getElementsByClassName("tablinks");
  for (var i = 0; i < tabLinks.length; i++) {
    tabLinks[i].className = tabLinks[i].className.replace(" active", "");
  }

  // Show the current tab and add an "active" class to the button that opened the tab
  document.getElementById(tabName).style.display = "block";
  event.currentTarget.className += " active";
}

function showFriends(friends, users, osis) {
  friends.forEach(friend => {
    //Get the name of the sender given friend.OSIS and name of target given friend.targetOSIS
    for (let i = 0; i < users.length; i++) {
      console.log(users[i].osis.toString() + " " + friend.OSIS.toString());
      if (users[i].osis.toString() == friend.OSIS.toString()) {
        friend.first_name = users[i].first_name;
      }
      if (users[i].osis.toString() == friend.targetOSIS.toString()) {
        friend.target_first_name = users[i].first_name;
      }
    }
    console.log(friend)
    if (friend.status === "accepted") {
      addToFriendsTab(friend, osis);
    } else if (friend.OSIS === userData.osis) {
      addToYourInvitesTab(friend);
    } else {
      addToRequestsTab(friend);
    }
  });
}

function addToFriendsTab(friend) {
  console.log(friend)
  let friendsTab = document.getElementById('friends');
  let friendDiv = document.createElement('div');
  friendDiv.className = 'friend';
  let friendName = document.createElement('p');
  let otherperson = null;
  let otherosis = null;
  if (friend.OSIS === osis) {
    otherperson = friend.target_first_name;
    otherosis = friend.targetOSIS;
  } else {
  otherperson = friend.first_name;
  otherosis = friend.OSIS;
  }
  friendName.textContent = otherperson;
  //Create message link,  💬, and go to profile link,👤
  let messageLink = document.createElement('a');
  messageLink.textContent = "💬";
  messageLink.href = `/chat/${otherosis}`;
  messageLink.target = "_blank";
  

  let profileLink = document.createElement('a');
  profileLink.textContent = "👤";
  profileLink.href = `/users/${friend.OSIS}`;
  profileLink.target = "_blank";
  

  friendDiv.appendChild(friendName);
  friendDiv.appendChild(profileLink);
  friendDiv.appendChild(messageLink);
  friendsTab.appendChild(friendDiv);
}

function addToYourInvitesTab(friend) {
  let yourInvitesTab = document.getElementById('YourInvites');
  let inviteDiv = document.createElement('div');
  inviteDiv.className = 'friend';
  let inviteName = document.createElement('p');
  inviteName.textContent = friend.target_first_name;
  inviteDiv.appendChild(inviteName);
  yourInvitesTab.appendChild(inviteDiv);
}

function addToRequestsTab(friend) {
  let requestsTab = document.getElementById('Requests');
  let requestDiv = document.createElement('div');
  requestDiv.className = 'friend';
  let requestName = document.createElement('p');
  requestName.textContent = friend.first_name;
  requestDiv.appendChild(requestName);
  requestsTab.appendChild(requestDiv);
  //add accept button
  let acceptButton = document.createElement('button');
  acceptButton.textContent = "Accept";
  acceptButton.className = "accept";
  acceptButton.addEventListener('click', () => {
    acceptFriend(friend);
  });
  requestDiv.appendChild(acceptButton);
}

function acceptFriend(friend) {
  let data = {
    "OSIS": friend.OSIS,
    "status": "accepted",
    "targetOSIS": friend.targetOSIS,
    "id": friend.id
  }
  postFriend(data);
}
async function postFriend(data){
  await fetchRequest('/post_data', {"sheet": "Friends", "data": data})
  //reload page
  location.reload();
}

// Add event listener to the search bar id="search-bar". When the user starts typing, find and dispay the users that match that name
document.getElementById('search-bar').addEventListener('input', function(event) {
  let searchResults = document.getElementById('search-results');
  searchResults.innerHTML = "";
  let searchValue = event.target.value;
  if (searchValue === "") {
    searchResults.style.display = "none";
  } else {
    searchResults.style.display = "block";
    
    for (let i = 0; i < users.length; i++) {
      let user = users[i];
      let full_name = user.first_name + " " + user.last_name;
      if (full_name.toLowerCase().includes(searchValue.toLowerCase())) {
        let userDiv = document.createElement('div');
        userDiv.className = "search-result";
        userDiv.textContent = full_name;
        userDiv.addEventListener('click', () => {
          let data = {
            "OSIS": userData.osis,
            "status": "pending",
            "targetOSIS": user.osis,
            "id": (Math.floor(Math.random() * 10000)).toString()
          }
          postFriend(data);
        });
        searchResults.appendChild(userDiv);
      }
    }
  }
});

async function getFile(fileId) {
  // Return the fetch promise chain
  const data = await fetchRequest('/get-file', {file: fileId});
  
  // Assuming `data.file` is the image or file data you want
  let file = data.file;
  file = file.replace('dataimage/pngbase64', 'data:image/png;base64,');
  file = file.replace('dataimage/jpegbase64', 'data:image/jpeg;base64,');
  //remove last character from string
  file = file.slice(0, -1);
  
  return file; // This will be the resolved value of the promise
}


// Create function for fetch request to upload-file route
async function uploadFile(xfile, id) {
  const data = await fetchRequest('/upload-file', {file: xfile, name: id});
  return data;
}
