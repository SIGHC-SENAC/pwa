// Importações do React
import React, { useState } from "react";
// Importações de roteamento
import { useNavigate } from "react-router-dom";
// Importações do Firebase para resetar senha
import { sendPasswordResetEmail } from "firebase/auth";
// Importa instância do Firebase Auth
import { auth } from "@/lib/firebase";
// Importações de componentes da UI
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Importação da biblioteca de notificações
import { toast } from "sonner";
// Importações de ícones
import { Loader2, Mail, ArrowLeft, CheckCircle2, KeyRound } from "lucide-react";

// Caminho da logo SENAC
const senacLogo = "/senac-logo.png";

/**
 * Página de Primeiro Acesso
 * Permite que novos usuários definam sua senha na primeira vez
 */
const FirstAccess: React.FC = () => {
  // Estado para armazenar email informado
  const [email, setEmail] = useState("");
  // Estado para controlar status de carregamento
  const [loading, setLoading] = useState(false);
  // Estado para indicar se email foi enviado
  const [sent, setSent] = useState(false);
  // Hook de navegação
  const navigate = useNavigate();

  /**
   * Manipulador do submit do formulário
   * Envia email para definir primeira senha
   */
  const handleSubmit = async (e: React.FormEvent) => {
    // Previne comportamento padrão
    e.preventDefault();
    
    // Valida se email foi preenchido
    if (!email) {
      toast.error("Informe seu e-mail.");
      return;
    }
    
    // Inicia carregamento
    setLoading(true);
    
    try {
      // Envia email de reset de senha para primeiro acesso
      await sendPasswordResetEmail(auth, email);
      // Define que email foi enviado
      setSent(true);
    } catch (err: any) {
      // Log do erro
      console.error("Erro ao enviar e-mail de redefinição:", err);
      
      // Trata diferentes tipos de erro
      if (err.code === "auth/too-many-requests") {
        toast.error("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
      } else if (err.code === "auth/invalid-email") {
        toast.error("E-mail inválido. Verifique e tente novamente.");
      } else {
        // Mensagem genérica para não expor se o e-mail existe
        setSent(true);
      }
    } finally {
      // Finaliza carregamento
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Header com logo */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <img src={senacLogo} alt="Logo Senac" className="h-20 w-auto" />
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold text-foreground">
              Sistema integrado de gestão de Horas complementares
            </h1>
            <h1 className="text-xl font-bold text-foreground">
              SIGHC
            </h1>
          </div>
        </div>

        {/* Card principal */}
        <div className="rounded-2xl border bg-card p-8 shadow-lg space-y-6 animate-fade-in">
          {sent ? (
            // Mensagem de sucesso após envio
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">E-mail enviado</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Verifique sua caixa de entrada. Se o e-mail estiver cadastrado, você receberá um link para definir sua senha de acesso.
              </p>
              <Button
                className="w-full h-12 text-base font-semibold mt-2"
                onClick={() => navigate("/login")}
              >
                Ir para o login
              </Button>
            </div>
          ) : (
            // Formulário para solicitar acesso
            <>
              <div className="text-center space-y-2">
                {/* Ícone de chave */}
                <div className="flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <KeyRound className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-foreground">Primeiro Acesso</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Informe o e-mail cadastrado pelo administrador para definir sua senha e acessar o sistema.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-foreground">
                    E-mail institucional
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
                    "Enviar link de acesso"
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
          )}
        </div>
      </div>
    </div>
  );
};

// Exporta componente FirstAccess como padrão
export default FirstAccess;
