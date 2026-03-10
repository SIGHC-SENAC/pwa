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
} from "lucide-react";

const statusConfig: Record<string, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-warning/15 text-warning border-warning/30" },
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

  // Summary stats
  const stats = useMemo(() => {
    const total = certificados.length;
    const pendentes = certificados.filter((c) => c.status === "pendente").length;
    const aprovados = certificados.filter((c) => c.status === "aprovado").length;
    const rejeitados = certificados.filter((c) => c.status === "rejeitado").length;
    const horasTotal = certificados.reduce((sum, c) => sum + (c.horasAprovadas || 0), 0);
    return { total, pendentes, aprovados, rejeitados, horasTotal };
  }, [certificados]);

  // Student grouping
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

  // Filtered & sorted
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
        <h1 className="font-serif text-2xl font-semibold text-foreground">Acesso restrito</h1>
        <p className="text-center text-sm text-muted-foreground">
          Esta página é exclusiva para administradores.
        </p>
        <Button variant="outline" onClick={() => navigate("/")}>Voltar</Button>
      </div>
    );
  }

  const summaryCards = [
    { label: "Total", value: stats.total, icon: FileText, color: "text-primary" },
    { label: "Pendentes", value: stats.pendentes, icon: Clock, color: "text-warning" },
    { label: "Aprovados", value: stats.aprovados, icon: CheckCircle2, color: "text-success" },
    { label: "Rejeitados", value: stats.rejeitados, icon: XCircle, color: "text-destructive" },
    { label: "Horas aprovadas", value: stats.horasTotal, icon: Award, color: "text-primary" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-foreground">Análise de Horas Complementares</h1>
              <p className="text-sm text-muted-foreground">Gerencie os certificados enviados pelos alunos</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => { await signOut(auth); navigate("/login"); }}
            className="gap-2 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {summaryCards.map((s) => (
            <Card key={s.label} className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Aluno View Banner */}
        {alunoView && (() => {
          const al = alunosSummary.get(alunoView);
          return al ? (
            <div className="flex items-center justify-between rounded-lg border bg-card p-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Filtrando por aluno: </span>
                <span className="font-semibold text-foreground">{al.nome}</span>
                <span className="text-muted-foreground"> — {al.total} envios, {al.horas}h aprovadas</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setAlunoView(null)}>Limpar filtro</Button>
            </div>
          ) : null;
        })()}

        {/* Filters */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por aluno, e-mail ou arquivo..."
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
          <TabsList>
            <TabsTrigger value="todos">Todos ({stats.total})</TabsTrigger>
            <TabsTrigger value="pendente">Pendentes ({stats.pendentes})</TabsTrigger>
            <TabsTrigger value="aprovado">Aprovados ({stats.aprovados})</TabsTrigger>
            <TabsTrigger value="rejeitado">Rejeitados ({stats.rejeitados})</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Table */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/40" />
              <p className="mt-4 font-serif text-lg font-medium text-foreground">Nenhum certificado encontrado</p>
              <p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros ou aguarde novos envios</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Aluno</TableHead>
                      <TableHead className="hidden md:table-cell">Arquivo</TableHead>
                      <TableHead className="hidden sm:table-cell">Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Horas</TableHead>
                      <TableHead className="hidden xl:table-cell">Analisado por</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((cert) => {
                      const st = statusConfig[cert.status] || statusConfig.pendente;
                      return (
                        <TableRow key={cert.id} className="group">
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-foreground">
                      {currentPage} / {totalPages}
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
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="font-serif text-lg font-semibold text-foreground">Resumo por aluno</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from(alunosSummary.entries()).map(([uid, al]) => (
                <button
                  key={uid}
                  onClick={() => setAlunoView(uid)}
                  className="text-left rounded-lg border p-4 transition-shadow hover:shadow-md bg-background"
                >
                  <p className="font-medium text-foreground text-sm">{al.nome}</p>
                  <p className="text-xs text-muted-foreground mb-2">{al.email}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-muted px-2 py-0.5">{al.total} envios</span>
                    <span className="rounded-full bg-success/15 text-success px-2 py-0.5">{al.aprovados} aprov.</span>
                    <span className="rounded-full bg-destructive/15 text-destructive px-2 py-0.5">{al.rejeitados} rej.</span>
                    <span className="rounded-full bg-warning/15 text-warning px-2 py-0.5">{al.pendentes} pend.</span>
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
