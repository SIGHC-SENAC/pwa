import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ShieldAlert,
  LogOut,
  BookOpen,
  Menu,
  Users,
  Shield,
  Crown,
  GraduationCap,
  User,
  LayoutDashboard,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import NotificationBell from "@/components/NotificationBell";
import AdminCursos from "@/components/AdminCursos";
import AdminTurmas from "@/components/AdminTurmas";
import AdminAlunosPorTurma from "@/components/AdminAlunosPorTurma";
import SuperAdminAdmins from "@/components/SuperAdminAdmins";
import SuperAdminDashboard from "@/components/SuperAdminDashboard";

const senacLogo = "/senac-logo.png";

type Tab = "dashboard" | "cursos" | "turmas" | "alunos" | "admins";

const navItems: { id: Tab; label: string; icon: React.ElementType; description: string }[] = [
  { id: "dashboard", label: "Dashboard",    icon: LayoutDashboard, description: "Visão geral do sistema" },
  { id: "cursos",    label: "Cursos",        icon: BookOpen,        description: "Gerencie os cursos" },
  { id: "turmas",    label: "Turmas",        icon: Users,           description: "Gerencie as turmas" },
  { id: "alunos",    label: "Alunos",        icon: GraduationCap,   description: "Cadastre e visualize alunos" },
  { id: "admins",    label: "Coordenadores", icon: Shield,          description: "Gerencie coordenadores" },
];

const SuperAdmin: React.FC = () => {
  const { user, userData, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = userData?.role === "superAdmin";
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  if (authLoading || (user && !userData)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Acesso restrito</h1>
        <p className="text-center text-sm text-muted-foreground">
          Esta página é exclusiva para super administradores.
        </p>
        <Button variant="outline" onClick={() => navigate("/")}>Voltar</Button>
      </div>
    );
  }

  const activeItem = navItems.find((n) => n.id === activeTab)!;
  const displayName = userData?.nome || user.displayName || "SuperAdmin";

  const renderSidebarContent = (isMobileSidebar = false) => (
    <>
      <div className="px-4 pt-5 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Menu</p>
      </div>
      <nav className="flex flex-col gap-0.5 px-2 flex-1">
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => {
                setActiveTab(id);
                if (isMobileSidebar) setMobileMenuOpen(false);
              }}
              className={`
                group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
                transition-all duration-150 w-full text-left
                ${isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground/70 hover:bg-muted hover:text-foreground"
                }
              `}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${isActive ? "bg-white/20" : "bg-muted group-hover:bg-background"}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="truncate">{label}</span>
              {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/80" />}
            </button>
          );
        })}
      </nav>
      <div className="mx-3 my-3 h-px bg-border" />
      <div className="px-3 pb-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
          onClick={async () => {
            if (isMobileSidebar) setMobileMenuOpen(false);
            await signOut(auth);
            navigate("/login");
          }}
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair
        </Button>
      </div>
    </>
  );
  const initials = displayName.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b bg-card shadow-sm shrink-0">
        <div className="flex items-center justify-between px-4 py-2.5 sm:px-6 sm:py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden shrink-0">
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Abrir menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 sm:max-w-none">
                <SheetHeader className="sr-only">
                  <SheetTitle>Menu de navegação</SheetTitle>
                  <SheetDescription>Navegue entre as seções do painel.</SheetDescription>
                </SheetHeader>
                <div className="flex h-full flex-col bg-card">
                  {renderSidebarContent(true)}
                </div>
              </SheetContent>
            </Sheet>
            <img src={senacLogo} alt="Senac Pernambuco" className="h-9 sm:h-10 w-auto object-contain" />
            <div className="hidden sm:block h-8 w-px bg-border" />
            <div className="hidden sm:block min-w-0">
              <p className="text-sm font-bold text-primary leading-tight flex items-center gap-1.5">
                <Crown className="h-4 w-4" />
                Super Administração
              </p>
              <p className="text-[11px] text-muted-foreground leading-tight">
                Gestão completa do sistema
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationBell userId={user?.uid} />

            {/* Unidade — display estático */}
            <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background px-3 py-1.5 shadow-sm">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {initials}
              </div>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
              </div>
              <User className="h-3.5 w-3.5 shrink-0 text-primary sm:hidden" />
            </div>
          </div>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-primary via-primary to-secondary" />
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar (desktop) ── */}
        <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-card overflow-y-auto">
          {renderSidebarContent()}
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-background">
          {/* Page heading */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/60 px-5 py-3.5 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                {(() => { const Icon = activeItem.icon; return <Icon className="h-4 w-4 text-primary" />; })()}
              </div>
              <div>
                <h1 className="text-sm font-bold text-foreground leading-tight">{activeItem.label}</h1>
                <p className="text-xs text-muted-foreground">{activeItem.description}</p>
              </div>
            </div>
          </div>

          <div className="px-4 py-5 sm:px-8 sm:py-6 pb-8 space-y-4">
            {activeTab === "dashboard" && <SuperAdminDashboard />}
            {activeTab === "cursos"    && <AdminCursos />}
            {activeTab === "turmas"    && <AdminTurmas />}
            {activeTab === "alunos"    && <AdminAlunosPorTurma showAll />}
            {activeTab === "admins"    && <SuperAdminAdmins />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SuperAdmin;
