import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { auth, db } from "@/lib/firebase";
import { CertificadoMeta, formatFileSize } from "@/services/certificadoService";
import {
  fetchCertificadosPaged,
  aprovarCertificado,
  rejeitarCertificado,
  atualizarCategoriaCertificado,
} from "@/services/adminService";
import PdfViewerModal from "@/components/PdfViewerModal";
import AdminDashboardCharts from "@/components/AdminDashboardCharts";
import AdminAlunosPorTurma from "@/components/AdminAlunosPorTurma";
import AdminCursoInfo from "@/components/AdminCursoInfo";
import { fetchAlunos, type Curso } from "@/services/cursoService";
import { fetchTurmas, type Turma } from "@/services/turmaService";
import { cn } from "@/lib/utils";
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
  ArrowLeft,
  Clock,
  Layers3,
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

// Formata timestamp para uma data curta em portugues.
// Aceita Firestore Timestamp { seconds }, numero em ms (Date.now()) ou numero em segundos.
function formatDate(ts: { seconds: number } | number | null | undefined): string {
  if (!ts) return "—";
  const ms = typeof ts === "number"
    ? (ts > 1e10 ? ts : ts * 1000)
    : ts.seconds * 1000;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}


// Extrai segundos de um timestamp independente do formato (Firestore Timestamp ou numero).
function toSeconds(ts: any): number {
  if (!ts) return 0;
  if (typeof ts === "number") return ts > 1e10 ? ts / 1000 : ts;
  if (typeof ts.seconds === "number") return ts.seconds;
  return 0;
}

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

  // Estados principais da pagina: secao ativa, modal e menu mobile.
  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  const [selectedCert, setSelectedCert] = useState<CertificadoMeta | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filtros e ordenacao (server-side); busca textual (client-side na pagina atual).
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [sortOrder, setSortOrder] = useState("recente");
  const [alunoView, setAlunoView] = useState<string | null>(null);

  // Estado da pagina atual de certificados (cursor Firestore).
  const [certPage, setCertPage] = useState<CertificadoMeta[]>([]);
  const [certLoading, setCertLoading] = useState(false);
  const [certCursor, setCertCursor] = useState<string | null>(null);
  const [certCursorStack, setCertCursorStack] = useState<Array<string | null>>([]);
  const [certHasMore, setCertHasMore] = useState(false);
  const [certPageNum, setCertPageNum] = useState(1);

  // Contagens para as abas (via agregacao Firestore, sem carregar todos os docs).
  const [stats, setStats] = useState({ total: 0, pendentes: 0, aprovados: 0, rejeitados: 0 });

  // Navegacao por curso/turma na secao de certificados.
  const [certNavStep, setCertNavStep] = useState<"curso" | "turma" | "lista">("curso");
  const [certNavCurso, setCertNavCurso] = useState<Curso | null>(null);
  const [certNavTurma, setCertNavTurma] = useState<Turma | null>(null);
  const [certNavTurmas, setCertNavTurmas] = useState<Turma[]>([]);
  const [certNavAlunoIds, setCertNavAlunoIds] = useState<Set<string> | null>(null);
  const [certNavLoading, setCertNavLoading] = useState(false);

  // Cinco ultimos certificados recebidos (painel lateral direito).
  const [recentCerts, setRecentCerts] = useState<CertificadoMeta[]>([]);

  // Lista de cursos sob responsabilidade do admin/coordenador.
  const cursoIdsAdmin = useMemo(() => {
    return userData?.cursoIds?.length ? userData.cursoIds : userData?.cursoId ? [userData.cursoId] : [];
  }, [userData?.cursoId, userData?.cursoIds]);

  const isSuperAdmin = userData?.role === "superAdmin";

  // Carrega uma pagina de certificados do Firestore com cursor.
  const loadCertPage = useCallback(async (afterId: string | null = null) => {
    if (!isAdmin) return;
    setCertLoading(true);
    try {
      const sortField = sortOrder === "az" || sortOrder === "za" ? "nomeAluno" : "createdAt";
      const sortDir = sortOrder === "antigo" || sortOrder === "az" ? "asc" : "desc";
      // Se ha curso selecionado na nav, filtra apenas por ele; senao usa todos os cursos do admin.
      const cursoIds = certNavCurso?.id ? [certNavCurso.id] : (isSuperAdmin ? [] : cursoIdsAdmin);

      const result = await fetchCertificadosPaged({
        startAfterId: afterId ?? undefined,
        uidFilter: alunoView,
        turmaId: certNavTurma?.id ?? null,
        cursoIds,
        sortField,
        sortDir,
      });

      setCertPage(result.certs);
      setCertCursor(result.lastId);
      setCertHasMore(result.hasMore);
      setStats({
        total:     result.certs.length,
        pendentes: result.certs.filter((c) => c.status === "pendente").length,
        aprovados: result.certs.filter((c) => c.status === "aprovado").length,
        rejeitados: result.certs.filter((c) => c.status === "rejeitado").length,
      });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar certificados.");
    } finally {
      setCertLoading(false);
    }
  }, [isAdmin, isSuperAdmin, cursoIdsAdmin, sortOrder, alunoView, certNavCurso, certNavTurma]);

  // Redireciona para login quando a sessao nao existe.
  useEffect(() => {
    if (!authLoading && !user) {
      const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
      navigate(`/login?redirect=${redirect}`);
    }
  }, [authLoading, location.pathname, location.search, navigate, user]);

  // Carrega a primeira pagina ao autenticar.
  useEffect(() => {
    if (user && isAdmin) {
      setCertCursorStack([]);
      setCertPageNum(1);
      loadCertPage(null);
    }
  }, [user, isAdmin, loadCertPage]);

  // Recarrega do inicio quando filtros, ordenacao ou curso/turma selecionados mudam.
  useEffect(() => {
    setCertCursorStack([]);
    setCertCursor(null);
    setCertPageNum(1);
    loadCertPage(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortOrder, alunoView, certNavCurso, certNavTurma]);

  // Carrega os 5 ultimos recebidos para o painel lateral (independente da nav).
  useEffect(() => {
    if (!isAdmin) return;
    const cursoIds = isSuperAdmin ? [] : cursoIdsAdmin;
    fetchCertificadosPaged({ sortField: "createdAt", sortDir: "desc", cursoIds })
      .then((r) => setRecentCerts(r.certs.slice(0, 5)))
      .catch(() => {});
  }, [isAdmin, isSuperAdmin, cursoIdsAdmin]);

  // Seleciona um curso na navegacao de certificados.
  const handleCertNavSelectCurso = useCallback(async (curso: Curso) => {
    setCertNavCurso(curso);
    setCertNavTurma(null);
    setCertNavAlunoIds(null);
    setCertNavStep("turma");
    setCertNavLoading(true);
    try {
      const turmas = await fetchTurmas(curso.id!);
      setCertNavTurmas(turmas);
    } catch {
      toast.error("Erro ao carregar turmas.");
    } finally {
      setCertNavLoading(false);
    }
  }, []);

  // Seleciona uma turma (null = todos os alunos do curso).
  const handleCertNavSelectTurma = useCallback(async (turma: Turma | null) => {
    setCertNavTurma(turma);
    setCertNavStep("lista");
    if (!turma || !certNavCurso?.id) { setCertNavAlunoIds(null); return; }
    try {
      const alunos = await fetchAlunos(certNavCurso.id!);
      const ids = new Set(alunos.filter((a) => a.turmaId === turma.id).map((a) => a.id));
      setCertNavAlunoIds(ids);
    } catch {
      setCertNavAlunoIds(null);
    }
  }, [certNavCurso]);

  // Volta para selecao de curso.
  const handleCertNavBackToCurso = useCallback(() => {
    setCertNavStep("curso");
    setCertNavCurso(null);
    setCertNavTurma(null);
    setCertNavAlunoIds(null);
    setCertNavTurmas([]);
  }, []);

  // Volta para selecao de turma.
  const handleCertNavBackToTurma = useCallback(() => {
    setCertNavStep("turma");
    setCertNavTurma(null);
    setCertNavAlunoIds(null);
  }, []);

  // Auto-navega para selecao de turma quando ha apenas 1 curso disponivel.
  useEffect(() => {
    if (activeSection !== "certificados" || certNavStep !== "curso") return;
    const navCursos = (userData?.cursos ?? []).filter((c) => isSuperAdmin || cursoIdsAdmin.includes(c.id));
    if (navCursos.length === 1) {
      handleCertNavSelectCurso({
        id: navCursos[0].id,
        nome: navCursos[0].nome,
        codigo: navCursos[0].codigo ?? navCursos[0].id,
        cargaHorariaComplementar: 0,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, userData?.cursos]);

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

  // Abre diretamente um certificado por link com ?certificadoId=...
  useEffect(() => {
    const certificadoId = searchParams.get("certificadoId");
    if (!certificadoId || certLoading || !isAdmin) return;

    const fromPage = certPage.find((item) => item.id === certificadoId);
    if (fromPage) {
      setActiveSection("certificados");
      setSelectedCert(fromPage);
      setModalOpen(true);
      return;
    }
    // Certificado nao esta na pagina atual: busca diretamente pelo ID.
    getDoc(doc(db, "certificados_horas_complementares", certificadoId)).then((snap) => {
      if (!snap.exists()) return;
      setActiveSection("certificados");
      setSelectedCert({ id: snap.id, ...snap.data() } as CertificadoMeta);
      setModalOpen(true);
    });
  }, [certPage, certLoading, isAdmin, searchParams]);

  // Apos aprovar/rejeitar: recarrega pagina atual.
  const refreshAfterAction = useCallback(async () => {
    const prevCursor = certCursorStack.length > 0 ? certCursorStack[certCursorStack.length - 1] : null;
    await loadCertPage(prevCursor);
  }, [certCursorStack, loadCertPage]);

  const handleAprovar = async (certId: string, horas: number, obs: string) => {
    if (!user || !userData) return;
    await aprovarCertificado(certId, user.uid, userData.nome || user.displayName || "Admin", horas, obs);
    await refreshAfterAction();
  };

  const handleRejeitar = async (certId: string, motivo: string, obs: string) => {
    if (!user || !userData) return;
    await rejeitarCertificado(certId, user.uid, userData.nome || user.displayName || "Admin", motivo, obs);
    await refreshAfterAction();
  };

  const handleAtualizarCategoria = async (certId: string, categoriaId: string | null, categoriaNome: string | null) => {
    await atualizarCategoriaCertificado(certId, categoriaId, categoriaNome);
    setSelectedCert((current) =>
      current?.id === certId ? { ...current, categoriaId, categoriaNome } : current
    );
  };

  // Consolida dados do aluno a partir da pagina atual (usado no banner alunoView).
  const alunosSummary = useMemo(() => {
    const map = new Map<string, { nome: string; email: string; total: number; aprovados: number; rejeitados: number; pendentes: number; horas: number }>();
    certPage.forEach((c) => {
      const e = map.get(c.uid) || { nome: c.nomeAluno, email: c.emailAluno, total: 0, aprovados: 0, rejeitados: 0, pendentes: 0, horas: 0 };
      e.total++;
      if (c.status === "aprovado") { e.aprovados++; e.horas += c.horasAprovadas || 0; }
      else if (c.status === "rejeitado") e.rejeitados++;
      else e.pendentes++;
      map.set(c.uid, e);
    });
    return map;
  }, [certPage]);

  // Aplica filtros de aluno, status, busca textual e ordenacao.
  // Filtra a pagina atual por turma (client-side) e pelo termo de busca.
  const filtered = useMemo(() => {
    let r = certNavAlunoIds ? certPage.filter((c) => certNavAlunoIds.has(c.uid)) : certPage;
    if (statusFilter && statusFilter !== "todos")
      r = r.filter((c) => c.status === statusFilter);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      r = r.filter((c) =>
        String(c.nomeAluno || "").toLowerCase().includes(q) ||
        String(c.emailAluno || "").toLowerCase().includes(q) ||
        String(c.nomeArquivo || "").toLowerCase().includes(q)
      );
    }
    return r;
  }, [certPage, certNavAlunoIds, statusFilter, searchTerm]);

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

            {/* Dashboard com graficos e indicadores; busca proprios dados. */}
            {activeSection === "dashboard" && (
              <AdminDashboardCharts cursoIds={cursoIdsAdmin} />
            )}
            {activeSection === "alunos" && (
              <AdminAlunosPorTurma cursoIds={cursoIdsAdmin} />
            )}
            {/* Dados do curso administrado, categorias e regras de horas complementares. */}
            {activeSection === "curso" && (
              <AdminCursoInfo cursoId={userData?.cursoId} cursoIds={cursoIdsAdmin} />
            )}

            {/* Area de certificados: navegacao por curso/turma + tabela + painel lateral. */}
            {activeSection === "certificados" && (<>

              {/* Layout de duas colunas: nav+lista (esquerda) e ultimos recebidos (direita). */}
              <div className="flex flex-col lg:flex-row gap-5 items-start">

                {/* ── COLUNA ESQUERDA: navegacao + lista ────────────────────────── */}
                <div className="flex-1 min-w-0 space-y-4">

                  {/* STEP: selecao de curso */}
                  {certNavStep === "curso" && (() => {
                    const navCursos = (userData?.cursos ?? []).filter(c =>
                      isSuperAdmin || cursoIdsAdmin.includes(c.id)
                    );
                    if (navCursos.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
                          <FileText className="h-10 w-10 text-muted-foreground/40" />
                          <p className="mt-4 text-sm font-medium text-foreground">Nenhum curso vinculado</p>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-foreground">Selecione o curso</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {navCursos.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => handleCertNavSelectCurso({ id: c.id, nome: c.nome, codigo: c.codigo ?? c.id, cargaHorariaComplementar: 0 })}
                              className="group flex items-start gap-3 rounded-2xl border bg-card p-4 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                                <BookOpen className="h-4 w-4 text-primary" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{c.codigo ?? c.id}</p>
                                <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{c.nome}</p>
                              </div>
                              <ChevronRight className="h-4 w-4 shrink-0 self-center text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* STEP: selecao de turma */}
                  {certNavStep === "turma" && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleCertNavBackToCurso}>
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                          <p className="text-xs text-muted-foreground">{certNavCurso?.codigo}</p>
                          <p className="text-sm font-bold text-foreground">{certNavCurso?.nome}</p>
                        </div>
                      </div>
                      {certNavLoading ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}
                        </div>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {certNavTurmas
                            .slice()
                            .sort((a, b) => a.nome.localeCompare(b.nome))
                            .map((t) => (
                              <button
                                key={t.id ?? t.nome}
                                onClick={() => handleCertNavSelectTurma(t)}
                                className="group flex flex-col gap-2 rounded-2xl border bg-card p-4 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{t.nome}</p>
                                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                {t.horario && <p className="text-xs text-muted-foreground">{t.horario}</p>}
                                {t.periodoInicio && t.periodoFinal && (
                                  <p className="text-xs text-muted-foreground">{t.periodoInicio} a {t.periodoFinal}</p>
                                )}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP: lista de certificados */}
                  {certNavStep === "lista" && (<>

                    {/* Breadcrumb */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {certNavCurso && (
                        <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={handleCertNavBackToTurma}>
                          <ArrowLeft className="h-3 w-3" />
                          {certNavTurma ? certNavCurso.codigo : "Turmas"}
                        </Button>
                      )}
                      <span className="text-xs text-muted-foreground/50">/</span>
                      <span className="text-xs font-medium text-foreground">
                        {certNavTurma ? certNavTurma.nome : certNavCurso ? "Todas as turmas" : "Todos os cursos"}
                      </span>
                    </div>

                    {/* Banner de filtro por aluno */}
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

                    {/* Filtros de busca e ordenacao */}
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

                    {/* Abas de status */}
                    <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                      <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:flex">
                        <TabsTrigger value="todos"     className="text-xs sm:text-sm">Todos ({stats.total})</TabsTrigger>
                        <TabsTrigger value="pendente"  className="text-xs sm:text-sm">Pend. ({stats.pendentes})</TabsTrigger>
                        <TabsTrigger value="aprovado"  className="text-xs sm:text-sm">Aprov. ({stats.aprovados})</TabsTrigger>
                        <TabsTrigger value="rejeitado" className="text-xs sm:text-sm">Rej. ({stats.rejeitados})</TabsTrigger>
                      </TabsList>
                    </Tabs>

                    {/* Tabela/lista de certificados */}
                    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                      {certLoading ? (
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
                        {isMobile ? (
                          <div className="divide-y">
                            {filtered.map((cert) => {
                              const st = statusConfig[cert.status] || statusConfig.pendente;
                              return (
                                <div key={cert.id} className="p-4 space-y-2.5">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <button onClick={() => setAlunoView(cert.uid)} className="text-left hover:underline">
                                        <p className="font-medium text-foreground text-sm truncate">{cert.nomeAluno || cert.emailAluno || "—"}</p>
                                        {cert.nomeAluno && <p className="text-xs text-muted-foreground truncate">{cert.emailAluno}</p>}
                                      </button>
                                    </div>
                                    <Badge variant="outline" className={`${st.className} shrink-0`}>{st.label}</Badge>
                                  </div>
                                  <div className="space-y-0.5 text-xs text-muted-foreground">
                                    <p className="truncate font-medium text-foreground">{cert.nomeArquivo}</p>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                      <span>{formatDate(cert.createdAt)}</span>
                                      {cert.horasAprovadas ? <span className="font-semibold text-foreground">{cert.horasAprovadas}h aprovadas</span> : null}
                                    </div>
                                  </div>
                                  <Button variant="outline" size="sm" onClick={() => { setSelectedCert(cert); setModalOpen(true); }} className="w-full gap-1.5">
                                    <Eye className="h-4 w-4" />Ver detalhes
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <Table>
                              <colgroup>
                                <col className="w-[30%]" />
                                <col className="hidden sm:table-column w-[28%]" />
                                <col className="hidden md:table-column w-[17%]" />
                                <col className="w-[15%]" />
                                <col className="w-[10%]" />
                              </colgroup>
                              <TableHeader>
                                <TableRow className="bg-primary/5">
                                  <TableHead className="text-primary font-semibold">Aluno</TableHead>
                                  <TableHead className="hidden sm:table-cell text-primary font-semibold">Arquivo</TableHead>
                                  <TableHead className="hidden md:table-cell text-primary font-semibold">Data</TableHead>
                                  <TableHead className="text-primary font-semibold">Status</TableHead>
                                  <TableHead className="text-right text-primary font-semibold">Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filtered.map((cert) => {
                                  const st = statusConfig[cert.status] || statusConfig.pendente;
                                  const nomeExibido = cert.nomeAluno || cert.emailAluno || "—";
                                  return (
                                    <TableRow key={cert.id} className="group hover:bg-muted/50 transition-colors">
                                      <TableCell>
                                        <button onClick={() => setAlunoView(cert.uid)} className="text-left hover:underline w-full">
                                          <p className="font-medium text-foreground text-sm truncate">{nomeExibido}</p>
                                          {cert.nomeAluno && <p className="text-xs text-muted-foreground truncate">{cert.emailAluno}</p>}
                                        </button>
                                      </TableCell>
                                      <TableCell className="hidden sm:table-cell">
                                        <p className="text-sm text-foreground" title={cert.nomeArquivo}>
                                          {cert.nomeArquivo && cert.nomeArquivo.length > 22
                                            ? cert.nomeArquivo.slice(0, 22) + "…"
                                            : cert.nomeArquivo}
                                        </p>
                                      </TableCell>
                                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                        {formatDate(cert.createdAt)}
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className={st.className}>{st.label}</Badge>
                                      </TableCell>
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

                        {/* Paginacao cursor-based */}
                        {(certPageNum > 1 || certHasMore) && (
                          <div className="flex items-center justify-between border-t px-3 py-2.5 sm:px-4 sm:py-3">
                            <p className="text-xs sm:text-sm text-muted-foreground">Página {certPageNum}</p>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <Button variant="outline" size="icon" className="h-8 w-8" disabled={certPageNum === 1 || certLoading}
                                onClick={() => {
                                  const newStack = [...certCursorStack];
                                  newStack.pop();
                                  const prevCursor = newStack.length > 0 ? newStack[newStack.length - 1] : null;
                                  setCertCursorStack(newStack);
                                  setCertPageNum((p) => p - 1);
                                  loadCertPage(prevCursor);
                                }}>
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <span className="text-xs sm:text-sm text-foreground min-w-[2rem] text-center">{certPageNum}</span>
                              <Button variant="outline" size="icon" className="h-8 w-8" disabled={!certHasMore || certLoading}
                                onClick={() => {
                                  setCertCursorStack((s) => [...s, certCursor]);
                                  setCertPageNum((p) => p + 1);
                                  loadCertPage(certCursor);
                                }}>
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </>)}
                    </div>
                  </>)}
                </div>

                {/* ── COLUNA DIREITA: 5 ultimos recebidos ─────────────────────── */}
                <div className="w-full lg:w-64 xl:w-72 shrink-0">
                  <div className="rounded-2xl border bg-card shadow-sm overflow-hidden sticky top-20">
                    <div className="flex items-center gap-2.5 border-b bg-muted/30 px-4 py-3">
                      <Clock className="h-4 w-4 text-primary shrink-0" />
                      <p className="text-sm font-semibold text-foreground">Últimas recebidas</p>
                    </div>
                    {recentCerts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                        <FileText className="h-8 w-8 text-muted-foreground/30" />
                        <p className="mt-2 text-xs text-muted-foreground">Nenhum certificado recebido.</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {recentCerts.map((cert) => {
                          const st = statusConfig[cert.status] || statusConfig.pendente;
                          return (
                            <button
                              key={cert.id}
                              onClick={() => { setSelectedCert(cert); setModalOpen(true); if (certNavStep !== "lista") setCertNavStep("lista"); }}
                              className="flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/40 active:bg-muted/60"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-xs font-medium text-foreground">{cert.nomeAluno}</p>
                                <Badge variant="outline" className={cn("shrink-0 text-[10px] py-0 px-1.5", st.className)}>{st.label}</Badge>
                              </div>
                              <p className="truncate text-[11px] text-muted-foreground">{cert.nomeArquivo}</p>
                              <p className="text-[10px] text-muted-foreground">{formatDate(cert.createdAt)}</p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

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
