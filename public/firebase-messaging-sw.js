// This file is intentionally left blank.
// It is used by Firebase Messaging to handle background notifications.
// The service worker will be automatically generated and registered by Firebase.
// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here, other Firebase libraries
// are not available in the service worker.
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// You can get this config from the Firebase console.
const firebaseConfig = {
  "projectId": "agenda-news-room-4491522-e400a",
  "appId": "1:363314732473:web:de90e196a1961d1c646a68",
  "storageBucket": "agenda-news-room-4491522-e400a.firebasestorage.app",
  "apiKey": "AIzaSyAvMXEWfRiGaZfMf3LLdvbG0waaXEbh4Mg",
  "authDomain": "agenda-news-room-4491522-e400a.firebaseapp.com",
  "messagingSenderId": "363314732473"
};

firebase.initializeApp(firebaseConfig);


// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    '[firebase-messaging-sw.js] Received background message ',
    payload
  );
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icons/icon-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
