import { useEffect, useState, useCallback } from "react";
import {
  requestPermissionAndGetToken,
  listenForegroundMessages,
  getStoredNotifications,
  markAllAsRead as markAllRead,
  getNotificationPermissionState,
  FcmNotification,
} from "@/services/fcmService";

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<FcmNotification[]>(getStoredNotifications);
  const [permission, setPermission] = useState<"granted" | "denied" | "default">(getNotificationPermissionState);
  const [token, setToken] = useState<string | null>(null);

  // Request permission and register token on mount
  useEffect(() => {
    if (!userId) return;

    const init = async () => {
      const t = await requestPermissionAndGetToken(userId);
      setToken(t);
      setPermission(getNotificationPermissionState());
    };
    init();
  }, [userId]);

  // Listen for foreground messages
  useEffect(() => {
    if (!userId || permission !== "granted") return;

    const unsub = listenForegroundMessages((notification) => {
      setNotifications((prev) => [notification, ...prev]);
    });

    return () => { unsub?.(); };
  }, [userId, permission]);

  // PWA install detection — re-register token
  useEffect(() => {
    if (!userId) return;

    const handler = () => {
      requestPermissionAndGetToken(userId).then((t) => {
        if (t) setToken(t);
      });
    };

    window.addEventListener("appinstalled", handler);
    return () => window.removeEventListener("appinstalled", handler);
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = useCallback(() => {
    markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  return { notifications, unreadCount, permission, token, markAllAsRead };
}
