import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Edit, GraduationCap, Loader2, Search, Trash2, UserPlus, Users } from "lucide-react";
import {
  fetchCursos,
  createAluno,
  updateAluno,
  deleteAluno,
  fetchAlunos,
  Curso,
  Aluno,
} from "@/services/cursoService";
import { fetchTurmas, Turma } from "@/services/turmaService";

const AdminAddAluno: React.FC = () => {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loadingCursos, setLoadingCursos] = useState(true);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loadingTurmas, setLoadingTurmas] = useState(false);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cursoIds, setCursoIds] = useState<string[]>([]);
  const [turmaIdsByCurso, setTurmaIdsByCurso] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAluno, setEditingAluno] = useState<Aluno | null>(null);
  const [deletingAluno, setDeletingAluno] = useState<Aluno | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loadingAlunos, setLoadingAlunos] = useState(true);
  const [filtroCursoId, setFiltroCursoId] = useState("todos");
  const [buscaNome, setBuscaNome] = useState("");

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

  const loadTurmasByCursos = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setTurmas([]);
      return;
    }

    setLoadingTurmas(true);
    try {
      const turmasPorCurso = await Promise.all(ids.map((id) => fetchTurmas(id)));
      const turmasMap = new Map<string, Turma>();
      turmasPorCurso.flat().forEach((turma) => {
        if (turma.id) turmasMap.set(turma.id, turma);
      });
      setTurmas(Array.from(turmasMap.values()));
    } catch {
      toast.error("Erro ao carregar turmas.");
    } finally {
      setLoadingTurmas(false);
    }
  }, []);

  const loadAlunos = useCallback(async () => {
    setLoadingAlunos(true);
    try {
      const cursoFilter = filtroCursoId === "todos" ? undefined : filtroCursoId;
      const data = await fetchAlunos(cursoFilter);
      setAlunos(data);
    } catch {
      toast.error("Erro ao carregar alunos.");
    } finally {
      setLoadingAlunos(false);
    }
  }, [filtroCursoId]);

  useEffect(() => {
    loadCursos();
  }, [loadCursos]);

  useEffect(() => {
    loadAlunos();
  }, [loadAlunos]);

  useEffect(() => {
    if (cursoIds.length > 0) {
      loadTurmasByCursos(cursoIds);
    } else {
      setTurmas([]);
    }
  }, [cursoIds, loadTurmasByCursos]);

  useEffect(() => {
    setTurmaIdsByCurso((current) => {
      const next: Record<string, string> = {};
      cursoIds.forEach((cursoId) => {
        if (current[cursoId]) next[cursoId] = current[cursoId];
      });
      return next;
    });
  }, [cursoIds]);

  const toggleCurso = (id?: string) => {
    if (!id) return;
    setCursoIds((current) =>
      current.includes(id) ? current.filter((cursoId) => cursoId !== id) : [...current, id]
    );
  };

  const resetForm = () => {
    setNome("");
    setEmail("");
    setCursoIds([]);
    setTurmaIdsByCurso({});
    setEditingAluno(null);
  };

  const openCreateForm = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEditForm = (aluno: Aluno) => {
    setEditingAluno(aluno);
    setNome(aluno.nome || "");
    setEmail(aluno.email || "");
    const alunoCursoIds = aluno.cursoIds?.length ? aluno.cursoIds : aluno.cursoId ? [aluno.cursoId] : [];
    const turmasPorCurso = aluno.turmas?.reduce<Record<string, string>>((acc, turma) => {
      if (turma.cursoId) acc[turma.cursoId] = turma.id;
      return acc;
    }, {}) || {};

    if (aluno.turmaId && aluno.cursoId && !turmasPorCurso[aluno.cursoId]) {
      turmasPorCurso[aluno.cursoId] = aluno.turmaId;
    }

    setCursoIds(alunoCursoIds);
    setTurmaIdsByCurso(turmasPorCurso);
    setFormOpen(true);
  };

  const cursosLabel = (aluno: Aluno) => {
    if (aluno.cursos?.length) return aluno.cursos.map((curso) => curso.codigo || curso.nome).join(", ");
    return aluno.cursoNome || aluno.cursoCodigo || "-";
  };

  const turmasLabel = (aluno: Aluno) => {
    if (aluno.turmas?.length) {
      return aluno.turmas.map((turma) => `${turma.cursoCodigo || turma.cursoNome || "Curso"}: ${turma.nome}`).join(", ");
    }
    return aluno.turmaNome || "-";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim() || !email.trim() || cursoIds.length === 0) {
      toast.error("Preencha todos os campos obrigatorios.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("E-mail invalido.");
      return;
    }

    const payload = {
      nome: nome.trim(),
      email: email.trim(),
      cursoId: cursoIds[0],
      cursoIds,
      turmaId: turmaIdsByCurso[cursoIds[0]] || undefined,
      turmaIds: cursoIds.map((cursoId) => turmaIdsByCurso[cursoId]).filter(Boolean),
    };

    setSaving(true);
    try {
      if (editingAluno) {
        await updateAluno(editingAluno.id, payload);
        toast.success("Aluno atualizado com sucesso.");
      } else {
        await createAluno(payload);
        toast.success("Aluno cadastrado com sucesso.");
      }

      resetForm();
      setFormOpen(false);
      loadAlunos();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar aluno.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAluno = async () => {
    if (!deletingAluno) return;

    setDeleting(true);
    try {
      await deleteAluno(deletingAluno.id);
      toast.success("Aluno excluido com sucesso.");
      setDeletingAluno(null);
      loadAlunos();
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir aluno.");
    } finally {
      setDeleting(false);
    }
  };

  const selectedCurso = cursos.find((c) => c.id === cursoIds[0]);
  const selectedCursos = cursos.filter((c) => c.id && cursoIds.includes(c.id));
  const getTurmasByCurso = (cursoId?: string) => turmas.filter((turma) => turma.cursoId === cursoId);
  const alunosFiltrados = alunos.filter((aluno) =>
    aluno.nome.toLowerCase().includes(buscaNome.toLowerCase())
  );

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Users className="h-5 w-5 text-primary" />
              Alunos Cadastrados
            </h2>
            <p className="text-sm text-muted-foreground">{alunosFiltrados.length} aluno(s) encontrado(s)</p>
          </div>
          <Button onClick={openCreateForm} className="gap-2 self-start sm:self-auto">
            <UserPlus className="h-4 w-4" />
            Cadastrar Aluno
          </Button>
        </div>

        <Card className="shadow-sm">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={buscaNome} onChange={(e) => setBuscaNome(e.target.value)} placeholder="Buscar por nome..." className="pl-9" />
              </div>
              <Select value={filtroCursoId} onValueChange={setFiltroCursoId}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="Filtrar por curso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os cursos</SelectItem>
                  {cursos.map((c) => (
                    <SelectItem key={c.id || c.codigo} value={c.id || c.codigo}>
                      {c.nome} ({c.turno})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loadingAlunos ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Carregando alunos...
              </div>
            ) : alunosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <GraduationCap className="mb-2 h-10 w-10 opacity-40" />
                <p className="text-sm">Nenhum aluno encontrado.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="hidden sm:table-cell">E-mail</TableHead>
                      <TableHead>Cursos</TableHead>
                      <TableHead className="hidden md:table-cell">Turma</TableHead>
                      <TableHead className="w-[112px] text-right">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alunosFiltrados.map((aluno) => (
                      <TableRow key={aluno.id}>
                        <TableCell className="font-medium">{aluno.nome}</TableCell>
                        <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">{aluno.email}</TableCell>
                        <TableCell>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                            {cursosLabel(aluno)}
                          </span>
                        </TableCell>
                        <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                          {turmasLabel(aluno)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button type="button" variant="ghost" size="icon" onClick={() => openEditForm(aluno)} title="Editar aluno">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" onClick={() => setDeletingAluno(aluno)} title="Excluir aluno">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              {editingAluno ? "Editar Aluno" : "Cadastrar Aluno"}
            </DialogTitle>
            <DialogDescription>
              {editingAluno ? "Atualize os dados do aluno selecionado." : "Adicione ou vincule um aluno a um curso."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nome completo</label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Maria da Silva" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">E-mail</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Ex: maria@exemplo.com" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Cursos</label>
              {loadingCursos ? (
                <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando cursos...
                </div>
              ) : cursos.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">Nenhum curso cadastrado. Cadastre um curso primeiro.</p>
              ) : (
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
                  {cursos.map((c) => (
                    <label key={c.id || c.codigo} className="flex items-start gap-2 text-sm">
                      <Checkbox checked={!!c.id && cursoIds.includes(c.id)} onCheckedChange={() => toggleCurso(c.id)} />
                      <span>
                        <span className="font-medium text-foreground">{c.nome}</span>
                        <span className="text-muted-foreground"> - {c.codigo} ({c.turno})</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {selectedCurso && (
                <p className="text-xs text-muted-foreground">
                  {selectedCursos.length === 1
                    ? `1 curso selecionado: ${selectedCurso?.nome}`
                    : `${selectedCursos.length} cursos selecionados. As turmas dos cursos selecionados serao listadas abaixo.`}
                </p>
              )}
            </div>

            {cursoIds.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Turmas</label>
                {loadingTurmas ? (
                  <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando turmas...
                  </div>
                ) : turmas.length === 0 ? (
                  <p className="py-2 text-sm text-muted-foreground">Nenhuma turma cadastrada para os cursos selecionados.</p>
                ) : (
                  <div className="space-y-3 rounded-md border p-3">
                    {selectedCursos.map((curso) => {
                      const turmasDoCurso = getTurmasByCurso(curso.id);

                      return (
                        <div key={curso.id} className="space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground">
                            {curso.nome} - {curso.codigo} ({curso.turno})
                          </p>
                          {turmasDoCurso.length === 0 ? (
                            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                              Nenhuma turma cadastrada para este curso.
                            </p>
                          ) : (
                            <Select
                              value={curso.id ? turmaIdsByCurso[curso.id] : undefined}
                              onValueChange={(value) => {
                                if (!curso.id) return;
                                setTurmaIdsByCurso((current) => ({ ...current, [curso.id!]: value }));
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione uma turma" />
                              </SelectTrigger>
                              <SelectContent>
                                {turmasDoCurso.map((t) => (
                                  <SelectItem key={t.id} value={t.id!}>
                                    {t.nome} - {t.periodoInicio} a {t.periodoFinal} ({t.horario})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <Button type="submit" disabled={saving || loadingCursos || cursos.length === 0} className="w-full gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {saving ? "Salvando..." : editingAluno ? "Salvar Alteracoes" : "Salvar Aluno"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingAluno} onOpenChange={(open) => !open && setDeletingAluno(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir aluno?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao remove {deletingAluno?.nome} do sistema e tambem exclui o acesso dele no Firebase Auth.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAluno} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminAddAluno;
