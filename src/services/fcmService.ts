import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import app, { db } from "@/lib/firebase";

// VAPID key from Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
const VAPID_KEY = "BHGUjHXChP4IRvphANu9RPlQWfIQq7Gw0WSk3u2R1hfNHv4AxF5P_ixg7_O0jP2LA4m1D7VQOE727BFNgtPmMhA";

export interface FcmTokenData {
  token: string;
  platform: string;
  environment: string;
  userAgent: string;
  language: string;
  timezone: string;
  permission: NotificationPermission;
  isActive: boolean;
  createdAt: ReturnType<typeof serverTimestamp> | { seconds: number };
  updatedAt: ReturnType<typeof serverTimestamp> | { seconds: number };
  lastSeenAt: ReturnType<typeof serverTimestamp> | { seconds: number };
}

function detectEnvironment(): { platform: string; environment: string } {
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true;

  const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  if (isStandalone) {
    return {
      platform: "pwa",
      environment: isMobile ? "mobile-pwa" : "desktop-pwa",
    };
  }

  return {
    platform: "web",
    environment: isMobile ? "mobile-web" : "desktop-web",
  };
}

async function getMessagingInstance() {
  const supported = await isSupported();
  if (!supported) {
    console.warn("[FCM] Firebase Messaging não é suportado neste navegador.");
    return null;
  }
  return getMessaging(app);
}

export async function requestAndSyncFcmToken(uid: string): Promise<string | null> {
  try {
    if (!("Notification" in window)) {
      console.warn("[FCM] Notifications API não disponível.");
      return null;
    }

    if (!VAPID_KEY) {
      console.warn("[FCM] VAPID_KEY não configurada. Pule a sincronização do FCM.");
      return null;
    }

    // Request permission if not yet decided
    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      console.info("[FCM] Permissão de notificação não concedida:", permission);
      // Still save the permission state
      await updatePermissionState(uid, permission);
      return null;
    }

    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    // Get registration for the custom SW
    const swRegistration = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration || undefined,
    });

    if (!token) {
      console.warn("[FCM] Não foi possível obter token.");
      return null;
    }

    await syncTokenToFirestore(uid, token, permission);

    // Listen for token refresh
    onMessage(messaging, (payload) => {
      console.info("[FCM] Mensagem recebida em foreground:", payload);
    });

    return token;
  } catch (error) {
    console.error("[FCM] Erro ao obter/sincronizar token:", error);
    return null;
  }
}

async function updatePermissionState(uid: string, permission: NotificationPermission) {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      notificationPermission: permission,
      fcmUpdatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("[FCM] Erro ao salvar estado de permissão:", e);
  }
}

async function syncTokenToFirestore(
  uid: string,
  token: string,
  permission: NotificationPermission
) {
  const userRef = doc(db, "users", uid);
  const { platform, environment } = detectEnvironment();

  const newTokenData: Omit<FcmTokenData, "createdAt"> & { createdAt?: ReturnType<typeof serverTimestamp> } = {
    token,
    platform,
    environment,
    userAgent: navigator.userAgent,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    permission,
    isActive: true,
    updatedAt: serverTimestamp(),
    lastSeenAt: serverTimestamp(),
  };

  try {
    const userSnap = await getDoc(userRef);
    const existingTokens: FcmTokenData[] = userSnap.exists()
      ? userSnap.data()?.fcmTokens || []
      : [];

    const existingIndex = existingTokens.findIndex((t) => t.token === token);

    if (existingIndex >= 0) {
      // Token exists — update metadata
      existingTokens[existingIndex] = {
        ...existingTokens[existingIndex],
        ...newTokenData,
      };
    } else {
      // New token — add with createdAt
      existingTokens.push({
        ...newTokenData,
        createdAt: serverTimestamp(),
      } as FcmTokenData);
    }

    await updateDoc(userRef, {
      fcmTokens: existingTokens,
      fcmUpdatedAt: serverTimestamp(),
      notificationPermission: permission,
    });

    console.info(`[FCM] Token sincronizado (${environment}).`);
  } catch (error) {
    console.error("[FCM] Erro ao sincronizar token no Firestore:", error);
  }
}

export async function deactivateCurrentToken(uid: string): Promise<void> {
  try {
    const messaging = await getMessagingInstance();
    if (!messaging || !VAPID_KEY) return;

    let currentToken: string | null = null;
    try {
      currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
    } catch {
      // Can't get token, nothing to deactivate
      return;
    }

    if (!currentToken) return;

    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const existingTokens: FcmTokenData[] = userSnap.data()?.fcmTokens || [];
    const index = existingTokens.findIndex((t) => t.token === currentToken);

    if (index >= 0) {
      existingTokens[index].isActive = false;
      existingTokens[index].updatedAt = serverTimestamp() as any;

      await updateDoc(userRef, {
        fcmTokens: existingTokens,
        fcmUpdatedAt: serverTimestamp(),
      });
      console.info("[FCM] Token desativado no logout.");
    }
  } catch (error) {
    console.error("[FCM] Erro ao desativar token:", error);
  }
}
