import React from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NotificationBellProps {
  userId: string | undefined;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ userId }) => {
  const { notifications, unreadCount, permission, markAllAsRead } = useNotifications(userId);

  const isActive = permission === "granted";

  return (
    <Popover onOpenChange={(open) => { if (open && unreadCount > 0) markAllAsRead(); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          {isActive ? (
            <Bell className="h-5 w-5 text-foreground" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Notificações</p>
          {!isActive && (
            <p className="text-xs text-muted-foreground mt-1">
              Notificações desativadas no navegador.
            </p>
          )}
        </div>
        <ScrollArea className="max-h-72">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4">
              <Bell className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.slice(0, 20).map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 ${!n.read ? "bg-primary/5" : ""}`}
                >
                  <p className="text-sm font-medium text-foreground leading-tight">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    {formatDistanceToNow(n.timestamp, { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
