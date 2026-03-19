import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Loader2,
  ShieldAlert,
  LogOut,
  BookOpen,
  Users,
  Shield,
  ChevronDown,
  Settings,
  Crown,
  GraduationCap,
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import AdminCursos from "@/components/AdminCursos";
import AdminAddAluno from "@/components/AdminAddAluno";
import SuperAdminAdmins from "@/components/SuperAdminAdmins";
import SuperAdminCoordenadores from "@/components/SuperAdminCoordenadores";
import SettingsDialog from "@/components/SettingsDialog";

const senacLogo = "/senac-logo.png";

const SuperAdmin: React.FC = () => {
  const { user, userData, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = userData?.role === "superAdmin";
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"cursos" | "alunos" | "admins" | "coordenadores">("cursos");

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6 sm:py-3">
          <div className="flex items-center gap-3 min-w-0">
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

          <div className="flex items-center gap-1">
            <NotificationBell userId={user?.uid} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2 sm:px-3 h-auto py-1.5 hover:bg-muted">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    <Crown className="h-4 w-4" />
                  </div>
                  <div className="hidden md:block text-left min-w-0">
                    <p className="text-sm font-medium text-foreground leading-tight truncate max-w-[160px]">
                      {userData?.nome || user.displayName || "SuperAdmin"}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-tight truncate max-w-[160px]">
                      {user.email}
                    </p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2 md:hidden">
                  <p className="text-sm font-medium text-foreground truncate">{userData?.nome || "SuperAdmin"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator className="md:hidden" />
                <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => { await signOut(auth); navigate("/login"); }}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair do sistema
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-primary via-primary to-secondary" />
      </header>

      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 space-y-4 sm:space-y-6">
        {/* Navigation Tabs */}
        <div className="flex gap-1 rounded-lg border bg-card p-1 shadow-sm">
          <Button
            variant={activeTab === "cursos" ? "default" : "ghost"}
            size="sm"
            className="flex-1 sm:flex-none gap-2"
            onClick={() => setActiveTab("cursos")}
          >
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Cursos</span>
          </Button>
          <Button
            variant={activeTab === "alunos" ? "default" : "ghost"}
            size="sm"
            className="flex-1 sm:flex-none gap-2"
            onClick={() => setActiveTab("alunos")}
          >
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">Alunos</span>
          </Button>
          <Button
            variant={activeTab === "admins" ? "default" : "ghost"}
            size="sm"
            className="flex-1 sm:flex-none gap-2"
            onClick={() => setActiveTab("admins")}
          >
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Administradores</span>
          </Button>
          <Button
            variant={activeTab === "coordenadores" ? "default" : "ghost"}
            size="sm"
            className="flex-1 sm:flex-none gap-2"
            onClick={() => setActiveTab("coordenadores")}
          >
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">Coordenadores</span>
          </Button>
        </div>

        {activeTab === "cursos" && <AdminCursos />}
        {activeTab === "alunos" && <AdminAddAluno />}
        {activeTab === "admins" && <SuperAdminAdmins />}
        {activeTab === "coordenadores" && <SuperAdminCoordenadores />}
      </main>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};

export default SuperAdmin;
