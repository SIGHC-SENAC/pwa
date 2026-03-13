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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  Search,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Award,
  Eye,
  ChevronLeft,
  ChevronRight,
  Shield,
  Users,
  User,
  ChevronDown,
  Settings,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
const senacLogo = "/senac-logo.png";
import NotificationBell from "@/components/NotificationBell";
import SettingsDialog from "@/components/SettingsDialog";

const statusConfig: Record<string, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-secondary/15 text-secondary border-secondary/30" },
  aprovado: { label: "Aprovado", className: "bg-success/15 text-success border-success/30" },
  rejeitado: { label: "Rejeitado", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

function formatDate(ts: { seconds: number } | null): string {
  if (!ts) return "—";
  return new Date(ts.seconds * 1000).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const ITEMS_PER_PAGE = 15;

const Admin: React.FC = () => {
  const { user, userData, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isAdmin = userData?.role === "admin";
  const isMobile = useIsMobile();

  const [certificados, setCertificados] = useState<CertificadoMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState<CertificadoMeta | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

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

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user && isAdmin) loadData();
  }, [user, isAdmin, loadData]);

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
    const total = certificados.length;
    const pendentes = certificados.filter((c) => c.status === "pendente").length;
    const aprovados = certificados.filter((c) => c.status === "aprovado").length;
    const rejeitados = certificados.filter((c) => c.status === "rejeitado").length;
    const horasTotal = certificados.reduce((sum, c) => sum + (c.horasAprovadas || 0), 0);
    return { total, pendentes, aprovados, rejeitados, horasTotal };
  }, [certificados]);

  const alunosSummary = useMemo(() => {
    const map = new Map<string, { nome: string; email: string; total: number; aprovados: number; rejeitados: number; pendentes: number; horas: number }>();
    certificados.forEach((c) => {
      const existing = map.get(c.uid) || { nome: c.nomeAluno, email: c.emailAluno, total: 0, aprovados: 0, rejeitados: 0, pendentes: 0, horas: 0 };
      existing.total++;
      if (c.status === "aprovado") { existing.aprovados++; existing.horas += c.horasAprovadas || 0; }
      else if (c.status === "rejeitado") existing.rejeitados++;
      else existing.pendentes++;
      map.set(c.uid, existing);
    });
    return map;
  }, [certificados]);

  const filtered = useMemo(() => {
    let result = [...certificados];
    if (alunoView) result = result.filter((c) => c.uid === alunoView);
    if (statusFilter !== "todos") result = result.filter((c) => c.status === statusFilter);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.nomeAluno.toLowerCase().includes(q) ||
          c.emailAluno.toLowerCase().includes(q) ||
          c.nomeArquivo.toLowerCase().includes(q)
      );
    }
    if (sortOrder === "recente") result.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
    else if (sortOrder === "antigo") result.sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0));
    else if (sortOrder === "az") result.sort((a, b) => a.nomeAluno.localeCompare(b.nomeAluno));
    return result;
  }, [certificados, statusFilter, searchTerm, sortOrder, alunoView]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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
        <p className="text-center text-sm text-muted-foreground">
          Esta página é exclusiva para administradores.
        </p>
        <Button variant="outline" onClick={() => navigate("/")}>Voltar</Button>
      </div>
    );
  }

  const summaryCards = [
    { label: "Total", value: stats.total, icon: FileText, bgColor: "bg-primary/10", iconColor: "text-primary" },
    { label: "Pendentes", value: stats.pendentes, icon: Clock, bgColor: "bg-secondary/10", iconColor: "text-secondary" },
    { label: "Aprovados", value: stats.aprovados, icon: CheckCircle2, bgColor: "bg-success/10", iconColor: "text-success" },
    { label: "Rejeitados", value: stats.rejeitados, icon: XCircle, bgColor: "bg-destructive/10", iconColor: "text-destructive" },
    { label: "Horas aprovadas", value: stats.horasTotal, icon: Award, bgColor: "bg-secondary/10", iconColor: "text-secondary" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6 sm:py-3">
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
                Painel Administrativo
              </p>
              <p className="text-[11px] text-muted-foreground leading-tight">
                Análise de Horas Complementares
              </p>
            </div>
          </div>

          {/* Right: Notification + User menu */}
          <div className="flex items-center gap-1">
            <NotificationBell userId={user?.uid} />
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 px-2 sm:px-3 h-auto py-1.5 hover:bg-muted"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  <Shield className="h-4 w-4" />
                </div>
                <div className="hidden md:block text-left min-w-0">
                  <p className="text-sm font-medium text-foreground leading-tight truncate max-w-[160px]">
                    {userData?.nome || user.displayName || "Admin"}
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
                <p className="text-sm font-medium text-foreground truncate">{userData?.nome || user.displayName || "Admin"}</p>
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
        {/* Accent bar */}
        <div className="h-0.5 bg-gradient-to-r from-primary via-primary to-secondary" />
      </header>

      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 space-y-4 sm:space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {summaryCards.map((s) => (
            <Card key={s.label} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                <div className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl ${s.bgColor}`}>
                  <s.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${s.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Aluno View Banner */}
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
              <Input
                placeholder="Buscar aluno, e-mail ou arquivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recente">Mais recente</SelectItem>
                <SelectItem value="antigo">Mais antigo</SelectItem>
                <SelectItem value="az">Aluno A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:flex">
            <TabsTrigger value="todos" className="text-xs sm:text-sm">Todos ({stats.total})</TabsTrigger>
            <TabsTrigger value="pendente" className="text-xs sm:text-sm">Pend. ({stats.pendentes})</TabsTrigger>
            <TabsTrigger value="aprovado" className="text-xs sm:text-sm">Aprov. ({stats.aprovados})</TabsTrigger>
            <TabsTrigger value="rejeitado" className="text-xs sm:text-sm">Rej. ({stats.rejeitados})</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Content */}
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
          ) : (
            <>
              {/* Mobile: Card layout */}
              {isMobile ? (
                <div className="divide-y">
                  {paginated.map((cert) => {
                    const st = statusConfig[cert.status] || statusConfig.pendente;
                    return (
                      <div key={cert.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <button
                              onClick={() => setAlunoView(cert.uid)}
                              className="text-left hover:underline"
                            >
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

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setSelectedCert(cert); setModalOpen(true); }}
                          className="w-full gap-1.5"
                        >
                          <Eye className="h-4 w-4" />
                          Ver detalhes
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Desktop: Table layout */
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
                              <button
                                onClick={() => setAlunoView(cert.uid)}
                                className="text-left hover:underline"
                              >
                                <p className="font-medium text-foreground text-sm">{cert.nomeAluno}</p>
                                <p className="text-xs text-muted-foreground">{cert.emailAluno}</p>
                              </button>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <p className="text-sm text-foreground truncate max-w-[200px]">{cert.nomeArquivo}</p>
                              <p className="text-xs text-muted-foreground">{formatFileSize(cert.tamanhoBytes)}</p>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                              {formatDate(cert.createdAt)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={st.className}>{st.label}</Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-sm font-medium text-foreground">
                              {cert.horasAprovadas || "—"}
                            </TableCell>
                            <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                              {cert.nomeAdmin || "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setSelectedCert(cert); setModalOpen(true); }}
                                className="gap-1.5"
                              >
                                <Eye className="h-4 w-4" />
                                <span className="hidden sm:inline">Detalhes</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-3 py-2.5 sm:px-4 sm:py-3">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
                  </p>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs sm:text-sm text-foreground min-w-[3rem] text-center">
                      {currentPage}/{totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Students Summary */}
        {!alunoView && alunosSummary.size > 0 && (
          <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-base sm:text-lg font-bold text-foreground">Resumo por aluno</h2>
            </div>
            <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from(alunosSummary.entries()).map(([uid, al]) => (
                <button
                  key={uid}
                  onClick={() => setAlunoView(uid)}
                  className="text-left rounded-lg border p-3 sm:p-4 transition-all hover:shadow-md hover:border-primary/30 bg-background"
                >
                  <p className="font-medium text-foreground text-sm truncate">{al.nome}</p>
                  <p className="text-xs text-muted-foreground mb-2 truncate">{al.email}</p>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                    <span className="rounded-full bg-muted px-2 py-0.5">{al.total} envios</span>
                    <span className="rounded-full bg-success/15 text-success px-2 py-0.5">{al.aprovados} aprov.</span>
                    <span className="rounded-full bg-destructive/15 text-destructive px-2 py-0.5">{al.rejeitados} rej.</span>
                    <span className="rounded-full bg-secondary/15 text-secondary px-2 py-0.5">{al.pendentes} pend.</span>
                    <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 font-medium">{al.horas}h</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      <PdfViewerModal
        cert={selectedCert}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedCert(null); }}
        onAprovar={handleAprovar}
        onRejeitar={handleRejeitar}
      />
    </div>
  );
};

export default Admin;
