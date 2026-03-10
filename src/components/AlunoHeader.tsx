import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { requestAndSyncFcmToken } from "@/services/fcmService";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LogOut, User, ChevronDown, Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import senacLogo from "@/assets/senac-logo.png";

interface AlunoHeaderProps {
  userName: string;
  userEmail: string;
}

type NotifStatus = "granted" | "denied" | "default" | "unsupported" | "loading";

const AlunoHeader: React.FC<AlunoHeaderProps> = ({ userName, userEmail }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [notifStatus, setNotifStatus] = useState<NotifStatus>("loading");
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!("Notification" in window)) {
      setNotifStatus("unsupported");
    } else {
      setNotifStatus(Notification.permission as NotifStatus);
    }
  }, []);

  const handleRequestPermission = useCallback(async () => {
    if (!user) return;
    setRequesting(true);
    try {
      const token = await requestAndSyncFcmToken(user.uid);
      const newStatus = Notification.permission as NotifStatus;
      setNotifStatus(newStatus);
      if (token) {
        toast.success("Notificações ativadas com sucesso!");
      } else if (newStatus === "denied") {
        toast.error("Permissão de notificação bloqueada. Altere nas configurações do navegador.");
      } else {
        toast.info("Permissão não concedida.");
      }
    } catch {
      toast.error("Erro ao ativar notificações.");
    } finally {
      setRequesting(false);
    }
  }, [user]);

  const initials = userName
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    navigate("/login");
  };

  const notifIcon = () => {
    if (notifStatus === "loading") return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    if (notifStatus === "granted") return <BellRing className="h-4 w-4 text-emerald-500" />;
    if (notifStatus === "denied") return <BellOff className="h-4 w-4 text-destructive" />;
    return <Bell className="h-4 w-4 text-muted-foreground" />;
  };

  const notifLabel = () => {
    if (notifStatus === "granted") return "Notificações ativas";
    if (notifStatus === "denied") return "Notificações bloqueadas";
    if (notifStatus === "unsupported") return "Não suportado";
    return "Notificações desativadas";
  };

  const canRequest = notifStatus === "default" || notifStatus === "unsupported";

  return (
    <header className="sticky top-0 z-40 border-b bg-card shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5 sm:px-6 sm:py-3">
        {/* Left: Logo + System Name */}
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={senacLogo}
            alt="Senac Pernambuco"
            className="h-9 sm:h-10 w-auto object-contain"
          />
          <div className="hidden sm:block h-8 w-px bg-border" />
          <div className="hidden sm:block min-w-0">
            <p className="text-sm font-bold text-primary leading-tight">
              Projeto Integrador 3º Período
            </p>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Horas Complementares
            </p>
          </div>
        </div>

        {/* Right: Notification status + User menu */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Notification status */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                {canRequest ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={handleRequestPermission}
                    disabled={requesting}
                  >
                    {requesting ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      notifIcon()
                    )}
                  </Button>
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full">
                    {notifIcon()}
                  </div>
                )}
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{notifLabel()}</p>
                {canRequest && <p className="text-xs text-muted-foreground">Clique para ativar</p>}
                {notifStatus === "denied" && (
                  <p className="text-xs text-muted-foreground">Altere nas configurações do navegador</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 px-2 sm:px-3 h-auto py-1.5 hover:bg-muted"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {initials || "A"}
                </div>
                <div className="hidden md:block text-left min-w-0">
                  <p className="text-sm font-medium text-foreground leading-tight truncate max-w-[160px]">
                    {userName}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-tight truncate max-w-[160px]">
                    {userEmail}
                  </p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2 md:hidden">
                <p className="text-sm font-medium text-foreground truncate">{userName}</p>
                <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
              </div>
              <DropdownMenuSeparator className="md:hidden" />
              <DropdownMenuItem disabled>
                <User className="h-4 w-4 mr-2" />
                Meu perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                disabled={loggingOut}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {loggingOut ? "Saindo..." : "Sair do sistema"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {/* Accent bar */}
      <div className="h-0.5 bg-gradient-to-r from-primary via-primary to-secondary" />
    </header>
  );
};

export default AlunoHeader;
