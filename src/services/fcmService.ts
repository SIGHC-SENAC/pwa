// Importações do Firebase Cloud Messaging
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
// Importações do Firestore
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
// Importa instância do Firebase
import app, { db } from "@/lib/firebase";

// Chave VAPID do Firebase Cloud Messaging
const VAPID_KEY = import.meta.env.VITE_VAPID_KEY;
// Chave para armazenar notificações no localStorage
const NOTIFICATIONS_STORAGE_KEY = "fcm_notifications";

// Configuração do IndexedDB para armazenar notificações
const DB_NAME = "fcm_notifications_db";
const STORE_NAME = "notifications";

/**
 * Interface que define uma notificação FCM
 */
export interface FcmNotification {
  // ID único da notificação
  id: string;
  // Título da notificação
  title: string;
  // Corpo/conteúdo da notificação
  body: string;
  // Timestamp da notificação
  timestamp: number;
  // Indicador se a notificação foi lida
  read: boolean;
  // Fonte da notificação (foreground ou background)
  source?: "foreground" | "background";
}

/**
 * Verifica se a aplicação está rodando em modo PWA
 * @returns true se está em PWA, false caso contrário
 */
function isPwa(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true;
}

// ── IndexedDB helpers (compartilhado com service worker) ──

/**
 * Abre conexão com IndexedDB para armazenar notificações
 * @returns Promise com a instância do banco de dados
 */
function openNotificationsDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Abre ou cria o banco de dados
    const request = indexedDB.open(DB_NAME, 1);
    
    // Event disparado quando o banco precisa ser criado/atualizado
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      // Cria object store se não existir
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    
    // Resolve quando bem-sucedido
    request.onsuccess = () => resolve(request.result);
    // Rejeita em caso de erro
    request.onerror = () => reject(request.error);
  });
}

/**
 * Busca todas as notificações armazenadas no IndexedDB
 * @returns Array de notificações ordenadas por data (mais recente primeiro)
 */
