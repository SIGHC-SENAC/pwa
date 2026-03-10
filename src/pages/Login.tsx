import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Mail, Lock } from "lucide-react";
import senacLogo from "@/assets/senac-logo.png";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha todos os campos.");
      return;
    }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      let role = "";
      try {
        const tokenResult = await cred.user.getIdTokenResult(true);
        role = (tokenResult.claims.role as string) || "";
      } catch {
        try {
          const userDoc = await getDoc(doc(db, "users", cred.user.uid));
          if (userDoc.exists()) role = userDoc.data().role || "";
        } catch {}
      }
      if (role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }
      toast.success("Login realizado com sucesso!");
    } catch (err: any) {
      console.error("Erro no login:", err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        toast.error("E-mail ou senha inválidos.");
      } else {
        toast.error("Erro ao fazer login. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left panel - desktop only */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col items-center justify-center bg-primary text-primary-foreground">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-[hsl(210,100%,22%)]" />
        <div className="absolute top-20 -left-20 h-72 w-72 rounded-full bg-secondary/10 blur-3xl" />
        <div className="absolute bottom-20 -right-20 h-96 w-96 rounded-full bg-secondary/8 blur-3xl" />
        <div className="absolute top-1/3 right-10 h-40 w-40 rounded-full border border-primary-foreground/10" />
        <div className="absolute bottom-1/4 left-16 h-24 w-24 rounded-full border border-primary-foreground/5" />

        <div className="relative z-10 flex flex-col items-center gap-8 px-12 text-center">
          <img
            src={senacLogo}
            alt="Logo Senac"
            className="h-28 w-auto drop-shadow-lg brightness-0 invert"
          />
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight">
              Projeto Integrador 3º Período
            </h1>
            <p className="text-lg font-medium text-primary-foreground/80">
              Sistema Acadêmico de Horas Complementares
            </p>
          </div>
          <div className="mt-4 max-w-sm">
            <p className="text-sm text-primary-foreground/60 leading-relaxed">
              Ambiente acadêmico para gestão e validação de certificados de atividades complementares.
            </p>
          </div>
        </div>
      </div>

      {/* Right panel / Mobile full */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center px-6 py-12">
        {/* Mobile header */}
        <div className="flex flex-col items-center gap-4 mb-10 lg:hidden">
          <img
            src={senacLogo}
            alt="Logo Senac"
            className="h-20 w-auto"
          />
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold text-foreground">
              Projeto Integrador 3º Período
            </h1>
            <p className="text-sm text-muted-foreground">
              Sistema Acadêmico de Horas Complementares
            </p>
          </div>
        </div>

        {/* Login card */}
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border bg-card p-8 shadow-lg space-y-6 animate-fade-in">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-foreground">Acesso ao Sistema</h2>
              <p className="text-sm text-muted-foreground">Entre com suas credenciais</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-foreground">E-mail</label>
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

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-foreground">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>

            <div className="text-center">
              <button type="button" className="text-sm text-primary hover:underline font-medium">
                Esqueceu sua senha?
              </button>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Faculdade Senac Pernambuco
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
