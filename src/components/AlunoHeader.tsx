import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, ChevronDown } from "lucide-react";
import senacLogo from "@/assets/senac-logo.png";

interface AlunoHeaderProps {
  userName: string;
  userEmail: string;
}

const AlunoHeader: React.FC<AlunoHeaderProps> = ({ userName, userEmail }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const initials = userName
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-card shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5 sm:px-6 sm:py-3">
        {/* Left: Logo + System Name */}
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={senacLogo}
            alt="Senac Pernambuco"
            className="h-9 sm:h-10 w-auto object-contain"
          />
          <div className="hidden sm:block h-8 w-px bg-border" />
          <div className="hidden sm:block min-w-0">
            <p className="text-sm font-bold text-primary leading-tight">
              Projeto Integrador 3º Período
            </p>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Horas Complementares
            </p>
          </div>
        </div>

        {/* Right: User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 px-2 sm:px-3 h-auto py-1.5 hover:bg-muted"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {initials || "A"}
              </div>
              <div className="hidden md:block text-left min-w-0">
                <p className="text-sm font-medium text-foreground leading-tight truncate max-w-[160px]">
                  {userName}
                </p>
                <p className="text-[11px] text-muted-foreground leading-tight truncate max-w-[160px]">
                  {userEmail}
                </p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-3 py-2 md:hidden">
              <p className="text-sm font-medium text-foreground truncate">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>
            <DropdownMenuSeparator className="md:hidden" />
            <DropdownMenuItem disabled>
              <User className="h-4 w-4 mr-2" />
              Meu perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {loggingOut ? "Saindo..." : "Sair do sistema"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {/* Accent bar */}
      <div className="h-0.5 bg-gradient-to-r from-primary via-primary to-secondary" />
    </header>
  );
};

export default AlunoHeader;