export async function getIndexedDBNotifications(): Promise<FcmNotification[]> {
  try {
    // Abre conexão com banco
    const db = await openNotificationsDB();
    // Inicia transação de leitura
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    // Busca todos os registros
    const request = store.getAll();
    
    return new Promise((resolve) => {
      request.onsuccess = () => {
        db.close();
        // Obtém e ordena notificações
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
    // Fallback em caso de erro
    return [];
  }
}

/**
 * Salva uma notificação no IndexedDB
 * @param notification - Notificação a salvar
 */
async function saveNotificationToIDB(notification: FcmNotification): Promise<void> {
  try {
    // Abre conexão com banco
    const db = await openNotificationsDB();
    // Inicia transação de escrita
    const tx = db.transaction(STORE_NAME, "readwrite");
    // Adiciona notificação ao store
    tx.objectStore(STORE_NAME).put(notification);
    
    // Aguarda conclusão da transação
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Fallback silencioso em caso de erro
  }
}

/**
 * Marca todas as notificações no IndexedDB como lidas
 */
export async function markAllAsReadIDB(): Promise<void> {
  try {
    // Abre conexão com banco
    const db = await openNotificationsDB();
    // Inicia transação de escrita
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    // Busca todos os registros
    const request = store.getAll();
    
    request.onsuccess = () => {
      const items = request.result || [];
      // Marca cada notificação como lida
      items.forEach((item: FcmNotification) => {
        store.put({ ...item, read: true });
      });
    };
    
    // Aguarda conclusão da transação
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Fallback silencioso em caso de erro
  }
}

// ── localStorage helpers (legado + foreground) ──

/**
 * Busca notificações armazenadas no localStorage
 * @returns Array de notificações ou array vazio
 */
export function getStoredNotifications(): FcmNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Salva uma notificação no localStorage
 * Mantém apenas as 50 notificações mais recentes
 * @param notification - Notificação a salvar
 */
export function saveNotificationToStorage(notification: FcmNotification): void {
  const notifications = getStoredNotifications();
  // Adiciona notificação no início do array
  notifications.unshift(notification);
  // Mantém apenas 50 notificações mais recentes
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications.slice(0, 50)));
}

/**
 * Marca todas as notificações no localStorage como lidas
 */
export function markAllAsRead(): void {
  const notifications = getStoredNotifications().map((n) => ({ ...n, read: true }));
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
}

// ── Notificações mescladas (localStorage + IndexedDB) ──

/**
 * Busca todas as notificações de múltiplas fontes
 * Combina notificações do localStorage e IndexedDB
 * Remove duplicatas e mantém as 50 mais recentes
 * @returns Array de notificações únicas, ordenadas por data
 */
export async function getAllNotifications(): Promise<FcmNotification[]> {
  // Busca notificações de ambas as fontes
  const lsNotifs = getStoredNotifications();
  const idbNotifs = await getIndexedDBNotifications();

  // Mescla e remove duplicatas usando Map
  const map = new Map<string, FcmNotification>();
  [...lsNotifs, ...idbNotifs].forEach((n) => {
    if (!map.has(n.id)) map.set(n.id, n);
  });

  // Converte para array, ordena por data e retorna 50 mais recentes
  return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
}

// ── Gerenciamento de token FCM ──

/**
 * Solicita permissão de notificação e obtém token FCM
 * Registra o token no documento do usuário no Firestore
 * @param userId - ID do usuário
 * @returns Token FCM ou null se falhar/não permitido
 */
export async function requestPermissionAndGetToken(userId: string): Promise<string | null> {
  try {
    // Verifica se FCM é suportado no navegador
    const supported = await isSupported();
    if (!supported) return null;

    // Solicita permissão ao usuário
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    // Obtém instância de messaging
    const messaging = getMessaging(app);
    // Solicita token FCM
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });

    if (token) {
      // Cria entrada de token com metadados
      const platform = isPwa() ? "PWA" : "Web";
      const tokenEntry = {
        token,
        platform,
        environment: window.location.hostname,
        active: true,
        updatedAt: Date.now(),
      };

      // Obtém referência do documento do usuário
      const userRef = doc(db, "users", userId);
      // Remove token anterior se existir
      await updateDoc(userRef, {
        fcmTokens: arrayRemove({ token, platform, environment: tokenEntry.environment, active: false, updatedAt: 0 }),
      }).catch(() => {});
      // Adiciona novo token
      await updateDoc(userRef, { fcmTokens: arrayUnion(tokenEntry) });
    }

    return token;
  } catch (err) {
    // Loga aviso se FCM não estiver disponível
    console.warn("FCM indisponível (push bloqueado ou sem permissão):", (err as Error)?.message || err);
    return null;
  }
}

/**
 * Desativa um token FCM no documento do usuário
 * @param userId - ID do usuário
 * @param token - Token a desativar
 */
export async function deactivateToken(userId: string, token: string): Promise<void> {
  try {
    const userRef = doc(db, "users", userId);
    // Remove token do array de tokens
    await updateDoc(userRef, {
      fcmTokens: arrayRemove({ token }),
    }).catch(() => {});
  } catch (err) {
    console.error("Erro ao desativar token FCM:", err);
  }
}

/**
 * Escuta mensagens FCM em foreground (quando app está aberta)
 * @param callback - Função chamada quando notificação é recebida
 * @returns Função para desinscrever do listener
 */
export function listenForegroundMessages(callback: (notification: FcmNotification) => void): (() => void) | null {
  try {
    const messaging = getMessaging(app);
    // Registra listener para mensagens em foreground
    const unsub = onMessage(messaging, (payload) => {
      // Cria objeto de notificação
      const notification: FcmNotification = {
        id: crypto.randomUUID(),
        title: payload.notification?.title || "Nova notificação",
        body: payload.notification?.body || "",
        timestamp: Date.now(),
        read: false,
        source: "foreground",
      };
      // Salva em ambas as fontes de armazenamento
      saveNotificationToStorage(notification);
      saveNotificationToIDB(notification);
      // Chama callback do listener
      callback(notification);
    });
    return unsub;
  } catch {
    return null;
  }
}

/**
 * Obtém o estado da permissão de notificação
 * @returns Estado da permissão: granted, denied ou default
 */
export function getNotificationPermissionState(): "granted" | "denied" | "default" {
  // Verifica se Notification API está disponível
  if (typeof Notification === "undefined") return "denied";
  // Retorna estado atual da permissão
  return Notification.permission;
}
