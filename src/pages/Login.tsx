// Importações do React
import React, { useState } from "react";
// Importações de roteamento
import { useNavigate } from "react-router-dom";
// Importações do Firebase Authentication
import { signInWithEmailAndPassword } from "firebase/auth";
// Importações do Firestore
import { doc, getDoc } from "firebase/firestore";
// Importa instâncias do Firebase
import { auth, db } from "@/lib/firebase";
// Importações de componentes da UI
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Importação da biblioteca de notificações
import { toast } from "sonner";
// Importações de ícones
import { Loader2, Mail, Lock } from "lucide-react";

// Caminho da logo SENAC
const senacLogo = "/senac-logo.png";

/**
 * Página de Login
 * Permite que usuários façam login com email e senha
 * Redireciona para dashboard apropriado baseado no role do usuário
 */
const Login: React.FC = () => {
  // Estado para armazenar email informado
  const [email, setEmail] = useState("");
  // Estado para armazenar senha informada
  const [password, setPassword] = useState("");
  // Estado para controlar status de carregamento durante login
  const [loading, setLoading] = useState(false);
  // Hook de navegação
  const navigate = useNavigate();

  /**
   * Obtém URL de redirecionamento segura do query parameter
   * Valida se o URL é seguro (começa com "/" e não é relativo)
   * @returns URL de redirecionamento ou null
   */
  const getSafeRedirect = () => {
    // Extrai parametro 'redirect' da URL
    const redirect = new URLSearchParams(window.location.search).get("redirect");
    // Valida se é um caminho seguro (começa com "/")
    if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//")) return null;
    return redirect;
  };

  /**
   * Manipulador do submit do formulário de login
   * Autentica usuário e redireciona para página apropriada
   * @param e - Evento do formulário
   */
  const handleLogin = async (e: React.FormEvent) => {
    // Previne comportamento padrão do formulário
    e.preventDefault();
    
    // Valida se email e senha foram preenchidos
    if (!email || !password) {
      toast.error("Preencha todos os campos.");
      return;
    }

    // Define loading como true durante o processo
    setLoading(true);
    
    try {
      // Autentica usuário com email e senha
      const cred = await signInWithEmailAndPassword(auth, email, password);
      
      // Tenta obter role do usuário
      let role = "";
      
      try {
        // Tenta obter role das custom claims do token
        const tokenResult = await cred.user.getIdTokenResult(true);
        role = (tokenResult.claims.role as string) || "";
      } catch {
        // Fallback: tenta buscar role do Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", cred.user.uid));
          if (userDoc.exists()) role = userDoc.data().role || "";
        } catch {}
      }
      
      // Obtém URL de redirecionamento segura
      const redirect = getSafeRedirect();
      
      // Redireciona baseado no role e redirect parameter
      if (redirect && (role === "admin" || role === "superAdmin")) {
        navigate(redirect);
      } else if (role === "superAdmin") {
        // Super admin vai para super-admin dashboard
        navigate("/super-admin");
      } else if (role === "admin") {
        // Admin vai para admin dashboard
        navigate("/admin");
      } else {
        // Aluno vai para dashboard de horas
        navigate("/");
      }
      
      // Exibe mensagem de sucesso
      toast.success("Login realizado com sucesso!");
    } catch (err: any) {
      // Log do erro
      console.error("Erro no login:", err);
      
      // Exibe mensagem de erro apropriada baseada no código do erro
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        toast.error("E-mail ou senha inválidos.");
      } else {
        toast.error("Erro ao fazer login. Tente novamente.");
      }
    } finally {
      // Define loading como false
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Painel esquerdo - apenas desktop */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col items-center justify-center bg-primary text-primary-foreground">
        {/* Elementos decorativos - fundo com gradiente */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-[hsl(210,100%,22%)]" />
        {/* Elementos de decoração - círculos desfocados */}
        <div className="absolute top-20 -left-20 h-72 w-72 rounded-full bg-secondary/10 blur-3xl" />
        <div className="absolute bottom-20 -right-20 h-96 w-96 rounded-full bg-secondary/8 blur-3xl" />
        <div className="absolute top-1/3 right-10 h-40 w-40 rounded-full border border-primary-foreground/10" />
        <div className="absolute bottom-1/4 left-16 h-24 w-24 rounded-full border border-primary-foreground/5" />

        {/* Conteúdo do painel esquerdo */}
        <div className="relative z-10 flex flex-col items-center gap-8 px-12 text-center">
          {/* Logo SENAC */}
          <img
            src={senacLogo}
            alt="Logo Senac"
            className="h-28 w-auto drop-shadow-lg brightness-0 invert"
          />
          
          {/* Título do sistema */}
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight">
              Sistema integrado de gestão de horas complementares
            </h1>
            <h1 className="text-3xl font-bold tracking-tight">
              SIGHC</h1>
          </div>
          
          {/* Descrição */}
          <div className="mt-4 max-w-sm">
            <p className="text-sm text-primary-foreground/60 leading-relaxed">
              Ambiente acadêmico para gestão e validação de certificados de atividades complementares.
            </p>
            <p className="mt-4 text-[11px] font-bold text-yellow-400 uppercase tracking-wider">
              Este site não pertence a instituição SENAC
            </p>
          </div>
        </div>
      </div>

      {/* Painel direito / Full mobile */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center px-6 py-12">
        {/* Header mobile */}
        <div className="flex flex-col items-center gap-4 mb-10 lg:hidden">
          <img
            src={senacLogo}
            alt="Logo Senac"
            className="h-20 w-auto"
          />
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold text-foreground">
              Sistema integrado de gestão de horas complementares  SIGHC
            </h1>
          </div>
        </div>

        {/* Card de login */}
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border bg-card p-8 shadow-lg space-y-6 animate-fade-in">
            {/* Cabeçalho do card */}
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-foreground">Acesso ao Sistema</h2>
              <p className="text-sm text-muted-foreground">Entre com suas credenciais</p>
            </div>

            {/* Formulário de login */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Campo de email */}
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

              {/* Campo de senha */}
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

              {/* Botão de submit */}
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

            {/* Links adicionais */}
            <div className="flex flex-col items-center gap-2">
              {/* Link para recuperação de senha */}
              <button type="button" onClick={() => navigate("/forgot-password")} className="text-sm text-primary hover:underline font-medium">
                Esqueceu sua senha?
              </button>
              {/* Link para primeiro acesso */}
              <button type="button" onClick={() => navigate("/first-access")} className="text-sm text-muted-foreground hover:text-primary hover:underline font-medium transition-colors">
                Primeiro acesso? Defina sua senha
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Exporta componente Login como padrão
export default Login;
