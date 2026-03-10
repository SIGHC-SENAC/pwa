import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import app, { db } from "@/lib/firebase";

const VAPID_KEY = "BHGUjHXChP4IRvphANu9RPlQWfIQq7Gw0WSk3u2R1hfNHv4AxF5P_ixg7_O0jP2LA4m1D7VQOE727BFNgtPmMhA";
const NOTIFICATIONS_STORAGE_KEY = "fcm_notifications";

export interface FcmNotification {
  id: string;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
}

function isPwa(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true;
}

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
      // Remove old entry with same token then add updated
      await updateDoc(userRef, {
        fcmTokens: arrayRemove({ token, platform, environment: tokenEntry.environment, active: false, updatedAt: 0 }),
      }).catch(() => {});
      await updateDoc(userRef, { fcmTokens: arrayUnion(tokenEntry) });
    }

    return token;
  } catch (err) {
    console.error("Erro ao obter token FCM:", err);
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
      };
      saveNotificationToStorage(notification);
      callback(notification);
    });
    return unsub;
  } catch {
    return null;
  }
}

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
  // Keep last 50
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications.slice(0, 50)));
}

export function markAllAsRead(): void {
  const notifications = getStoredNotifications().map((n) => ({ ...n, read: true }));
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
}

export function getNotificationPermissionState(): "granted" | "denied" | "default" {
  if (typeof Notification === "undefined") return "denied";
  return Notification.permission;
}
