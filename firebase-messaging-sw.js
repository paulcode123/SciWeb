importScripts('https://www.gstatic.com/firebasejs/10.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.1.0/firebase-messaging-compat.js');

console.log("in service worker")
var CACHE_NAME = 'my-site-cache-v1';
var urlsToCache = [
  
];

self.addEventListener('install', function(event) {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        return fetch(event.request).catch(function(error) {
          console.error('Fetch failed:', error);
          throw error;
        });
      })
  );
});

const firebaseConfig = {
  apiKey: "AIzaSyAj7iUJlTR_JDvq62rmfe6eZZXvtsO8Cac",
  authDomain: "sturdy-analyzer-381018.firebaseapp.com",
  projectId: "sturdy-analyzer-381018",
  storageBucket: "sturdy-analyzer-381018.appspot.com",
  messagingSenderId: "800350153500",
  appId: "1:800350153500:web:3da9c736e97b9f582928d9",
  measurementId: "G-TGW6CJ0H1Q"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/static/media/favicon.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
