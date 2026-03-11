/* eslint-disable no-undef */
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

const DB_NAME = "fcm_notifications_db";
const STORE_NAME = "notifications";

function openNotificationsDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveNotificationToDB(notification) {
  try {
    const db = await openNotificationsDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(notification);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
    db.close();
  } catch (err) {
    console.warn("SW: Erro ao salvar notificação no IndexedDB:", err);
  }
}

const messaging = firebase.messaging();

messaging.onBackgroundMessage(async (payload) => {
  const title = payload.notification?.title || payload.data?.title || "Nova notificação";
  const body = payload.notification?.body || payload.data?.body || "";

  // Save to IndexedDB for later display in the app
  const notification = {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 9),
    title,
    body,
    timestamp: Date.now(),
    read: false,
    source: "background",
  };
  await saveNotificationToDB(notification);

  // Only show manually if there's no notification payload (browser auto-shows those)
  if (!payload.notification) {
    self.registration.showNotification(title, {
      body,
      icon: payload.data?.icon || "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      data: payload.data,
    });
  }
});
