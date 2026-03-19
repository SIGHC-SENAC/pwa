import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, GraduationCap, Search } from "lucide-react";
import { auth } from "@/lib/firebase";

const API_BASE = "https://us-central1-pi-3p-tads049.cloudfunctions.net/app";

interface Coordenador {
  id: string;
  nome: string;
  email: string;
  role: string;
  createdAt?: number;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

async function fetchCoordenadores(): Promise<Coordenador[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/admins`, { headers });
  if (!res.ok) throw new Error("Erro ao buscar coordenadores");
  return res.json();
}

async function createCoordenador(payload: { nome: string; email: string }): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/admins`, {
    method: "POST", headers, body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Erro ao cadastrar coordenador");
  }
  return res.json();
}

async function updateCoordenador(id: string, payload: { nome?: string; email?: string }): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/admins/${id}`, {
    method: "PUT", headers, body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Erro ao atualizar coordenador");
  return res.json();
}

async function deleteCoordenador(id: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/admins/${id}`, {
    method: "DELETE", headers,
  });
  if (!res.ok) throw new Error("Erro ao excluir coordenador");
}

const SuperAdminCoordenadores: React.FC = () => {
  const [coordenadores, setCoordenadores] = useState<Coordenador[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Coordenador | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Coordenador | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");

  const loadCoordenadores = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCoordenadores();
      setCoordenadores(data);
    } catch (err) {
      toast.error("Erro ao carregar coordenadores.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCoordenadores(); }, [loadCoordenadores]);

  const openNew = () => { setEditing(null); setNome(""); setEmail(""); setDialogOpen(true); };
  const openEdit = (c: Coordenador) => { setEditing(c); setNome(c.nome); setEmail(c.email); setDialogOpen(true); };

  const handleSave = async () => {
    if (!nome.trim() || !email.trim()) { toast.error("Preencha todos os campos."); return; }
    setSaving(true);
    try {
      if (editing) {
        await updateCoordenador(editing.id, { nome: nome.trim(), email: email.trim() });
        toast.success("Coordenador atualizado.");
      } else {
        await createCoordenador({ nome: nome.trim(), email: email.trim() });
        toast.success("Coordenador cadastrado. Credenciais enviadas por e-mail.");
      }
      setDialogOpen(false);
      loadCoordenadores();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar coordenador.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCoordenador(deleteTarget.id);
      toast.success("Coordenador excluído.");
      setDeleteTarget(null);
      loadCoordenadores();
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir coordenador.");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = coordenadores.filter((c) => {
    const q = searchTerm.toLowerCase();
    return c.nome.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });

  function formatDate(ts?: number) {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Gestão de Coordenadores
          </h2>
          <p className="text-sm text-muted-foreground">
            Coordenadores têm acesso ao painel de aprovação de certificados e usuários.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Novo Coordenador
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar coordenador..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

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
                {coordenadores.length === 0 ? "Nenhum coordenador cadastrado." : "Nenhum resultado encontrado."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-primary/5">
                  <TableHead className="text-primary font-semibold">Nome</TableHead>
                  <TableHead className="text-primary font-semibold">E-mail</TableHead>
                  <TableHead className="hidden sm:table-cell text-primary font-semibold">Cadastrado em</TableHead>
                  <TableHead className="w-[100px] text-right text-primary font-semibold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{c.email}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {formatDate(c.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(c)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Coordenador" : "Novo Coordenador"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nome completo</label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Prof. Ana Souza" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">E-mail institucional</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Ex: ana.souza@pe.senac.br" />
            </div>
            {!editing && (
              <p className="text-xs text-muted-foreground bg-muted rounded-lg p-3">
                Uma senha temporária será gerada e enviada ao e-mail informado. O coordenador deverá redefini-la no primeiro acesso.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir coordenador?</AlertDialogTitle>
            <AlertDialogDescription>
              O coordenador <strong>{deleteTarget?.nome}</strong> perderá todo o acesso ao sistema. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SuperAdminCoordenadores;
