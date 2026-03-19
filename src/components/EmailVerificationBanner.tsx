import React, { useState } from "react";
import { sendEmailVerification } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Mail, X, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

interface Props {
  compact?: boolean;
}

const EmailVerificationBanner: React.FC<Props> = ({ compact = false }) => {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Don't show if user doesn't exist, email is verified, or user dismissed
  if (!user || user.emailVerified || dismissed) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      await sendEmailVerification(user);
      setSent(true);
      toast.success("E-mail de verificação enviado! Verifique sua caixa de entrada.");
    } catch (err: any) {
      if (err.code === "auth/too-many-requests") {
        toast.error("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
      } else {
        toast.error("Erro ao enviar e-mail de verificação.");
      }
    } finally {
      setSending(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-secondary/40 bg-secondary/8 px-3 py-2 text-xs">
        <AlertTriangle className="h-3.5 w-3.5 text-secondary shrink-0" />
        <span className="text-foreground">E-mail não verificado.</span>
        <button
          onClick={handleResend}
          disabled={sending || sent}
          className="ml-1 font-semibold text-primary hover:underline disabled:opacity-50"
        >
          {sent ? "Enviado!" : sending ? "Enviando..." : "Reenviar"}
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex items-start gap-3 rounded-lg border border-secondary/40 bg-secondary/8 px-4 py-3 shadow-sm">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/15">
        {sent ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : (
          <Mail className="h-4 w-4 text-secondary" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {sent ? "E-mail enviado!" : "Verifique seu e-mail"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {sent
            ? `Um link de verificação foi enviado para ${user.email}. Verifique sua caixa de entrada e spam.`
            : `Enviamos um e-mail de verificação para ${user.email}. Clique no link para confirmar sua conta.`
          }
        </p>

        {!sent && (
          <div className="mt-2 flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleResend}
              disabled={sending}
              className="h-7 text-xs gap-1.5"
            >
              {sending && <Loader2 className="h-3 w-3 animate-spin" />}
              {sending ? "Enviando..." : "Reenviar e-mail"}
            </Button>
            <p className="text-[10px] text-muted-foreground">Não recebeu? Verifique o spam.</p>
          </div>
        )}
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="text-muted-foreground hover:text-foreground transition-colors"
        title="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default EmailVerificationBanner;
