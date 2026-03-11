import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

const senacLogo = "/senac-logo.png";

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Informe seu e-mail.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      toast.error("Informe um e-mail válido.");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, trimmed);
      setSent(true);
    } catch (err: any) {
      console.error("Erro ao enviar link:", err);
      if (err.code === "auth/too-many-requests") {
        toast.error("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
      } else {
        // Secure: don't reveal if email exists
        setSent(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <img src={senacLogo} alt="Logo Senac" className="h-16 w-auto" />
          <div className="text-center space-y-0.5">
            <h1 className="text-lg font-bold text-foreground">
              Projeto Integrador 3º Período
            </h1>
            <p className="text-xs text-muted-foreground">
              Sistema Acadêmico de Horas Complementares
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border bg-card p-8 shadow-lg space-y-6 animate-fade-in">
          {!sent ? (
            <>
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold text-foreground">Recuperar senha</h2>
                <p className="text-sm text-muted-foreground">
                  Informe seu e-mail para receber o link de redefinição de senha.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-foreground">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="pl-10"
                      disabled={loading}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar link de redefinição"
                  )}
                </Button>
              </form>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar para login
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-foreground">Verifique seu e-mail</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Se o endereço estiver cadastrado, você receberá um link de redefinição de senha.
                </p>
              </div>
              <Button
                variant="outline"
                className="mt-2 h-11"
                onClick={() => navigate("/login")}
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao login
              </Button>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Faculdade Senac Pernambuco
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
