import React, { useEffect, useState, useCallback } from "react";
import {
  collection, getDocs, query, where, doc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Search, UserCheck, UserX, GraduationCap, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface PendingUser {
  id: string;
  nome: string;
  email: string;
  role: string;
  cursoNome?: string;
  cursoId?: string;
  cursoCodigo?: string;
  createdAt?: number;
  aprovacaoStatus?: "pendente" | "aprovado" | "negado";
  aprovadoPor?: string;
  motivoNegacao?: string;
}

const CoordPendingUsers: React.FC = () => {
  const { userData, user } = useAuth();
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"pendente" | "todos">("pendente");

  const [approveTarget, setApproveTarget] = useState<PendingUser | null>(null);
  const [denyTarget, setDenyTarget] = useState<PendingUser | null>(null);
  const [denyReason, setDenyReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "users"), where("role", "==", "aluno"));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        aprovacaoStatus: d.data().aprovacaoStatus || "pendente",
      })) as PendingUser[];
      setUsers(list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    } catch (err) {
      toast.error("Erro ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleApprove = async () => {
    if (!approveTarget || !user || !userData) return;
    setProcessing(true);
    try {
      await updateDoc(doc(db, "users", approveTarget.id), {
        aprovacaoStatus: "aprovado",
        aprovadoPor: userData.nome || user.email,
        aprovadoEm: serverTimestamp(),
      });
      toast.success(`${approveTarget.nome} aprovado(a) com sucesso.`);
      setApproveTarget(null);
      loadUsers();
    } catch {
      toast.error("Erro ao aprovar usuário.");
    } finally {
      setProcessing(false);
    }
  };

  const handleDeny = async () => {
    if (!denyTarget || !user || !userData) return;
    setProcessing(true);
    try {
      await updateDoc(doc(db, "users", denyTarget.id), {
        aprovacaoStatus: "negado",
        aprovadoPor: userData.nome || user.email,
        aprovadoEm: serverTimestamp(),
        motivoNegacao: denyReason.trim() || "Sem motivo especificado",
      });
      toast.success(`${denyTarget.nome} negado(a).`);
      setDenyTarget(null);
      setDenyReason("");
      loadUsers();
    } catch {
      toast.error("Erro ao negar usuário.");
    } finally {
      setProcessing(false);
    }
  };

  const filtered = users.filter((u) => {
    if (filter === "pendente" && u.aprovacaoStatus !== "pendente") return false;
    const q = searchTerm.toLowerCase();
    return (
      u.nome.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.cursoNome || "").toLowerCase().includes(q)
    );
  });

  const statusCounts = {
    pendente: users.filter((u) => u.aprovacaoStatus === "pendente").length,
    aprovado: users.filter((u) => u.aprovacaoStatus === "aprovado").length,
    negado: users.filter((u) => u.aprovacaoStatus === "negado").length,
  };

  function formatDate(ts?: number) {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Gestão de Usuários
          </h2>
          <p className="text-sm text-muted-foreground">
            Aprove ou negue novos alunos cadastrados no sistema.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          {statusCounts.pendente > 0 && (
            <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/30 gap-1">
              <Clock className="h-3 w-3" />
              {statusCounts.pendente} pendente(s)
            </Badge>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pendentes", value: statusCounts.pendente, icon: Clock, color: "text-secondary", bg: "bg-secondary/10" },
          { label: "Aprovados", value: statusCounts.aprovado, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
          { label: "Negados", value: statusCounts.negado, icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
        ].map((s) => (
          <Card key={s.label} className="shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold text-foreground">{s.value}</p>
                </div>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.bg}`}>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou curso..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 rounded-lg border bg-card p-1">
          <Button
            variant={filter === "pendente" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("pendente")}
            className="gap-1.5"
          >
            <Clock className="h-3.5 w-3.5" />
            Pendentes
          </Button>
          <Button
            variant={filter === "todos" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("todos")}
          >
            Todos
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <GraduationCap className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                {filter === "pendente" ? "Nenhum usuário pendente de aprovação." : "Nenhum usuário encontrado."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-primary/5">
                  <TableHead className="text-primary font-semibold">Aluno</TableHead>
                  <TableHead className="hidden sm:table-cell text-primary font-semibold">Curso</TableHead>
                  <TableHead className="hidden md:table-cell text-primary font-semibold">Cadastrado em</TableHead>
                  <TableHead className="text-primary font-semibold">Status</TableHead>
                  <TableHead className="text-right text-primary font-semibold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <p className="font-medium text-foreground text-sm">{u.nome}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {u.cursoNome ? (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {u.cursoNome}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {formatDate(u.createdAt)}
                    </TableCell>
                    <TableCell>
                      {u.aprovacaoStatus === "aprovado" && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Aprovado
                        </Badge>
                      )}
                      {u.aprovacaoStatus === "negado" && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs gap-1">
                          <XCircle className="h-3 w-3" />
                          Negado
                        </Badge>
                      )}
                      {(u.aprovacaoStatus === "pendente" || !u.aprovacaoStatus) && (
                        <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/30 text-xs gap-1">
                          <Clock className="h-3 w-3" />
                          Pendente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {(u.aprovacaoStatus === "pendente" || !u.aprovacaoStatus) && (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => setApproveTarget(u)}
                          >
                            <UserCheck className="h-4 w-4" />
                            <span className="hidden sm:inline">Aprovar</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => { setDenyTarget(u); setDenyReason(""); }}
                          >
                            <UserX className="h-4 w-4" />
                            <span className="hidden sm:inline">Negar</span>
                          </Button>
                        </div>
                      )}
                      {u.aprovacaoStatus !== "pendente" && u.aprovacaoStatus && (
                        <span className="text-xs text-muted-foreground">
                          {u.motivoNegacao ? `"${u.motivoNegacao.slice(0, 30)}${u.motivoNegacao.length > 30 ? "…" : ""}"` : "—"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <AlertDialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprovar usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              O aluno <strong>{approveTarget?.nome}</strong> ({approveTarget?.email}) terá acesso liberado ao sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700 gap-2"
            >
              {processing && <Loader2 className="h-4 w-4 animate-spin" />}
              Aprovar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deny Dialog */}
      <Dialog open={!!denyTarget} onOpenChange={(open) => { if (!open) { setDenyTarget(null); setDenyReason(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <UserX className="h-5 w-5" />
              Negar acesso
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Você está negando o acesso de <strong className="text-foreground">{denyTarget?.nome}</strong> ao sistema.
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Motivo (opcional)</label>
              <Textarea
                value={denyReason}
                onChange={(e) => setDenyReason(e.target.value)}
                placeholder="Ex: E-mail não pertence à instituição, dados inválidos..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDenyTarget(null); setDenyReason(""); }}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleDeny}
              disabled={processing}
              className="gap-2"
            >
              {processing && <Loader2 className="h-4 w-4 animate-spin" />}
              Negar acesso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CoordPendingUsers;
