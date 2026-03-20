import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import app, { db } from "@/lib/firebase";

const VAPID_KEY = import.meta.env.VITE_VAPID_KEY;
const NOTIFICATIONS_STORAGE_KEY = "fcm_notifications";

const DB_NAME = "fcm_notifications_db";
const STORE_NAME = "notifications";

export interface FcmNotification {
  id: string;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  source?: "foreground" | "background";
}

function isPwa(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true;
}

// ── IndexedDB helpers (shared with service worker) ──

function openNotificationsDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getIndexedDBNotifications(): Promise<FcmNotification[]> {
  try {
    const db = await openNotificationsDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    return new Promise((resolve) => {
      request.onsuccess = () => {
        db.close();
        const items = (request.result || []) as FcmNotification[];
        items.sort((a, b) => b.timestamp - a.timestamp);
        resolve(items);
      };
      request.onerror = () => {
        db.close();
        resolve([]);
      };
    });
  } catch {
    return [];
  }
}

async function saveNotificationToIDB(notification: FcmNotification): Promise<void> {
  try {
    const db = await openNotificationsDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(notification);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // fallback silently
  }
}

export async function markAllAsReadIDB(): Promise<void> {
  try {
    const db = await openNotificationsDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const items = request.result || [];
      items.forEach((item: FcmNotification) => {
        store.put({ ...item, read: true });
      });
    };
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // fallback silently
  }
}

// ── localStorage helpers (legacy + foreground) ──

export function getStoredNotifications(): FcmNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveNotificationToStorage(notification: FcmNotification): void {
  const notifications = getStoredNotifications();
  notifications.unshift(notification);
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications.slice(0, 50)));
}

export function markAllAsRead(): void {
  const notifications = getStoredNotifications().map((n) => ({ ...n, read: true }));
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
}

// ── Merged notifications (localStorage + IndexedDB) ──

export async function getAllNotifications(): Promise<FcmNotification[]> {
  const lsNotifs = getStoredNotifications();
  const idbNotifs = await getIndexedDBNotifications();

  // Merge and deduplicate by id
  const map = new Map<string, FcmNotification>();
  [...lsNotifs, ...idbNotifs].forEach((n) => {
    if (!map.has(n.id)) map.set(n.id, n);
  });

  return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
}

// ── FCM token management ──

export async function requestPermissionAndGetToken(userId: string): Promise<string | null> {
  try {
    const supported = await isSupported();
    if (!supported) return null;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });

    if (token) {
      const platform = isPwa() ? "PWA" : "Web";
      const tokenEntry = {
        token,
        platform,
        environment: window.location.hostname,
        active: true,
        updatedAt: Date.now(),
      };

      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        fcmTokens: arrayRemove({ token, platform, environment: tokenEntry.environment, active: false, updatedAt: 0 }),
      }).catch(() => {});
      await updateDoc(userRef, { fcmTokens: arrayUnion(tokenEntry) });
    }

    return token;
  } catch (err) {
    console.warn("FCM indisponível (push bloqueado ou sem permissão):", (err as Error)?.message || err);
    return null;
  }
}

export async function deactivateToken(userId: string, token: string): Promise<void> {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      fcmTokens: arrayRemove({ token }),
    }).catch(() => {});
  } catch (err) {
    console.error("Erro ao desativar token FCM:", err);
  }
}

export function listenForegroundMessages(callback: (notification: FcmNotification) => void): (() => void) | null {
  try {
    const messaging = getMessaging(app);
    const unsub = onMessage(messaging, (payload) => {
      const notification: FcmNotification = {
        id: crypto.randomUUID(),
        title: payload.notification?.title || "Nova notificação",
        body: payload.notification?.body || "",
        timestamp: Date.now(),
        read: false,
        source: "foreground",
      };
      saveNotificationToStorage(notification);
      saveNotificationToIDB(notification);
      callback(notification);
    });
    return unsub;
  } catch {
    return null;
  }
}

export function getNotificationPermissionState(): "granted" | "denied" | "default" {
  if (typeof Notification === "undefined") return "denied";
  return Notification.permission;
}
