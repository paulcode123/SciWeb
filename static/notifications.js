import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

function init_firebase_communication() {
    // Your web app's Firebase configuration
    var firebaseConfig = {
        
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    return db;
}

function listen_notfs(db){
    // Listening for changes in the "Assignments" collection
    const notifRef = collection(db, "Notifications");
    const chatRef = collection(db, "Chat");
    
  
    onSnapshot(notifRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        let notif = change.doc.data();
        if (change.type === "added" && notif.target == osis) {
            
          console.log("New notification: ", notif);
            showNotification(notif);
          // Update your UI with the new notification
        }
      });
    });

    onSnapshot(chatRef, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          let message = change.doc.data();
          if (change.type === "added" && message.OSIS.includes(osis)) {
              
            console.log("New message: ", message);
            let not = {"id": message.id, "text": message.text, "type": "message"};
            showNotification(message);
            // if page is a class page or assignment page, meaning it includes a chatbox, then call get_messages
            let url = window.location.href;
            if(url.includes('class') || url.includes('assignment')){
                get_messages()
            }
          }
        });
      });
}

function showNotification(notif) {
    const container = document.getElementById('notification-container');

    const notification = document.createElement('div');
    notification.className = `notification ${notif.type}`;
    notification.innerHTML = `
        <span>${notif.text}</span>
        <button class="close-btn" onclick="removeNotification(this, ${notif.id})">&times;</button>
    `;
    console.log(notification)
    container.appendChild(notification);

    setTimeout(() => {
        if (container.contains(notification)) {
            container.removeChild(notification);
        }
    }, 15000);
}

window.removeNotification = function(button, id) {
    const notification = button.parentElement;
    notification.parentElement.removeChild(notification);
    // Remove the notification from the database
    fetchRequest('/delete_data', {row_value: id, row_name: "id", sheet: 'Notifications'});
}


const db = init_firebase_communication();
listen_notfs(db);