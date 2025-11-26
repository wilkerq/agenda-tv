// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId.
// This is done using the same config from the client-side.
// Note: This file is served from the public directory.
const firebaseConfig = {
  "projectId": "agenda-news-room-4491522-e400a",
  "appId": "1:363314732473:web:de90e196a1961d1c646a68",
  "storageBucket": "agenda-news-room-4491522-e400a.firebasestorage.app",
  "apiKey": "AIzaSyAvMXEWfRiGaZfMf3LLdvbG0waaXEbh4Mg",
  "authDomain": "agenda-news-room-4491522-e400a.firebaseapp.com",
  "messagingSenderId": "363314732473"
};

firebase.initializeApp(firebaseConfig);


// Retrieve an instance of Firebase Messaging so that it can handle background messages.
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
    icon: '/icons/icon-192x192.png',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
