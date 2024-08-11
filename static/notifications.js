import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
export { init_firebase_communication};

function init_firebase_communication() {
    // Your web app's Firebase configuration
    var firebaseConfig = {
      apiKey: "AIzaSyAj7iUJlTR_JDvq62rmfe6eZZXvtsO8Cac",
      authDomain: "sturdy-analyzer-381018.firebaseapp.com",
      projectId: "sturdy-analyzer-381018",
      storageBucket: "sturdy-analyzer-381018.appspot.com",
      messagingSenderId: "800350153500",
      appId: "1:800350153500:web:3da9c736e97b9f582928d9",
      measurementId: "G-TGW6CJ0H1Q"
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
            showNotification(notif, notif.id);
          // Update your UI with the new notification
        }
      });
    });

    let initialLoad = true; // Flag to check if it's the initial load
    onSnapshot(chatRef, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          let message = change.doc.data();
          console.log(message)
          if (change.type === "added" && (message.OSIS.toString()).includes(osis) && !initialLoad) {
              
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
        initialLoad = false; // Set the flag to false after the initial load
      });
}

function showNotification(notif, id=null) {
    // request permission to show notifications
    Notification.requestPermission().then(function(result) {
        if (result === 'granted') {
            // If the user accepts, let's create a notification
            const notification = new Notification(notif.text,
                {
                    icon: '/static/media/favicon.png'
                });
            // when the user closes the notification, remove it from the database
            if(id){
            notification.addEventListener('click', function() {
              fetchRequest('/delete_data', {row_value: id, row_name: "id", sheet: 'Notifications'});
              console.log("Notification closed")
            });
          }
        }
        
    });
}



const db = init_firebase_communication();
listen_notfs(db);
