import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import { fetchAllCertificados, type CertificadoAdmin } from "@/services/adminCertificadoService";
import AdminSummaryCards from "@/components/admin/AdminSummaryCards";
import AdminFilters, { type FilterState } from "@/components/admin/AdminFilters";
import AdminCertificadoTable from "@/components/admin/AdminCertificadoTable";
import AdminDetailModal from "@/components/admin/AdminDetailModal";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, ShieldAlert, ShieldCheck, LogOut, RefreshCw } from "lucide-react";

const AdminAnalise: React.FC = () => {
  const { user, userData, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isAdmin = userData?.role === "admin";

  const [certificados, setCertificados] = useState<CertificadoAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCert, setSelectedCert] = useState<CertificadoAdmin | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    busca: "",
    status: "todos",
    ordenacao: "recente",
  });

  const loadData = useCallback(async (showToast = false) => {
    try {
      const data = await fetchAllCertificados();
      setCertificados(data);
      if (showToast) toast.success("Dados atualizados.");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar certificados.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user && isAdmin) loadData();
  }, [user, isAdmin, loadData]);

  const filtered = useMemo(() => {
    let result = [...certificados];

    // Status filter
    if (filters.status !== "todos") {
      result = result.filter((c) => c.status === filters.status);
    }

    // Search
    if (filters.busca.trim()) {
      const term = filters.busca.toLowerCase();
      result = result.filter(
        (c) =>
          c.nomeAluno.toLowerCase().includes(term) ||
          c.emailAluno.toLowerCase().includes(term) ||
          c.nomeArquivo.toLowerCase().includes(term)
      );
    }

    // Sort
    switch (filters.ordenacao) {
      case "antigo":
        result.sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0));
        break;
      case "nome-asc":
        result.sort((a, b) => a.nomeAluno.localeCompare(b.nomeAluno));
        break;
      case "nome-desc":
        result.sort((a, b) => b.nomeAluno.localeCompare(a.nomeAluno));
        break;
      default:
        result.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
    }

    return result;
  }, [certificados, filters]);

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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-foreground">Análise de Horas Complementares</h1>
              <p className="text-sm text-muted-foreground">Gerencie os certificados enviados pelos alunos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={refreshing}
              onClick={() => { setRefreshing(true); loadData(true); }}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
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
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <AdminSummaryCards certificados={certificados} />
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-5">
              <AdminFilters filters={filters} onChange={setFilters} />
              <AdminCertificadoTable certificados={filtered} onViewDetails={setSelectedCert} />
            </div>
          </>
        )}
      </main>

      <AdminDetailModal
        cert={selectedCert}
        open={!!selectedCert}
        onClose={() => setSelectedCert(null)}
        onUpdated={() => loadData()}
      />
    </div>
  );
};

export default AdminAnalise;
