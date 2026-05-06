// Importações do React para hooks
import { useEffect, useState, useCallback } from "react";
// Importações de funções do serviço de FCM
import {
  requestPermissionAndGetToken,
  listenForegroundMessages,
  getAllNotifications,
  markAllAsRead as markAllReadLS,
  markAllAsReadIDB,
  getNotificationPermissionState,
  FcmNotification,
} from "@/services/fcmService";

/**
 * Hook customizado para gerenciar notificações FCM
 * Carrega notificações ao montar, solicita permissão,
 * escuta mensagens em foreground e faz polling de notificações em background
 * @param userId - ID do usuário para registrar token FCM
 * @returns Objeto com notificações, count de não lidas, permissão e função para marcar como lido
 */
export function useNotifications(userId: string | undefined) {
  // Estado para armazenar notificações
  const [notifications, setNotifications] = useState<FcmNotification[]>([]);
  // Estado para armazenar permissão de notificação
  const [permission, setPermission] = useState<"granted" | "denied" | "default">(getNotificationPermissionState);
  // Estado para armazenar token FCM
  const [token, setToken] = useState<string | null>(null);

  /**
   * Effect que carrega todas as notificações ao montar o componente
   * Busca de localStorage + IndexedDB
   */
  useEffect(() => {
    getAllNotifications().then(setNotifications);
  }, []);

  /**
   * Effect que solicita permissão de notificação e registra token FCM
   * Executado quando userId mudar
   */
  useEffect(() => {
    if (!userId) return;
    
    const init = async () => {
      // Solicita permissão e obtém token
      const t = await requestPermissionAndGetToken(userId);
      setToken(t);
      // Atualiza estado de permissão
      setPermission(getNotificationPermissionState());
    };
    
    init();
  }, [userId]);

  /**
   * Effect que escuta mensagens FCM em foreground
   * Adiciona notificações ao estado quando recebidas
   */
  useEffect(() => {
    if (!userId || permission !== "granted") return;
    
    // Registra listener para mensagens em foreground
    const unsub = listenForegroundMessages((notification) => {
      // Adiciona notificação no início do array
      setNotifications((prev) => [notification, ...prev]);
    });
    
    return () => { unsub?.(); };
  }, [userId, permission]);

  /**
   * Effect para fazer polling de notificações em background
   * A cada 5 segundos, busca novas notificações no IndexedDB
   * Também atualiza quando a aba fica visível
   */
  useEffect(() => {
    if (permission !== "granted") return;

    // Função para fazer polling
    const poll = () => {
      getAllNotifications().then(setNotifications);
    };

    // Polling a cada 5 segundos
    const interval = setInterval(poll, 5000);
    
    // Listener para quando a aba fica visível
    const handleVisibility = () => {
      if (document.visibilityState === "visible") poll();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Cleanup: remove listeners e intervalo
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [permission]);

  /**
   * Effect que registra listener para evento de instalação de PWA
   * Solicita token quando app é instalada
   */
  useEffect(() => {
    if (!userId) return;
    
    const handler = () => {
      // Solicita token após instalação
      requestPermissionAndGetToken(userId).then((t) => {
        if (t) setToken(t);
      });
    };
    
    window.addEventListener("appinstalled", handler);
    
    return () => window.removeEventListener("appinstalled", handler);
  }, [userId]);

  /**
   * Calcula quantidade de notificações não lidas
   */
  const unreadCount = notifications.filter((n) => !n.read).length;

  /**
   * Função para marcar todas as notificações como lidas
   * Atualiza tanto localStorage quanto IndexedDB
   */
  const markAllAsRead = useCallback(async () => {
    // Marca como lido no localStorage
    markAllReadLS();
    // Marca como lido no IndexedDB
    await markAllAsReadIDB();
    // Atualiza estado local
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  return { notifications, unreadCount, permission, token, markAllAsRead };
}
