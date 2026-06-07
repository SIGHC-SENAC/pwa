import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Users2,
  Search,
  CalendarRange,
  ArrowLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { fetchTurmas, createTurma, updateTurma, deleteTurma, Turma } from "@/services/turmaService";
import { fetchCursos, Curso } from "@/services/cursoService";
import { cn } from "@/lib/utils";

type Step = "curso" | "turmas";

const AdminTurmas: React.FC = () => {
  const [step, setStep] = useState<Step>("curso");
  const [selectedCurso, setSelectedCurso] = useState<Curso | null>(null);

  const [cursos, setCursos] = useState<Curso[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);

  const [loadingCursos, setLoadingCursos] = useState(true);
  const [loadingTurmas, setLoadingTurmas] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Turma | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Turma | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [nome, setNome] = useState("");
  const [horario, setHorario] = useState("");
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFinal, setPeriodoFinal] = useState("");

  const loadCursos = useCallback(async () => {
    setLoadingCursos(true);
    try {
      setCursos(await fetchCursos());
    } catch {
      toast.error("Erro ao carregar cursos.");
    } finally {
      setLoadingCursos(false);
    }
  }, []);

  const loadTurmas = useCallback(async (cId: string) => {
    setLoadingTurmas(true);
    try {
      setTurmas(await fetchTurmas(cId));
    } catch {
      toast.error("Erro ao carregar turmas.");
    } finally {
      setLoadingTurmas(false);
    }
  }, []);

  useEffect(() => { loadCursos(); }, [loadCursos]);

  const selectCurso = (curso: Curso) => {
    setSelectedCurso(curso);
    setStep("turmas");
    setSearchTerm("");
    if (curso.id) loadTurmas(curso.id);
  };

  const goBack = () => {
    setStep("curso");
    setSelectedCurso(null);
    setTurmas([]);
    setSearchTerm("");
  };

  const openNew = () => {
    setEditing(null);
    setNome("");
    setHorario("");
    setPeriodoInicio("");
    setPeriodoFinal("");
    setDialogOpen(true);
  };

  const openEdit = (turma: Turma) => {
    setEditing(turma);
    setNome(turma.nome);
    setHorario(turma.horario);
    setPeriodoInicio(turma.periodoInicio);
    setPeriodoFinal(turma.periodoFinal);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!nome.trim() || !horario || !periodoInicio.trim() || !periodoFinal.trim()) {
      toast.error("Preencha todos os campos.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome: nome.trim(),
        cursoId: selectedCurso!.id!,
        horario,
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
      if (selectedCurso?.id) loadTurmas(selectedCurso.id);
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
      if (selectedCurso?.id) loadTurmas(selectedCurso.id);
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir turma.");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return turmas;
    const q = searchTerm.toLowerCase();
    return turmas.filter((t) =>
      t.nome.toLowerCase().includes(q) || (t.horario || "").toLowerCase().includes(q)
    );
  }, [turmas, searchTerm]);

  // ── STEP: CURSO ──────────────────────────────────────────────────────────────
  if (step === "curso") {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Users2 className="h-5 w-5 text-primary" />
            Gestão de Turmas
          </h2>
          <p className="text-sm text-muted-foreground">
            Selecione um curso para gerenciar suas turmas.
          </p>
        </div>

        {loadingCursos ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : cursos.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-20 text-center">
            <Users2 className="h-10 w-10 text-muted-foreground/40" />
            <p className="mt-4 text-sm font-medium text-foreground">Nenhum curso cadastrado</p>
            <p className="mt-1 text-xs text-muted-foreground">Cadastre um curso primeiro.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cursos.map((c) => (
              <button
                key={c.id}
                onClick={() => selectCurso(c)}
                className={cn(
                  "group relative flex flex-col gap-3 rounded-2xl border bg-card p-6 text-left shadow-sm",
                  "transition-all duration-150 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                )}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {c.codigo}
                </p>
                <p className="text-base font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
                  {c.nome}
                </p>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="h-4 w-4 text-primary" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── STEP: TURMAS ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={goBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <button onClick={goBack} className="hover:text-foreground transition-colors">
                Cursos
              </button>
              <span className="text-muted-foreground/50">/</span>
              <span className="font-semibold text-foreground">{selectedCurso?.codigo}</span>
            </nav>
            <p className="text-base font-bold text-foreground">{selectedCurso?.nome}</p>
          </div>
        </div>
        <Button onClick={openNew} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Nova Turma
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar turma..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Turmas grid */}
      {loadingTurmas ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-20 text-center">
          <Users2 className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-4 text-sm font-medium text-foreground">
            {turmas.length === 0 ? "Nenhuma turma neste curso." : "Nenhum resultado encontrado."}
          </p>
          {turmas.length === 0 && (
            <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={openNew}>
              <Plus className="h-3.5 w-3.5" />
              Criar primeira turma
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered
            .slice()
            .sort((a, b) => a.nome.localeCompare(b.nome))
            .map((turma) => (
              <div
                key={turma.id}
                className="group flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-base font-bold text-foreground leading-snug">{turma.nome}</p>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => openEdit(turma)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(turma)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {turma.horario && (
                    <p className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 shrink-0" />
                      {turma.horario}
                    </p>
                  )}
                  {turma.periodoInicio && turma.periodoFinal && (
                    <p className="flex items-center gap-1.5">
                      <CalendarRange className="h-3 w-3 shrink-0" />
                      {turma.periodoInicio} — {turma.periodoFinal}
                    </p>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Turma" : "Nova Turma"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-md bg-muted/60 border border-border/60 px-3 py-2 text-xs text-muted-foreground">
              Curso: <span className="font-semibold text-foreground">{selectedCurso?.nome}</span>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nome da turma</label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Turma A - 2025"
              />
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
                <Input
                  value={periodoInicio}
                  onChange={(e) => setPeriodoInicio(e.target.value)}
                  placeholder="Ex: 2025.1"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Período final</label>
                <Input
                  value={periodoFinal}
                  onChange={(e) => setPeriodoFinal(e.target.value)}
                  placeholder="Ex: 2027.2"
                />
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

export default AdminTurmas;
