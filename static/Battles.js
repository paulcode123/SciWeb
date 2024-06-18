import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { init_firebase_communication } from "./notifications.js";

const base = window.location.href.slice(0, -7);

function battle_listen(db) {
    // Listening for changes in the "Assignments" collection
    const yourCollectionRef = collection(db, "Assignments");
  
    let initialLoad = true; // Flag to check if it's the initial load
  
    onSnapshot(yourCollectionRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (!initialLoad && change.type === "added") {
          console.log("New notification: ", change.doc.data());
          // Update your UI with the new notification
        }
      });
      initialLoad = false; // Set the flag to false after the initial load
    });
  }

// add event listener to show the gameCode element when createGame button is clicked
document.getElementById('createGame').addEventListener('click', function() {
    // generate random 7 digit number for gameCode
    const gameCode = Math.floor(1000000 + Math.random() * 9000000);
    
    document.getElementById('gameCodeText').textContent = gameCode;
    // set event listener on copyCode button to copy the gameCode to clipboard
    document.getElementById('copyCode').addEventListener('click', function() {
        // copy url to clipboard: base+/battle/gameCode
        
        let url =  base + "/battle/"+gameCode;
        navigator.clipboard.writeText(url);
    });
    document.getElementById('gameCode').style.display = 'block';
});

//add event listeners to joinGame and joinCreated buttons
document.getElementById('joinGame').addEventListener('click', function() {
    // hide createGame element
    document.getElementById('createGame').style.display = 'none';
    // get gameCode from input field
    let gameCode = document.getElementById('joinCode').value;
    // redirect to base+/battle/gameCode
    let url = base + "/battle/"+gameCode;
    window.location.href = url;
});

document.getElementById('joinCreated').addEventListener('click', function() {
    // hide createGame element
    document.getElementById('createGame').style.display = 'none';
    // get gameCode from input field
    let gameCode = document.getElementById('gameCodeText').textContent;
    // redirect to base+/battle/gameCode
    let url = base + "/battle/"+gameCode;
    window.location.href = url;
})

// hide loadingWheel
document.getElementById('loadingWheel').style.display = 'none';


const db = init_firebase_communication();
battle_listen(db);
