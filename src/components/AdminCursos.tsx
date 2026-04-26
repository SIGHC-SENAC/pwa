import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import {
  fetchCursos,
  createCurso,
  updateCurso,
  deleteCurso,
  Curso,
} from "@/services/cursoService";
import CourseRulesEditor from "@/components/CourseRulesEditor";

const CARGA_HORARIA_COMPLEMENTAR_PADRAO = 100;

const turnoLabel: Record<string, string> = {
  manhã: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
};

const turnoColor: Record<string, string> = {
  manhã: "bg-amber-100 text-amber-800 border-amber-200",
  tarde: "bg-sky-100 text-sky-800 border-sky-200",
  noite: "bg-indigo-100 text-indigo-800 border-indigo-200",
};

const AdminCursos: React.FC = () => {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Curso | null>(null);
  const [rulesTarget, setRulesTarget] = useState<Curso | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Curso | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [turno, setTurno] = useState<string>("manhã");

  const loadCursos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCursos();
      setCursos(data);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar cursos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCursos();
  }, [loadCursos]);

  const openNew = () => {
    setEditing(null);
    setNome("");
    setCodigo("");
    setTurno("manhã");
    setDialogOpen(true);
  };

  const openEdit = (curso: Curso) => {
    setEditing(curso);
    setNome(curso.nome);
    setCodigo(curso.codigo);
    setTurno(curso.turno);
    setDialogOpen(true);
  };

  const openRules = (curso: Curso) => {
    setRulesTarget(curso);
    setRulesDialogOpen(true);
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      toast.error("Preencha o nome do curso.");
      return;
    }
    setSaving(true);
    try {
      if (editing?.id) {
        const payload = {
          nome: nome.trim().toUpperCase(),
          codigo: codigo.trim(),
          turno: turno as Curso["turno"],
          cargaHorariaComplementar: editing.cargaHorariaComplementar ?? CARGA_HORARIA_COMPLEMENTAR_PADRAO,
        };
        await updateCurso(editing.id, payload);
        toast.success("Curso atualizado.");
      } else {
        const payload = {
          nome: nome.trim().toUpperCase(),
          turno: turno as Curso["turno"],
          cargaHorariaComplementar: CARGA_HORARIA_COMPLEMENTAR_PADRAO,
        };
        await createCurso(payload);
        toast.success("Curso cadastrado com código automático.");
      }
      setDialogOpen(false);
      loadCursos();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar curso.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      await deleteCurso(deleteTarget.id);
      toast.success("Curso excluído.");
      setDeleteTarget(null);
      loadCursos();
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir curso.");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = cursos.filter((c) => {
    const q = searchTerm.toLowerCase();
    return (
      c.nome.toLowerCase().includes(q) ||
      c.codigo.toLowerCase().includes(q) ||
      c.turno.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Gestão de Cursos
          </h2>
          <p className="text-sm text-muted-foreground">
            Cadastre e gerencie os cursos disponíveis.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Novo Curso
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar curso..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
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
              <BookOpen className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                {cursos.length === 0 ? "Nenhum curso cadastrado." : "Nenhum resultado encontrado."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead className="w-[132px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((curso) => (
                  <TableRow key={curso.id || curso.codigo}>
                    <TableCell className="font-medium">{curso.nome}</TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {curso.codigo}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={turnoColor[curso.turno] || ""}
                      >
                        {turnoLabel[curso.turno] || curso.turno}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openRules(curso)}>
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(curso)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(curso)}>
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Curso" : "Novo Curso"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nome do curso</label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Análise e Desenvolvimento de Sistemas" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Código</label>
              <Input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder={editing ? "Código do curso" : "Gerado automaticamente (5 dígitos)"}
                disabled={!editing}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Turno</label>
              <Select value={turno} onValueChange={setTurno}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manhã">Manhã</SelectItem>
                  <SelectItem value="tarde">Tarde</SelectItem>
                  <SelectItem value="noite">Noite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md bg-muted/60 border border-border/60 px-3 py-2 text-xs text-muted-foreground">
              Carga horária complementar: <span className="font-semibold text-foreground">{CARGA_HORARIA_COMPLEMENTAR_PADRAO}h</span> (padrão institucional)
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

      <Dialog open={rulesDialogOpen} onOpenChange={setRulesDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Regras de atividades do curso</DialogTitle>
          </DialogHeader>
          {rulesTarget && (
            <CourseRulesEditor
              curso={rulesTarget}
              onSaved={() => {
                setRulesDialogOpen(false);
                setRulesTarget(null);
                loadCursos();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir curso?</AlertDialogTitle>
            <AlertDialogDescription>
              O curso <strong>{deleteTarget?.nome}</strong> será removido permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2">
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminCursos;
