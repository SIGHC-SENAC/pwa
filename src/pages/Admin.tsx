import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { signOut } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import { CertificadoMeta, formatFileSize } from "@/services/certificadoService";
import {
  fetchAllCertificados,
  aprovarCertificado,
  rejeitarCertificado,
  atualizarCategoriaCertificado,
} from "@/services/adminService";
import { fetchAlunos } from "@/services/cursoService";
import PdfViewerModal from "@/components/PdfViewerModal";
import AdminDashboardCharts from "@/components/AdminDashboardCharts";
import AdminAlunosPorTurma from "@/components/AdminAlunosPorTurma";
import AdminCursoInfo from "@/components/AdminCursoInfo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2,
  ShieldAlert,
  LogOut,
  Search,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
  Shield,
  Menu,
  User,
  LayoutDashboard,
  ClipboardList,
  GraduationCap,
  BookOpen,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import NotificationBell from "@/components/NotificationBell";

// Logo exibido no cabecalho do painel administrativo.
const senacLogo = "/senac-logo.png";

// Secoes principais que o admin pode acessar pelo menu.
type Section = "dashboard" | "certificados" | "alunos" | "curso";

// Configuracao dos itens do menu lateral e do titulo de cada secao.
const navItems: { id: Section; label: string; icon: React.ElementType; description: string }[] = [
  { id: "dashboard",    label: "Dashboard",    icon: LayoutDashboard, description: "Visão geral das horas complementares" },
  { id: "certificados", label: "Certificados", icon: ClipboardList,   description: "Análise de horas complementares" },
  { id: "alunos",       label: "Alunos",       icon: GraduationCap,   description: "Alunos dos cursos separados por turma" },
  { id: "curso",        label: "Cursos",       icon: BookOpen,        description: "Cursos vinculados, categorias e limites de horas" },
];

