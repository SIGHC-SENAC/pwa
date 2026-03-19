import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import LandingDashboard from "@/components/LandingDashboard";
import { ArrowRight, Shield, Zap, CheckCircle2 } from "lucide-react";

const senacLogo = "/senac-logo.png";

const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <img src={senacLogo} alt="Senac Pernambuco" className="h-9 w-auto object-contain" />
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-primary leading-tight">SIGHC</p>
              <p className="text-[11px] text-muted-foreground">Horas Complementares</p>
            </div>
          </div>
          <Button onClick={() => navigate("/login")} className="gap-2">
            Entrar
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-primary via-primary to-secondary" />
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-[hsl(210,100%,20%)]" />
        <div className="absolute top-10 -left-20 h-64 w-64 rounded-full bg-secondary/10 blur-3xl" />
        <div className="absolute bottom-0 -right-20 h-80 w-80 rounded-full bg-secondary/8 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium mb-6">
            <Zap className="h-3.5 w-3.5" />
            Faculdade Senac Pernambuco
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight mb-4">
            Sistema Integrado de Gestão de<br className="hidden sm:block" />
            <span className="text-secondary"> Horas Complementares</span>
          </h1>
          <p className="text-base sm:text-lg text-primary-foreground/70 max-w-xl mx-auto mb-8 leading-relaxed">
            Plataforma oficial para envio, validação e acompanhamento de certificados de atividades complementares.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              onClick={() => navigate("/login")}
              size="lg"
              variant="secondary"
              className="gap-2 px-8 font-semibold"
            >
              Acessar o sistema
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => navigate("/first-access")}
              size="lg"
              variant="outline"
              className="gap-2 px-8 bg-transparent border-white/30 text-white hover:bg-white/10"
            >
              Primeiro acesso
            </Button>
          </div>
        </div>
      </section>

      {/* Features strip */}
      <section className="border-b bg-card">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Shield, title: "Seguro", desc: "PDFs analisados automaticamente contra conteúdo malicioso." },
              { icon: CheckCircle2, title: "Ágil", desc: "Coordenadores aprovam certificados diretamente na plataforma." },
              { icon: Zap, title: "Acessível", desc: "Funciona como app no celular — sem precisar instalar nada." },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-3 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/8">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{f.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard stats & How it works */}
      <LandingDashboard />

      {/* Footer */}
      <footer className="border-t bg-card mt-0">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <img src={senacLogo} alt="Senac" className="h-7 w-auto object-contain opacity-70" />
            <p className="text-xs text-muted-foreground">Faculdade Senac Pernambuco</p>
          </div>
          <p className="text-xs text-muted-foreground">Projeto Integrador — 3º Período TADS</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
