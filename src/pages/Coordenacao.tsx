import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import { collection, getDocs, query, where, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CertificadoMeta, formatFileSize } from "@/services/certificadoService";
import { fetchAllCertificados } from "@/services/adminService";
import PdfViewerModal from "@/components/PdfViewerModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  ShieldAlert,
  LogOut,
  Search,
  FileText,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  ChevronDown,
  Settings,
  LayoutDashboard,
  Users,
  ClipboardList,
  UserCheck,
  UserX,
  TrendingUp,
  Award,
  Clock,
  BookOpen,
  BarChart3,
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import SettingsDialog from "@/components/SettingsDialog";
import CoordDashboard from "@/components/CoordDashboard";
import CoordPendingUsers from "@/components/CoordPendingUsers";
import EmailVerificationBanner from "@/components/EmailVerificationBanner";
import { aprovarCertificado, rejeitarCertificado } from "@/services/adminService";

const senacLogo = "/senac-logo.png";

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

type TabType = "dashboard" | "certificados" | "usuarios-pendentes";

const Coordenacao: React.FC = () => {
  const { user, userData, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isCoordenador =
    userData?.role === "coordenador" ||
    userData?.role === "admin" ||
    userData?.role === "superAdmin";

  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [certificados, setCertificados] = useState<CertificadoMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState<CertificadoMeta | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [sortOrder, setSortOrder] = useState("recente");
  const [currentPage, setCurrentPage] = useState(1);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllCertificados();
      setCertificados(data);
    } catch (err) {
      toast.error("Erro ao carregar certificados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user && isCoordenador) loadData();
  }, [user, isCoordenador, loadData]);

  const handleAprovar = async (certId: string, horas: number, obs: string) => {
    if (!user || !userData) return;
    await aprovarCertificado(certId, user.uid, userData.nome || user.displayName || "Coordenador", horas, obs);
    await loadData();
  };

  const handleRejeitar = async (certId: string, motivo: string, obs: string) => {
    if (!user || !userData) return;
    await rejeitarCertificado(certId, user.uid, userData.nome || user.displayName || "Coordenador", motivo, obs);
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

  const filtered = useMemo(() => {
    let result = [...certificados];
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
  }, [certificados, statusFilter, searchTerm, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [statusFilter, searchTerm, sortOrder]);

  if (authLoading || (user && !userData)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  if (!isCoordenador) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Acesso restrito</h1>
        <p className="text-center text-sm text-muted-foreground">
          Esta página é exclusiva para coordenadores.
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
                <GraduationCap className="h-4 w-4" />
                Painel de Coordenação
              </p>
              <p className="text-[11px] text-muted-foreground leading-tight">
                Gestão de horas complementares
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <NotificationBell userId={user?.uid} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2 sm:px-3 h-auto py-1.5 hover:bg-muted">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <div className="hidden md:block text-left min-w-0">
                    <p className="text-sm font-medium text-foreground leading-tight truncate max-w-[160px]">
                      {userData?.nome || user.displayName || "Coordenador"}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-tight truncate max-w-[160px]">
                      {user.email}
                    </p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
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
        <EmailVerificationBanner />
        {/* Navigation Tabs */}
        <div className="flex gap-1 rounded-lg border bg-card p-1 shadow-sm">
          <Button
            variant={activeTab === "dashboard" ? "default" : "ghost"}
            size="sm"
            className="flex-1 sm:flex-none gap-2"
            onClick={() => setActiveTab("dashboard")}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Button>
          <Button
            variant={activeTab === "certificados" ? "default" : "ghost"}
            size="sm"
            className="flex-1 sm:flex-none gap-2 relative"
            onClick={() => setActiveTab("certificados")}
          >
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Certificados</span>
            {stats.pendentes > 0 && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {stats.pendentes > 9 ? "9+" : stats.pendentes}
              </span>
            )}
          </Button>
          <Button
            variant={activeTab === "usuarios-pendentes" ? "default" : "ghost"}
            size="sm"
            className="flex-1 sm:flex-none gap-2"
            onClick={() => setActiveTab("usuarios-pendentes")}
          >
            <UserCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Usuários</span>
          </Button>
        </div>

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <CoordDashboard certificados={certificados} loading={loading} />
        )}

        {/* Certificados Tab */}
        {activeTab === "certificados" && (
          <>
            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total", value: stats.total, icon: FileText, color: "text-primary" },
                { label: "Pendentes", value: stats.pendentes, icon: Clock, color: "text-secondary" },
                { label: "Aprovados", value: stats.aprovados, icon: CheckCircle2, color: "text-green-600" },
                { label: "Horas aprovadas", value: `${stats.horasTotal}h`, icon: Award, color: "text-blue-600" },
              ].map((s) => (
                <Card key={s.label} className="shadow-sm">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <p className="text-xl font-bold text-foreground">{s.value}</p>
                      </div>
                      <s.icon className={`h-6 w-6 ${s.color} opacity-70`} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

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

            {/* Table */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                  <FileText className="h-12 w-12 text-muted-foreground/40" />
                  <p className="mt-4 text-lg font-bold text-foreground">Nenhum certificado encontrado</p>
                  <p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros ou aguarde novos envios</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-primary/5">
                          <TableHead className="text-primary font-semibold">Aluno</TableHead>
                          <TableHead className="hidden md:table-cell text-primary font-semibold">Arquivo</TableHead>
                          <TableHead className="hidden sm:table-cell text-primary font-semibold">Data</TableHead>
                          <TableHead className="text-primary font-semibold">Status</TableHead>
                          <TableHead className="hidden lg:table-cell text-primary font-semibold">Horas</TableHead>
                          <TableHead className="text-right text-primary font-semibold">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginated.map((cert) => {
                          const st = statusConfig[cert.status] || statusConfig.pendente;
                          return (
                            <TableRow key={cert.id} className="hover:bg-muted/50 transition-colors">
                              <TableCell>
                                <p className="font-medium text-foreground text-sm">{cert.nomeAluno}</p>
                                <p className="text-xs text-muted-foreground">{cert.emailAluno}</p>
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

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t px-4 py-3">
                      <p className="text-sm text-muted-foreground">{filtered.length} resultado(s)</p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-foreground min-w-[3rem] text-center">{currentPage}/{totalPages}</span>
                        <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* Pending Users Tab */}
        {activeTab === "usuarios-pendentes" && <CoordPendingUsers />}
      </main>

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

export default Coordenacao;
