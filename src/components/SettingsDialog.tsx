import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { requestPermissionAndGetToken, getNotificationPermissionState } from "@/services/fcmService";
import { User, Bell, BellRing, Copy, RefreshCw, Smartphone, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onOpenChange }) => {
  const { user, userData } = useAuth();
  const { permission, token } = useNotifications(user?.uid);
  const [refreshing, setRefreshing] = useState(false);
  const [currentToken, setCurrentToken] = useState<string | null>(token);

  useEffect(() => {
    setCurrentToken(token);
  }, [token]);

  const handleCopyToken = useCallback(() => {
    if (currentToken) {
      navigator.clipboard.writeText(currentToken);
      toast.success("Token copiado para a área de transferência.");
    }
  }, [currentToken]);

  const handleRefreshToken = useCallback(async () => {
    if (!user?.uid) return;
    setRefreshing(true);
    try {
      const newToken = await requestPermissionAndGetToken(user.uid);
      if (newToken) {
        setCurrentToken(newToken);
        toast.success("Token atualizado com sucesso.");
      } else {
        toast.error("Não foi possível obter o token.");
      }
    } catch {
      toast.error("Erro ao atualizar token.");
    } finally {
      setRefreshing(false);
    }
  }, [user?.uid]);

  const permissionState = getNotificationPermissionState();
  const isGranted = permissionState === "granted";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground">
            Configurações
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Gerencie seu perfil, senha e preferências de notificação.
          </p>
        </DialogHeader>

        <Tabs defaultValue="notificacoes" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="perfil" className="flex-1 gap-1.5">
              <User className="h-3.5 w-3.5" />
              Perfil & Conta
            </TabsTrigger>
            <TabsTrigger value="notificacoes" className="flex-1 gap-1.5">
              <Bell className="h-3.5 w-3.5" />
              Notificações
            </TabsTrigger>
          </TabsList>

          {/* Perfil Tab */}
          <TabsContent value="perfil" className="mt-4 space-y-4">
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Nome</p>
                <p className="text-sm font-medium text-foreground">{userData?.nome || "—"}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">E-mail</p>
                <p className="text-sm font-medium text-foreground">{userData?.email || user?.email || "—"}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">Função</p>
                <Badge variant="secondary" className="mt-0.5 capitalize">
                  {userData?.role || "—"}
                </Badge>
              </div>
            </div>
          </TabsContent>

          {/* Notificações Tab */}
          <TabsContent value="notificacoes" className="mt-4 space-y-4">
            <div className="rounded-lg border bg-card p-4 space-y-4">
              <div className="flex items-start gap-3">
                <Smartphone className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-foreground">Notificações Push</p>
                  <p className="text-xs text-muted-foreground">
                    Receba alertas em tempo real mesmo com o sistema em segundo plano.
                  </p>
                </div>
              </div>

              {/* Status */}
              {isGranted ? (
                <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2">
                  <BellRing className="h-4 w-4 text-primary" />
                  <span className="text-sm text-primary font-medium">
                    Notificações push ativadas neste dispositivo.
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground font-medium">
                    {permissionState === "denied"
                      ? "Notificações bloqueadas no navegador. Altere nas configurações do navegador."
                      : "Aguardando permissão..."}
                  </span>
                </div>
              )}

              {/* Token */}
              {currentToken && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Token FCM ativo:</p>
                  <div className="rounded-md bg-muted/50 border p-2.5">
                    <p className="text-[11px] text-muted-foreground font-mono break-all leading-relaxed">
                      {currentToken}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopyToken} className="gap-1.5">
                      <Copy className="h-3.5 w-3.5" />
                      Copiar token
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefreshToken}
                      disabled={refreshing}
                      className="gap-1.5"
                    >
                      {refreshing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      Atualizar token
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Se o envio falhar com "not found", clique em{" "}
                    <strong>Atualizar token</strong> para gerar um novo.
                  </p>
                </div>
              )}

              {!isGranted && permissionState !== "denied" && (
                <Button
                  onClick={handleRefreshToken}
                  disabled={refreshing}
                  className="w-full gap-2"
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                  Ativar notificações push
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
