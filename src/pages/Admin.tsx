import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import { CertificadoMeta, formatFileSize } from "@/services/certificadoService";
import {
  fetchAllCertificados,
  aprovarCertificado,
  rejeitarCertificado,
} from "@/services/adminService";
import PdfViewerModal from "@/components/PdfViewerModal";
import AdminDashboardCharts from "@/components/AdminDashboardCharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Settings,
  Building2,
  LayoutDashboard,
  ClipboardList,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import NotificationBell from "@/components/NotificationBell";
import SettingsDialog from "@/components/SettingsDialog";

const senacLogo = "/senac-logo.png";

type Section = "dashboard" | "certificados";

const navItems: { id: Section; label: string; icon: React.ElementType; description: string }[] = [
  { id: "dashboard",    label: "Dashboard",    icon: LayoutDashboard, description: "Visão geral e gráficos" },
  { id: "certificados", label: "Certificados", icon: ClipboardList,   description: "Análise de horas complementares" },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  pendente:  { label: "Pendente",  className: "bg-secondary/15 text-secondary border-secondary/30" },
  aprovado:  { label: "Aprovado",  className: "bg-success/15 text-success border-success/30" },
  rejeitado: { label: "Rejeitado", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

function formatDate(ts: { seconds: number } | null): string {
  if (!ts) return "—";
  return new Date(ts.seconds * 1000).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

const ITEMS_PER_PAGE = 15;

const Admin: React.FC = () => {
  const { user, userData, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isAdmin = userData?.role === "admin" || userData?.role === "superAdmin";
  const isMobile = useIsMobile();

  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  const [certificados, setCertificados] = useState<CertificadoMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState<CertificadoMeta | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [sortOrder, setSortOrder] = useState("recente");
  const [currentPage, setCurrentPage] = useState(1);
  const [alunoView, setAlunoView] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllCertificados();
      setCertificados(data);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar certificados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (!authLoading && !user) navigate("/login"); }, [authLoading, user, navigate]);
  useEffect(() => { if (user && isAdmin) loadData(); }, [user, isAdmin, loadData]);

  const handleAprovar = async (certId: string, horas: number, obs: string) => {
    if (!user || !userData) return;
    await aprovarCertificado(certId, user.uid, userData.nome || user.displayName || "Admin", horas, obs);
    await loadData();
  };

  const handleRejeitar = async (certId: string, motivo: string, obs: string) => {
    if (!user || !userData) return;
    await rejeitarCertificado(certId, user.uid, userData.nome || user.displayName || "Admin", motivo, obs);
    await loadData();
  };

  const stats = useMemo(() => {
    const total     = certificados.length;
    const pendentes = certificados.filter((c) => c.status === "pendente").length;
    const aprovados = certificados.filter((c) => c.status === "aprovado").length;
    const rejeitados= certificados.filter((c) => c.status === "rejeitado").length;
    const horasTotal= certificados.reduce((s, c) => s + (c.horasAprovadas || 0), 0);
    return { total, pendentes, aprovados, rejeitados, horasTotal };
  }, [certificados]);

  const alunosSummary = useMemo(() => {
    const map = new Map<string, { nome: string; email: string; total: number; aprovados: number; rejeitados: number; pendentes: number; horas: number }>();
    certificados.forEach((c) => {
      const e = map.get(c.uid) || { nome: c.nomeAluno, email: c.emailAluno, total: 0, aprovados: 0, rejeitados: 0, pendentes: 0, horas: 0 };
      e.total++;
      if (c.status === "aprovado") { e.aprovados++; e.horas += c.horasAprovadas || 0; }
      else if (c.status === "rejeitado") e.rejeitados++;
      else e.pendentes++;
      map.set(c.uid, e);
    });
    return map;
  }, [certificados]);

  const filtered = useMemo(() => {
    let r = [...certificados];
    if (alunoView) r = r.filter((c) => c.uid === alunoView);
    if (statusFilter !== "todos") r = r.filter((c) => c.status === statusFilter);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      r = r.filter((c) =>
        c.nomeAluno.toLowerCase().includes(q) ||
        c.emailAluno.toLowerCase().includes(q) ||
        c.nomeArquivo.toLowerCase().includes(q)
      );
    }
    if (sortOrder === "recente") r.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
    else if (sortOrder === "antigo") r.sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0));
    else if (sortOrder === "az") r.sort((a, b) => a.nomeAluno.localeCompare(b.nomeAluno));
    return r;
  }, [certificados, statusFilter, searchTerm, sortOrder, alunoView]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated  = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  useEffect(() => { setCurrentPage(1); }, [statusFilter, searchTerm, sortOrder, alunoView]);

  if (authLoading || (user && !userData)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

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

  const displayName = userData?.nome || user.displayName || "Admin";
  const initials = displayName.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
  const activeItem = navItems.find((n) => n.id === activeSection)!;

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b bg-card shadow-sm shrink-0">
        <div className="flex items-center justify-between px-4 py-2.5 sm:px-6 sm:py-3">
          <div className="flex items-center gap-3 min-w-0">
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
              <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="hidden sm:inline text-sm font-medium text-foreground">Faculdade Senac PE</span>
            </div>
          </div>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-primary via-primary to-secondary" />
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar (desktop) ── */}
        <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-card overflow-y-auto">
          <div className="px-4 pt-5 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Menu</p>
          </div>

          <nav className="flex flex-col gap-0.5 px-2 flex-1">
            {navItems.map(({ id, label, icon: Icon }) => {
              const isActive = activeSection === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveSection(id)}
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

          {/* User footer */}
          <div className="px-3 pb-4">
            <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate">{displayName}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <div className="mt-2 flex gap-1.5">
              <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5" onClick={() => setSettingsOpen(true)}>
                <Settings className="h-3.5 w-3.5" />Config.
              </Button>
              <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5" onClick={async () => { await signOut(auth); navigate("/login"); }}>
                <LogOut className="h-3.5 w-3.5" />Sair
              </Button>
            </div>
          </div>
        </aside>

        {/* ── Mobile nav (bottom bar) ── */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t bg-card shadow-[0_-1px_8px_rgba(0,0,0,0.08)]">
          <div className="flex">
            {navItems.map(({ id, label, icon: Icon }) => {
              const isActive = activeSection === id;
              return (
                <button key={id} onClick={() => setActiveSection(id)} className="flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors">
                  <Icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-[10px] font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-background">
          {/* Sticky page heading */}
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

          <div className="px-4 py-5 sm:px-8 sm:py-6 pb-24 md:pb-8 space-y-4 sm:space-y-6">

            {/* ── Dashboard ── */}
            {activeSection === "dashboard" && (
              <AdminDashboardCharts certificados={certificados} loading={loading} />
            )}

            {/* ── Certificados ── */}
            {activeSection === "certificados" && (<>

              {/* Aluno view banner */}
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

              {/* Filters */}
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
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Status tabs */}
              <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:flex">
                  <TabsTrigger value="todos"     className="text-xs sm:text-sm">Todos ({stats.total})</TabsTrigger>
                  <TabsTrigger value="pendente"  className="text-xs sm:text-sm">Pend. ({stats.pendentes})</TabsTrigger>
                  <TabsTrigger value="aprovado"  className="text-xs sm:text-sm">Aprov. ({stats.aprovados})</TabsTrigger>
                  <TabsTrigger value="rejeitado" className="text-xs sm:text-sm">Rej. ({stats.rejeitados})</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Table */}
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

      <PdfViewerModal
        cert={selectedCert}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedCert(null); }}
        onAprovar={handleAprovar}
        onRejeitar={handleRejeitar}
      />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};

export default Admin;
