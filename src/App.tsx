// Importações necessárias para React Query, roteamento e componentes da UI
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
// Importa o provider de autenticação que gerencia o contexto de usuário
import { AuthProvider } from "@/contexts/AuthContext";
// Importa todas as páginas da aplicação
import HorasComplementares from "./pages/HorasComplementares";
import Admin from "./pages/Admin";
import SuperAdmin from "./pages/SuperAdmin";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import FirstAccess from "./pages/FirstAccess";
import NotFound from "./pages/NotFound";
import Privacidade from "./pages/Privacidade";

// Cria instância do cliente React Query para gerenciar estado e cache
const queryClient = new QueryClient();

/**
 * Componente principal da aplicação (App)
 * Configura os providers (React Query, Autenticação, Roteamento)
 * e define todas as rotas da aplicação
 */
const App = () => (
  // Provider para gerenciar requisições e cache de dados
  <QueryClientProvider client={queryClient}>
    {/* Provider para tooltips */}
    <TooltipProvider>
      {/* Toasters para exibir notificações */}
      <Toaster />
      <Sonner />
      {/* Provider para gerenciar autenticação e contexto do usuário */}
      <AuthProvider>
        {/* Router para gerenciar rotas da aplicação */}
        <BrowserRouter>
          {/* Define todas as rotas disponíveis */}
          <Routes>
            {/* Rota para página de horas complementares (aluno) */}
            <Route path="/" element={<HorasComplementares />} />
            {/* Rota para dashboard de admin */}
            <Route path="/admin" element={<Admin />} />
            {/* Rota para dashboard de super admin */}
            <Route path="/super-admin" element={<SuperAdmin />} />
            {/* Rota para login */}
            <Route path="/login" element={<Login />} />
            {/* Rota para recuperação de senha */}
            <Route path="/forgot-password" element={<ForgotPassword />} />
            {/* Rota para primeiro acesso */}
            <Route path="/first-access" element={<FirstAccess />} />
            {/* Rota para política de privacidade */}
            <Route path="/privacidade" element={<Privacidade />} />
            {/* Rota padrão para páginas não encontradas */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

// Exporta App como componente padrão
export default App;