// Define texto e cores dos badges para cada status de certificado.
const statusConfig: Record<string, { label: string; className: string }> = {
  pendente:  { label: "Pendente",  className: "bg-secondary/15 text-secondary border-secondary/30" },
  aprovado:  { label: "Aprovado",  className: "bg-success/15 text-success border-success/30" },
  rejeitado: { label: "Rejeitado", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

// Formata timestamp do Firestore para uma data curta em portugues.
function formatDate(ts: { seconds: number } | null): string {
  if (!ts) return "—";
  return new Date(ts.seconds * 1000).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// Numero de linhas exibidas por pagina na listagem de certificados.
const ITEMS_PER_PAGE = 15;

// Componente principal do painel administrativo.
const Admin: React.FC = () => {
  // Autenticacao, navegacao e leitura de parametros da URL.
  const { user, userData, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Controle de permissao e responsividade da interface.
  const isAdmin = userData?.role === "admin" || userData?.role === "superAdmin";
  const isMobile = useIsMobile();

  // Estados principais da pagina: secao ativa, dados, modal e menu mobile.
  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  const [certificados, setCertificados] = useState<CertificadoMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState<CertificadoMeta | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filtros, ordenacao, paginacao e filtro focado em um aluno.
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [sortOrder, setSortOrder] = useState("recente");
  const [currentPage, setCurrentPage] = useState(1);
  const [alunoView, setAlunoView] = useState<string | null>(null);

  // Carrega os certificados exibidos no painel.
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Busca certificados e alunos em paralelo para melhor performance
      const [certs, students] = await Promise.all([
        fetchAllCertificados(),
        fetchAlunos()
      ]);

      const studentMap = new Map(students.map(s => [s.id, s.nome]));

      // Enriquece o certificado com o nome do aluno caso o campo esteja vazio
      const enrichedCerts = certs.map(cert => ({
        ...cert,
        nomeAluno: cert.nomeAluno || studentMap.get(cert.uid) || "Aluno não identificado"
      }));

      setCertificados(enrichedCerts);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar certificados.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Redireciona para login quando a sessao nao existe.
  useEffect(() => {
    if (!authLoading && !user) {
      const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
      navigate(`/login?redirect=${redirect}`);
    }
  }, [authLoading, location.pathname, location.search, navigate, user]);

  // Busca dados assim que o usuario autenticado tiver permissao administrativa.
  useEffect(() => { if (user && isAdmin) loadData(); }, [user, isAdmin, loadData]);

  // Lista de cursos sob responsabilidade do admin/coordenador.
  const cursoIdsAdmin = useMemo(() => {
    return userData?.cursoIds?.length ? userData.cursoIds : userData?.cursoId ? [userData.cursoId] : [];
  }, [userData?.cursoId, userData?.cursoIds]);

  // Super admin ve todos; admin comum ve somente certificados dos seus cursos.
  const certificadosVisiveis = useMemo(() => {
    if (userData?.role === "superAdmin" || cursoIdsAdmin.length === 0) return certificados;
    return certificados.filter((certificado) => !certificado.cursoId || cursoIdsAdmin.includes(certificado.cursoId));
  }, [certificados, cursoIdsAdmin, userData?.role]);

  // Fecha o modal de certificado e limpa o parametro certificadoId da URL.
  const closeCertificadoModal = useCallback(() => {
    setModalOpen(false);
    setSelectedCert(null);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("certificadoId");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Permite abrir diretamente um certificado por link com ?certificadoId=...
  useEffect(() => {
    const certificadoId = searchParams.get("certificadoId");
    if (!certificadoId || loading || !isAdmin) return;

    const certificado = certificadosVisiveis.find((item) => item.id === certificadoId);
    if (!certificado) return;

    setActiveSection("certificados");
    setSelectedCert(certificado);
    setModalOpen(true);
  }, [certificadosVisiveis, isAdmin, loading, searchParams]);

  // Aprova certificado, dispara feedback ao aluno pelo service e recarrega os dados.
  const handleAprovar = async (certId: string, horas: number, obs: string) => {
    if (!user || !userData) return;
    await aprovarCertificado(certId, user.uid, userData.nome || user.displayName || "Admin", horas, obs);
    await loadData();
  };

  // Rejeita certificado, dispara feedback ao aluno pelo service e recarrega os dados.
  const handleRejeitar = async (certId: string, motivo: string, obs: string) => {
    if (!user || !userData) return;
    await rejeitarCertificado(certId, user.uid, userData.nome || user.displayName || "Admin", motivo, obs);
    await loadData();
  };

  // Atualiza a categoria do certificado sem fechar o modal de detalhes.
  const handleAtualizarCategoria = async (certId: string, categoriaId: string | null, categoriaNome: string | null) => {
    await atualizarCategoriaCertificado(certId, categoriaId, categoriaNome);
    setSelectedCert((current) =>
      current?.id === certId ? { ...current, categoriaId, categoriaNome } : current
    );
    await loadData();
  };

  // Totais usados nas abas de status e nos graficos do dashboard.
  const stats = useMemo(() => {
    const total     = certificadosVisiveis.length;
    const pendentes = certificadosVisiveis.filter((c) => c.status === "pendente").length;
    const aprovados = certificadosVisiveis.filter((c) => c.status === "aprovado").length;
    const rejeitados= certificadosVisiveis.filter((c) => c.status === "rejeitado").length;
    const horasTotal= certificadosVisiveis.reduce((s, c) => s + (c.horasAprovadas || 0), 0);
    return { total, pendentes, aprovados, rejeitados, horasTotal };
  }, [certificadosVisiveis]);

  // Consolida dados por aluno para exibir o banner quando um aluno e filtrado.
  const alunosSummary = useMemo(() => {
    const map = new Map<string, { nome: string; email: string; total: number; aprovados: number; rejeitados: number; pendentes: number; horas: number }>();
    certificadosVisiveis.forEach((c) => {
      const e = map.get(c.uid) || { nome: c.nomeAluno, email: c.emailAluno, total: 0, aprovados: 0, rejeitados: 0, pendentes: 0, horas: 0 };
      e.total++;
      if (c.status === "aprovado") { e.aprovados++; e.horas += c.horasAprovadas || 0; }
      else if (c.status === "rejeitado") e.rejeitados++;
      else e.pendentes++;
      map.set(c.uid, e);
    });
    return map;
  }, [certificadosVisiveis]);

  // Aplica filtros de aluno, status, busca textual e ordenacao.
  const filtered = useMemo(() => {
    let r = [...certificadosVisiveis];
    if (alunoView) r = r.filter((c) => c.uid === alunoView);
    if (statusFilter !== "todos") r = r.filter((c) => c.status === statusFilter);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      r = r.filter((c) =>
        String(c.nomeAluno || "").toLowerCase().includes(q) ||
        String(c.emailAluno || "").toLowerCase().includes(q) ||
        String(c.nomeArquivo || "").toLowerCase().includes(q)
      );
    }
    const collator = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });
    if (sortOrder === "recente") r.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
    else if (sortOrder === "antigo") r.sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0));
    else if (sortOrder === "az") r.sort((a, b) => collator.compare(String(a.nomeAluno || ""), String(b.nomeAluno || "")));
    else if (sortOrder === "za") r.sort((a, b) => collator.compare(String(b.nomeAluno || ""), String(a.nomeAluno || "")));
    return r;
  }, [certificadosVisiveis, statusFilter, searchTerm, sortOrder, alunoView]);

  // Dados da pagina atual da tabela.
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated  = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Volta para a primeira pagina sempre que o resultado filtrado muda.
  useEffect(() => { setCurrentPage(1); }, [statusFilter, searchTerm, sortOrder, alunoView]);

  // Tela de carregamento enquanto autentica ou busca dados do usuario.
  if (authLoading || (user && !userData)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Evita renderizacao quando o redirecionamento de login ja foi iniciado.
  if (!user) return null;

  // Bloqueia acesso para usuarios sem papel administrativo.
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Acesso restrito</h1>
        <p className="text-center text-sm text-muted-foreground">Esta página é exclusiva para Coordenadores.</p>
        <Button variant="outline" onClick={() => navigate("/")}>Voltar</Button>
      </div>
    );
  }

  // Nome, iniciais e item ativo usados no cabecalho da interface.
  const displayName = userData?.nome || user.displayName || "Admin";
  const initials = displayName.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
  const activeItem = navItems.find((n) => n.id === activeSection)!;
  // Menu compartilhado entre a sidebar desktop e o menu lateral mobile.
  const renderSidebarContent = (isMobileSidebar = false) => (
    <>
      <div className="px-4 pt-5 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Menu</p>
      </div>

      <nav className="flex flex-col gap-0.5 px-2 flex-1">
        {navItems.map(({ id, label, icon: Icon }) => {
          // Identifica se este item corresponde a secao atualmente aberta.
          const isActive = activeSection === id;
          return (
            <button
              key={id}
              onClick={() => {
                setActiveSection(id);
                if (isMobileSidebar) setMobileMenuOpen(false);
              }}
              className={`
                group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
                transition-all duration-150 w-full text-left
                ${isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/70 hover:bg-muted hover:text-foreground"}
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
          <LogOut className="h-3.5 w-3.5" />Sair
        </Button>
      </div>
    </>
  );

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">

      {/* Header fixo com menu mobile, marca, notificacoes e dados do usuario. */}
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
                  <SheetTitle>Menu administrativo</SheetTitle>
                  <SheetDescription>Navegue entre dashboard e certificados.</SheetDescription>
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
                <Shield className="h-4 w-4" />
                Painel Administrativo
              </p>
              <p className="text-[11px] text-muted-foreground leading-tight">Análise de Horas Complementares</p>
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

      {/* Corpo da tela: sidebar + area principal. */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar fixa exibida em desktop. */}
        <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-card overflow-y-auto">
          {renderSidebarContent()}
        </aside>

        {/* Conteudo principal, trocado conforme a secao ativa. */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-[#F8FAFC]">
          {/* Cabecalho interno que mostra icone, titulo e descricao da secao atual. */}
          <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-[#F8FAFC]/95 px-5 py-4 backdrop-blur-sm sm:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50">
                {(() => { const Icon = activeItem.icon; return <Icon className="h-4 w-4 text-primary" />; })()}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold tracking-tight text-slate-950">
                  {activeSection === "dashboard" ? "Dashboard" : activeItem.label}
                </h1>
                <p className="mt-0.5 text-sm text-slate-500">
                  {activeSection === "dashboard" ? "Visão geral das horas complementares" : activeItem.description}
                </p>
              </div>
              </div>

              </div>
          </div>

          <div className="space-y-5 px-4 py-5 pb-8 sm:px-8 sm:py-6">

            {/* Dashboard com graficos e indicadores dos certificados visiveis. */}
            {activeSection === "dashboard" && (
              <AdminDashboardCharts certificados={certificadosVisiveis} loading={loading} cursoIds={cursoIdsAdmin} />
            )}
            {activeSection === "alunos" && (
              <AdminAlunosPorTurma cursoIds={cursoIdsAdmin} certificados={certificadosVisiveis} />
            )}
            {/* Dados do curso administrado, categorias e regras de horas complementares. */}
            {activeSection === "curso" && (
              <AdminCursoInfo cursoId={userData?.cursoId} cursoIds={cursoIdsAdmin} />
            )}

            {/* Area de certificados: filtros, abas de status, tabela e paginacao. */}
            {activeSection === "certificados" && (<>

              {/* Banner exibido quando a tabela esta filtrada para um aluno especifico. */}
              {alunoView && (() => {
                const al = alunosSummary.get(alunoView);
                return al ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border-l-4 border-l-secondary bg-card p-3 sm:p-4 shadow-sm">
                    <div className="text-sm min-w-0">
                      <span className="text-muted-foreground">Aluno: </span>
                      <span className="font-semibold text-foreground">{al.nome}</span>
                      <span className="text-muted-foreground block sm:inline"> — {al.total} envios, {al.horas}h aprovadas</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setAlunoView(null)} className="self-end sm:self-auto shrink-0">Limpar filtro</Button>
                  </div>
                ) : null;
              })()}

              {/* Filtros de busca textual e ordenacao da lista. */}
              <div className="rounded-xl border bg-card p-3 sm:p-4 shadow-sm">
                <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Buscar aluno, e-mail ou arquivo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
                  </div>
                  <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recente">Mais recente</SelectItem>
                      <SelectItem value="antigo">Mais antigo</SelectItem>
                      <SelectItem value="az">Aluno A-Z</SelectItem>
                    <SelectItem value="za">Aluno Z-A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Abas de status para filtrar rapidamente pendentes, aprovados e rejeitados. */}
              <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:flex">
                  <TabsTrigger value="todos"     className="text-xs sm:text-sm">Todos ({stats.total})</TabsTrigger>
                  <TabsTrigger value="pendente"  className="text-xs sm:text-sm">Pend. ({stats.pendentes})</TabsTrigger>
                  <TabsTrigger value="aprovado"  className="text-xs sm:text-sm">Aprov. ({stats.aprovados})</TabsTrigger>
                  <TabsTrigger value="rejeitado" className="text-xs sm:text-sm">Rej. ({stats.rejeitados})</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Tabela/lista responsiva de certificados filtrados. */}
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4">
                    <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/40" />
                    <p className="mt-4 text-base sm:text-lg font-bold text-foreground">Nenhum certificado encontrado</p>
                    <p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros ou aguarde novos envios</p>
                  </div>
                ) : (<>
                  {/* Versao mobile: cards empilhados com as informacoes principais. */}
                  {isMobile ? (
                    <div className="divide-y">
                      {paginated.map((cert) => {
                        const st = statusConfig[cert.status] || statusConfig.pendente;
                        return (
                          <div key={cert.id} className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <button onClick={() => setAlunoView(cert.uid)} className="text-left hover:underline">
                                  <p className="font-medium text-foreground text-sm truncate">{cert.nomeAluno}</p>
                                  <p className="text-xs text-muted-foreground truncate">{cert.emailAluno}</p>
                                </button>
                              </div>
                              <Badge variant="outline" className={`${st.className} shrink-0`}>{st.label}</Badge>
                            </div>
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <p className="truncate"><span className="text-foreground font-medium">{cert.nomeArquivo}</span></p>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                                <span>{formatDate(cert.createdAt)}</span>
                                <span>{formatFileSize(cert.tamanhoBytes)}</span>
                                {cert.horasAprovadas ? <span className="text-foreground font-medium">{cert.horasAprovadas}h</span> : null}
                              </div>
                              {cert.nomeAdmin && <p>Analisado por: {cert.nomeAdmin}</p>}
                            </div>
                            <Button variant="outline" size="sm" onClick={() => { setSelectedCert(cert); setModalOpen(true); }} className="w-full gap-1.5">
                              <Eye className="h-4 w-4" />Ver detalhes
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Versao desktop: tabela completa com colunas e acoes. */
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-primary/5">
                            <TableHead className="text-primary font-semibold">Aluno</TableHead>
                            <TableHead className="hidden md:table-cell text-primary font-semibold">Arquivo</TableHead>
                            <TableHead className="hidden sm:table-cell text-primary font-semibold">Data</TableHead>
                            <TableHead className="text-primary font-semibold">Status</TableHead>
                            <TableHead className="hidden lg:table-cell text-primary font-semibold">Horas</TableHead>
                            <TableHead className="hidden xl:table-cell text-primary font-semibold">Analisado por</TableHead>
                            <TableHead className="text-right text-primary font-semibold">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginated.map((cert) => {
                            const st = statusConfig[cert.status] || statusConfig.pendente;
                            return (
                              <TableRow key={cert.id} className="group hover:bg-muted/50 transition-colors">
                                <TableCell>
                                  <button onClick={() => setAlunoView(cert.uid)} className="text-left hover:underline">
                                    <p className="font-medium text-foreground text-sm">{cert.nomeAluno}</p>
                                    <p className="text-xs text-muted-foreground">{cert.emailAluno}</p>
                                  </button>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                  <p className="text-sm text-foreground truncate max-w-[200px]">{cert.nomeArquivo}</p>
                                  <p className="text-xs text-muted-foreground">{formatFileSize(cert.tamanhoBytes)}</p>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{formatDate(cert.createdAt)}</TableCell>
                                <TableCell><Badge variant="outline" className={st.className}>{st.label}</Badge></TableCell>
                                <TableCell className="hidden lg:table-cell text-sm font-medium text-foreground">{cert.horasAprovadas || "—"}</TableCell>
                                <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">{cert.nomeAdmin || "—"}</TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="sm" onClick={() => { setSelectedCert(cert); setModalOpen(true); }} className="gap-1.5">
                                    <Eye className="h-4 w-4" /><span className="hidden sm:inline">Detalhes</span>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Controles de paginacao exibidos apenas quando ha mais de uma pagina. */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t px-3 py-2.5 sm:px-4 sm:py-3">
                      <p className="text-xs sm:text-sm text-muted-foreground">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</p>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-xs sm:text-sm text-foreground min-w-[3rem] text-center">{currentPage}/{totalPages}</span>
                        <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>)}
              </div>
            </>)}
          </div>
        </main>
      </div>

      {/* Modal usado para visualizar o PDF e aprovar/rejeitar/reclassificar o certificado. */}
      <PdfViewerModal
        cert={selectedCert}
        open={modalOpen}
        onClose={closeCertificadoModal}
        onAprovar={handleAprovar}
        onRejeitar={handleRejeitar}
        onAtualizarCategoria={handleAtualizarCategoria}
      />
    </div>
  );
};

export default Admin;
