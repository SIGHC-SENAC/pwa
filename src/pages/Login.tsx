import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, GraduationCap } from "lucide-react";

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      {/* Top accent bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-secondary" />

      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <GraduationCap className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-foreground">Horas Complementares</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Acesse sua conta para continuar</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
          <div>
            <label htmlFor="email" className="text-sm font-medium text-foreground">E-mail</label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="mt-1.5"
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium text-foreground">Senha</label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5"
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Faculdade Senac Pernambuco
        </p>
      </div>
    </div>
  );
};

export default Login;
