import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";


function listen(db) {
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
  

function post_notification(text) {
    fetchRequest('/post_data', {data: text, sheet: 'Assignments'})
}
const db = init_firebase_communication();
listen(db);

