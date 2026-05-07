import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Shield, Search } from "lucide-react";
import {
  fetchAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  AdminUser,
} from "@/services/superAdminService";
import { Curso, fetchCursos } from "@/services/cursoService";

const SuperAdminAdmins: React.FC = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cursoIds, setCursoIds] = useState<string[]>([]);

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdmins();
      setAdmins(data);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar coordenadores.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCursos = useCallback(async () => {
    try {
      const data = await fetchCursos();
      setCursos(data);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar cursos.");
    }
  }, []);

  useEffect(() => {
    loadAdmins();
    loadCursos();
  }, [loadAdmins, loadCursos]);

  const getAdminCursoIds = (admin: AdminUser) => {
    return admin.cursoIds?.length ? admin.cursoIds : admin.cursoId ? [admin.cursoId] : [];
  };

  const cursosLabel = (admin: AdminUser) => {
    if (admin.cursos?.length) return admin.cursos.map((curso) => curso.codigo || curso.nome).join(", ");
    return admin.cursoNome || "Curso nao vinculado";
  };

  const toggleCurso = (id?: string) => {
    if (!id) return;
    setCursoIds((current) =>
      current.includes(id) ? current.filter((cursoId) => cursoId !== id) : [...current, id]
    );
  };

  const openNew = () => {
    setEditing(null);
    setNome("");
    setEmail("");
    setCursoIds([]);
    setDialogOpen(true);
  };

  const openEdit = (admin: AdminUser) => {
    setEditing(admin);
    setNome(admin.nome);
    setEmail(admin.email);
    setCursoIds(getAdminCursoIds(admin));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!nome.trim() || !email.trim() || cursoIds.length === 0) {
      toast.error("Preencha todos os campos.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateAdmin(editing.id, { nome: nome.trim(), cursoIds });
        toast.success("Coordenador atualizado.");
      } else {
        await createAdmin({ nome: nome.trim(), email: email.trim(), cursoIds });
        toast.success("Coordenador cadastrado. A senha temporaria foi enviada por e-mail.");
      }
      setDialogOpen(false);
      loadAdmins();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar admin.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdmin(deleteTarget.id);
      toast.success("Admin excluido.");
      setDeleteTarget(null);
      loadAdmins();
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir admin.");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = admins.filter((a) => {
    const q = searchTerm.toLowerCase();
    return (
      a.nome.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      cursosLabel(a).toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Shield className="h-5 w-5 text-primary" />
            Gestao de Coordenadores
          </h2>
          <p className="text-sm text-muted-foreground">
            Adicione e gerencie os coordenadores do sistema.
          </p>
        </div>
        <Button onClick={openNew} className="shrink-0 gap-2">
          <Plus className="h-4 w-4" />
          Novo Coordenador
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar admin..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
      </div>

      <Card className="overflow-hidden shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <Shield className="mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {admins.length === 0 ? "Nenhum coordenador cadastrado." : "Nenhum resultado encontrado."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Cursos</TableHead>
                  <TableHead className="w-[100px] text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{admin.email}</TableCell>
                    <TableCell className="text-muted-foreground">{cursosLabel(admin)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(admin)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(admin)}>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Coordenador" : "Novo Coordenador"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nome completo</label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Joao da Silva" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">E-mail</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex: joao@exemplo.com"
                disabled={!!editing}
              />
              {editing && (
                <p className="text-xs text-muted-foreground">
                  O e-mail do coordenador nao pode ser alterado apos o cadastro.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Cursos</label>
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-3">
                {cursos.filter((curso) => !!curso.id).map((curso) => (
                  <label key={curso.id} className="flex items-start gap-2 text-sm">
                    <Checkbox checked={cursoIds.includes(curso.id as string)} onCheckedChange={() => toggleCurso(curso.id)} />
                    <span>
                      <span className="font-medium text-foreground">{curso.nome}</span>
                      <span className="text-muted-foreground"> - {curso.codigo}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir coordenador?</AlertDialogTitle>
            <AlertDialogDescription>
              O coordenador <strong>{deleteTarget?.nome}</strong> sera removido permanentemente. Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SuperAdminAdmins;
