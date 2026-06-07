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
import { Loader2, Plus, Pencil, Trash2, Users2, Search, CalendarRange } from "lucide-react";
import { fetchTurmas, createTurma, updateTurma, deleteTurma, Turma } from "@/services/turmaService";
import { fetchCursos, Curso } from "@/services/cursoService";

const AdminTurmas: React.FC = () => {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCursos, setLoadingCursos] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroCursoId, setFiltroCursoId] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Turma | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Turma | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form
  const [nome, setNome] = useState("");
  const [cursoId, setCursoId] = useState("");
  const [horario, setHorario] = useState("");
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFinal, setPeriodoFinal] = useState("");

  const loadCursos = useCallback(async () => {
    setLoadingCursos(true);
    try {
      const data = await fetchCursos();
      setCursos(data);
    } catch {
      toast.error("Erro ao carregar cursos.");
    } finally {
      setLoadingCursos(false);
    }
  }, []);

  const loadTurmas = useCallback(async () => {
    setLoading(true);
    try {
      const cursoFilter = filtroCursoId === "todos" ? undefined : filtroCursoId;
      const data = await fetchTurmas(cursoFilter);
      setTurmas(data);
    } catch {
      toast.error("Erro ao carregar turmas.");
    } finally {
      setLoading(false);
    }
  }, [filtroCursoId]);

  useEffect(() => {
    loadCursos();
  }, [loadCursos]);

  useEffect(() => {
    loadTurmas();
  }, [loadTurmas]);

  const openNew = () => {
    setEditing(null);
    setNome("");
    setCursoId("");
    setHorario("");
    setPeriodoInicio("");
    setPeriodoFinal("");
    setDialogOpen(true);
  };

  const openEdit = (turma: Turma) => {
    setEditing(turma);
    setNome(turma.nome);
    setCursoId(turma.cursoId);
    setHorario(turma.horario);
    setPeriodoInicio(turma.periodoInicio);
    setPeriodoFinal(turma.periodoFinal);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!nome.trim() || !cursoId || !horario.trim() || !periodoInicio.trim() || !periodoFinal.trim()) {
      toast.error("Preencha todos os campos.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome: nome.trim(),
        cursoId,
        horario: horario.trim(),
        periodoInicio: periodoInicio.trim(),
        periodoFinal: periodoFinal.trim(),
      };
      if (editing?.id) {
        await updateTurma(editing.id, payload);
        toast.success("Turma atualizada.");
      } else {
        await createTurma(payload);
        toast.success("Turma cadastrada.");
      }
      setDialogOpen(false);
      loadTurmas();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar turma.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      await deleteTurma(deleteTarget.id);
      toast.success("Turma excluída.");
      setDeleteTarget(null);
      loadTurmas();
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir turma.");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = turmas.filter((t) => {
    const q = searchTerm.toLowerCase();
    return (
      t.nome.toLowerCase().includes(q) ||
      (t.cursoNome || "").toLowerCase().includes(q) ||
      (t.cursoCodigo || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Users2 className="h-5 w-5 text-primary" />
            Gestão de Turmas
          </h2>
          <p className="text-sm text-muted-foreground">
            Cadastre e gerencie as turmas vinculadas aos cursos.
          </p>
        </div>
        <Button onClick={openNew} disabled={loadingCursos || cursos.length === 0} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Nova Turma
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 max-w-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar turma..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtroCursoId} onValueChange={setFiltroCursoId}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Filtrar por curso" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os cursos</SelectItem>
            {cursos.map((c) => (
              <SelectItem key={c.id || c.codigo} value={c.id || c.codigo}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
              <Users2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                {turmas.length === 0 ? "Nenhuma turma cadastrada." : "Nenhum resultado encontrado."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Turma</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead className="hidden sm:table-cell">Horário</TableHead>
                  <TableHead className="hidden md:table-cell">Período</TableHead>
                  <TableHead className="w-[100px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((turma) => (
                  <TableRow key={turma.id}>
                    <TableCell className="font-medium">{turma.nome}</TableCell>
                    <TableCell>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {turma.cursoNome || turma.cursoCodigo || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                      {turma.horario}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="gap-1">
                        <CalendarRange className="h-3 w-3" />
                        {turma.periodoInicio} — {turma.periodoFinal}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(turma)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(turma)}>
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
            <DialogTitle>{editing ? "Editar Turma" : "Nova Turma"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nome da turma</label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Turma A - 2025" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Curso</label>
              {loadingCursos ? (
                <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando cursos...
                </div>
              ) : (
                <Select value={cursoId} onValueChange={setCursoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um curso" />
                  </SelectTrigger>
                  <SelectContent>
                    {cursos.map((c) => (
                      <SelectItem key={c.id || c.codigo} value={c.id || c.codigo}>
                        {c.nome} — {c.codigo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Horário</label>
              <Select value={horario} onValueChange={setHorario}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o horário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manhã — 08:00 às 12:10">Manhã — 08:00 às 12:10</SelectItem>
                  <SelectItem value="Tarde — 13:00 às 17:10">Tarde — 13:00 às 17:10</SelectItem>
                  <SelectItem value="Noite — 18:00 às 22:10">Noite — 18:00 às 22:10</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Período início</label>
                <Input value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} placeholder="Ex: 2025.1" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Período final</label>
                <Input value={periodoFinal} onChange={(e) => setPeriodoFinal(e.target.value)} placeholder="Ex: 2027.2" />
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir turma?</AlertDialogTitle>
            <AlertDialogDescription>
              A turma <strong>{deleteTarget?.nome}</strong> será removida permanentemente. Esta ação não pode ser desfeita.
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

export default AdminTurmas;
