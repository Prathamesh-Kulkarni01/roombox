
importScripts('https://www.gstatic.com/firebasejs/10.12.3/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.3/firebase-messaging-compat.js');

// NOTE: This object will be populated by the build script.
const firebaseConfig = {
  "apiKey": "AIzaSyAsYtBqzqWREOXUmuugtn2NZ51iqRMiXBw",
  "authDomain": "roombox-f7bff.firebaseapp.com",
  "projectId": "roombox-f7bff",
  "storageBucket": "roombox-f7bff.appspot.com",
  "messagingSenderId": "990310757816",
  "appId": "1:990310757816:web:94edde70edba55b9524b4d",
  "measurementId": "G-HPBJCP6QRQ"
}

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/apple-touch-icon.png'
  };

  self.registration.showNotification(notificationTitle,
    notificationOptions);
});
