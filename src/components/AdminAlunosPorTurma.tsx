import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Loader2,
  RefreshCw,
  Search,
  Clock,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { fetchAlunos, fetchCursoById, fetchCursos, type Aluno, type Curso } from "@/services/cursoService";
import { useAuth } from "@/contexts/AuthContext";
import { fetchTurmas, type Turma } from "@/services/turmaService";
import AdminAlunoHorasModal from "@/components/AdminAlunoHorasModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const PER_PAGE = 15;

type Step = "curso" | "turma" | "alunos";

type Props = {
  cursoId?: string;
  cursoIds?: string[];
  showAll?: boolean;
};

// ── helpers ─────────────────────────────────────────────────────────────────


// ── main component ───────────────────────────────────────────────────────────

const AdminAlunosPorTurma: React.FC<Props> = ({ cursoId, cursoIds, showAll = false }) => {
  const { userData } = useAuth();

  const allIds = useMemo(
    () => (cursoIds?.length ? cursoIds : cursoId ? [cursoId] : []),
    [cursoId, cursoIds]
  );

  // navigation state
  const [step, setStep]               = useState<Step>("curso");
  const [selectedCurso, setSelectedCurso] = useState<Curso | null>(null);
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);  // null = todos

  // data
  const [cursos, setCursos]   = useState<Curso[]>([]);
  const [turmas, setTurmas]   = useState<Turma[]>([]);
  const [alunos, setAlunos]   = useState<Aluno[]>([]);

  // loading flags
  const [loadingCursos, setLoadingCursos] = useState(true);
  const [loadingTurmas, setLoadingTurmas] = useState(false);
  const [loadingAlunos, setLoadingAlunos] = useState(false);

  // search + pagination for alunos view
  const [search, setSearch]     = useState("");
  const [page, setPage]         = useState(1);
  const [selectedAluno, setSelectedAluno] = useState<Aluno | null>(null);

  // ── initial load: courses ────────────────────────────────────────────────
  useEffect(() => {
    // Modo showAll: busca todos os cursos quando não há IDs específicos
    if (allIds.length === 0 && showAll) {
      setLoadingCursos(true);
      fetchCursos()
        .then((list) => {
          setCursos(list);
          if (list.length === 1) {
            setSelectedCurso(list[0]);
            setStep("turma");
          }
        })
        .catch(() => setCursos([]))
        .finally(() => setLoadingCursos(false));
      return;
    }

    if (allIds.length === 0) { setLoadingCursos(false); return; }

    // Usa userData.cursos se disponível (evita chamadas extras ao Firestore).
    const cursosFromUserData = userData?.cursos
      ?.filter((c) => allIds.includes(c.id))
      .map((c) => ({ id: c.id, nome: c.nome, codigo: c.codigo ?? c.id, cargaHorariaComplementar: 0 } as Curso));

    if (cursosFromUserData && cursosFromUserData.length > 0) {
      setCursos(cursosFromUserData);
      if (cursosFromUserData.length === 1) {
        setSelectedCurso(cursosFromUserData[0]);
        setStep("turma");
      }
      setLoadingCursos(false);
      return;
    }

    // Fallback: busca individual no Firestore; se falhar, usa IDs como nome.
    setLoadingCursos(true);
    Promise.all(allIds.map((id) =>
      fetchCursoById(id).catch(() => ({
        id,
        nome: id,
        codigo: id,
        cargaHorariaComplementar: 0,
      } as Curso))
    ))
      .then((list) => {
        setCursos(list);
        if (list.length === 1) {
          setSelectedCurso(list[0]);
          setStep("turma");
        }
      })
      .finally(() => setLoadingCursos(false));
  }, [allIds, userData?.cursos, showAll]);

  // ── fetch turmas when course changes ────────────────────────────────────
  useEffect(() => {
    if (!selectedCurso?.id) return;
    setLoadingTurmas(true);
    fetchTurmas(selectedCurso.id)
      .then((data) => {
        setTurmas(data);
        // Enriquece o curso com nome/codigo vindo das turmas, se o curso foi criado só com o ID.
        if (data.length > 0 && selectedCurso.nome === selectedCurso.id) {
          setSelectedCurso((prev) => prev ? {
            ...prev,
            nome: data[0].cursoNome || prev.nome,
            codigo: data[0].cursoCodigo || prev.codigo,
          } : prev);
          setCursos((prev) => prev.map((c) =>
            c.id === selectedCurso.id
              ? { ...c, nome: data[0].cursoNome || c.nome, codigo: data[0].cursoCodigo || c.codigo }
              : c
          ));
        }
      })
      .catch(() => toast.error("Erro ao carregar turmas."))
      .finally(() => setLoadingTurmas(false));
  }, [selectedCurso?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── fetch alunos when course is selected (needed for turma counts) ───────
  const loadAlunos = useCallback(async () => {
    if (!selectedCurso?.id) return;
    setLoadingAlunos(true);
    try {
      const data = await fetchAlunos(selectedCurso.id);
      setAlunos(data);
    } catch {
      toast.error("Erro ao carregar alunos.");
    } finally {
      setLoadingAlunos(false);
    }
  }, [selectedCurso]);

  useEffect(() => {
    if (selectedCurso) loadAlunos();
  }, [selectedCurso, loadAlunos]);

  // ── derived data ─────────────────────────────────────────────────────────

  // count alunos per turma for the turma cards
  const alunoCountByTurma = useMemo(() => {
    const map = new Map<string, number>();
    alunos.forEach((a) => {
      if (a.turmaId) map.set(a.turmaId, (map.get(a.turmaId) || 0) + 1);
    });
    return map;
  }, [alunos]);

  const visibleAlunos = useMemo(() => {
    let base = selectedTurma
      ? alunos.filter((a) => a.turmaId === selectedTurma.id)
      : alunos;

    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter(
        (a) =>
          a.nome.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          (a.turmaNome || "").toLowerCase().includes(q)
      );
    }
    return base.slice().sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [alunos, selectedTurma, search]);

  const totalPages = Math.max(1, Math.ceil(visibleAlunos.length / PER_PAGE));
  const pageAlunos = visibleAlunos.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => { setPage(1); }, [search, selectedTurma]);

  // ── navigation handlers ──────────────────────────────────────────────────
  const goToCurso = () => {
    setStep("curso");
    setSelectedCurso(null);
    setSelectedTurma(null);
    setTurmas([]);
    setAlunos([]);
  };

  const goToTurma = () => {
    setStep("turma");
    setSelectedTurma(null);
  };

  const selectCurso = (c: Curso) => {
    setSelectedCurso(c);
    setSelectedTurma(null);
    setAlunos([]);
    setStep("turma");
  };

  const selectTurma = (t: Turma | null) => {
    setSelectedTurma(t);
    setSearch("");
    setStep("alunos");
  };

  // ── empty guard ──────────────────────────────────────────────────────────
  if (allIds.length === 0 && !showAll) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-20 text-center">
        <GraduationCap className="h-10 w-10 text-muted-foreground/40" />
        <p className="mt-4 text-sm font-medium text-foreground">Nenhum curso vinculado</p>
        <p className="mt-1 text-xs text-muted-foreground">Este usuário não possui curso associado.</p>
      </div>
    );
  }

  // ── breadcrumb ───────────────────────────────────────────────────────────
  const Breadcrumb = () => (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
      {cursos.length > 1 && (
        <>
          <button
            onClick={goToCurso}
            className={cn(
              "flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors",
              step === "curso" ? "font-semibold text-foreground" : "hover:text-foreground hover:bg-muted/50"
            )}
          >
            <GraduationCap className="h-3.5 w-3.5" />
            Cursos
          </button>
          {step !== "curso" && <span className="text-muted-foreground/50">/</span>}
        </>
      )}
      {selectedCurso && step !== "curso" && (
        <>
          <button
            onClick={cursos.length > 1 ? goToTurma : undefined}
            className={cn(
              "rounded-md px-1.5 py-0.5 font-medium transition-colors",
              step === "turma" ? "text-foreground" : "hover:text-foreground hover:bg-muted/50"
            )}
          >
            {selectedCurso.codigo}
          </button>
          {step === "alunos" && <span className="text-muted-foreground/50">/</span>}
        </>
      )}
      {step === "alunos" && (
        <span className="rounded-md px-1.5 py-0.5 font-semibold text-foreground">
          {selectedTurma ? selectedTurma.nome : "Todos os alunos"}
        </span>
      )}
    </nav>
  );

  // ════════════════════════════════════════════════════════════════════════
  // STEP: CURSO
  // ════════════════════════════════════════════════════════════════════════
  if (step === "curso") {
    if (loadingCursos) {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Selecione o curso</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Escolha um curso para visualizar as turmas e alunos.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cursos.map((c) => {
            return (
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
            );
          })}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // STEP: TURMA
  // ════════════════════════════════════════════════════════════════════════
  if (step === "turma") {
    return (
      <div className="space-y-4">
        {/* header */}
        <div className="flex items-center gap-3">
          {cursos.length > 1 && (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={goToCurso}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="min-w-0">
            <Breadcrumb />
            <p className="mt-1 text-base font-bold text-foreground">{selectedCurso?.nome}</p>
            <p className="text-xs text-muted-foreground">
              {selectedCurso?.codigo}
            </p>
          </div>
        </div>

        {loadingTurmas ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : turmas.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-20 text-center">
            <Users className="h-10 w-10 text-muted-foreground/40" />
            <p className="mt-4 text-sm font-medium text-foreground">Nenhuma turma encontrada</p>
            <p className="mt-1 text-xs text-muted-foreground">Aguarde o cadastro de turmas neste curso.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Selecione uma turma para ver os alunos.</p>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {turmas
                .slice()
                .sort((a, b) => a.nome.localeCompare(b.nome))
                .map((t) => (
                  <button
                    key={t.id ?? t.nome}
                    onClick={() => selectTurma(t)}
                    className={cn(
                      "group flex flex-col gap-3 rounded-2xl border bg-card p-5 text-left shadow-sm",
                      "transition-all duration-150 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                        {t.nome}
                      </p>
                      <Badge variant="secondary" className="shrink-0 text-xs tabular-nums">
                        {alunoCountByTurma.get(t.id ?? "") ?? "—"} alunos
                      </Badge>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {t.horario && <p>{t.horario}</p>}
                      {t.periodoInicio && t.periodoFinal && (
                        <p>{t.periodoInicio} a {t.periodoFinal}</p>
                      )}
                    </div>
                  </button>
                ))}

              {/* "Todos" card */}
              <button
                onClick={() => selectTurma(null)}
                className={cn(
                  "group flex flex-col justify-center gap-2 rounded-2xl border-2 border-dashed p-5 text-left",
                  "transition-all duration-150 hover:border-primary/50 hover:bg-primary/5",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                )}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    Todos os alunos
                  </p>
                  <p className="text-xs text-muted-foreground">Ver todas as turmas juntas</p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // STEP: ALUNOS
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={goToTurma}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <Breadcrumb />
          <p className="mt-0.5 text-base font-bold text-foreground">
            {selectedTurma ? selectedTurma.nome : "Todos os alunos"}
          </p>
        </div>
        <Button
          variant="outline" size="sm" className="gap-1.5 shrink-0"
          onClick={loadAlunos} disabled={loadingAlunos}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loadingAlunos && "animate-spin")} />
          <span className="hidden sm:inline">Atualizar</span>
        </Button>
      </div>

      {/* stats row */}
      <div className="flex flex-wrap gap-2">
        {selectedTurma && selectedTurma.horario && (
          <Badge variant="outline" className="gap-1.5 text-xs font-normal">
            <Clock className="h-3 w-3" />
            {selectedTurma.horario}
          </Badge>
        )}
        {selectedTurma?.periodoInicio && selectedTurma.periodoFinal && (
          <Badge variant="outline" className="text-xs font-normal">
            {selectedTurma.periodoInicio} a {selectedTurma.periodoFinal}
          </Badge>
        )}
        <Badge variant="secondary" className="gap-1 text-xs">
          <Users className="h-3 w-3" />
          {visibleAlunos.length} aluno{visibleAlunos.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          className="pl-9"
        />
      </div>

      {/* list */}
      {loadingAlunos ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : visibleAlunos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <Users className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-4 text-sm font-medium text-foreground">Nenhum aluno encontrado</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {search ? "Tente um termo diferente." : "Esta turma ainda não tem alunos."}
          </p>
        </div>
      ) : (
        <Card className="overflow-hidden shadow-sm">
          <div className="divide-y">
            {pageAlunos.map((aluno) => (
              <button
                key={aluno.id}
                type="button"
                onClick={() => setSelectedAluno(aluno)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 active:bg-muted/60 sm:px-5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {aluno.nome.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{aluno.nome}</p>
                  <p className="truncate text-xs text-muted-foreground">{aluno.email}</p>
                </div>
                {!selectedTurma && aluno.turmaNome && (
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {aluno.turmaNome}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* pagination */}
      {totalPages > 1 && !loadingAlunos && (
        <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-2.5 shadow-sm">
          <p className="text-xs text-muted-foreground">{visibleAlunos.length} alunos</p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="icon" className="h-7 w-7"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="min-w-[4rem] text-center text-xs text-foreground">
              {page} de {totalPages}
            </span>
            <Button
              variant="outline" size="icon" className="h-7 w-7"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <AdminAlunoHorasModal
        aluno={selectedAluno}
        open={!!selectedAluno}
        onOpenChange={(open) => { if (!open) setSelectedAluno(null); }}
      />
    </div>
  );
};

export default AdminAlunosPorTurma;
