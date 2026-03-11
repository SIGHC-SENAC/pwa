import { useEffect, useState, useCallback } from "react";
import {
  requestPermissionAndGetToken,
  listenForegroundMessages,
  getAllNotifications,
  markAllAsRead as markAllReadLS,
  markAllAsReadIDB,
  getNotificationPermissionState,
  FcmNotification,
} from "@/services/fcmService";

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<FcmNotification[]>([]);
  const [permission, setPermission] = useState<"granted" | "denied" | "default">(getNotificationPermissionState);
  const [token, setToken] = useState<string | null>(null);

  // Load all notifications (localStorage + IndexedDB) on mount
  useEffect(() => {
    getAllNotifications().then(setNotifications);
  }, []);

  // Request permission and register token
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

  // Poll IndexedDB for background notifications every 5s when tab is visible
  useEffect(() => {
    if (permission !== "granted") return;

    const poll = () => {
      getAllNotifications().then(setNotifications);
    };

    const interval = setInterval(poll, 5000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") poll();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [permission]);

  // PWA install detection
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

  const markAllAsRead = useCallback(async () => {
    markAllReadLS();
    await markAllAsReadIDB();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  return { notifications, unreadCount, permission, token, markAllAsRead };
}
