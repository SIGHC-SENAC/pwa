// Firebase Messaging Service Worker
// This file MUST be at the root of the public folder

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyC6ksyPJSaeQ9r9xDebCO8WWMF1grv-dqo",
  authDomain: "pi-3p-tads049.firebaseapp.com",
  projectId: "pi-3p-tads049",
  storageBucket: "pi-3p-tads049.firebasestorage.app",
  messagingSenderId: "280565366050",
  appId: "1:280565366050:web:77677298e50b975fb5797b",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw] Background message:", payload);

  const title = payload.notification?.title || "Nova notificação";
  const options = {
    body: payload.notification?.body || "",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
  };

  self.registration.showNotification(title, options);
});
