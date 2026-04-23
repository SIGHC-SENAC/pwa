import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Search, Users, GraduationCap, Layers3 } from "lucide-react";
import { toast } from "sonner";
import { fetchAlunos, type Aluno } from "@/services/cursoService";
import { type CertificadoMeta } from "@/services/certificadoService";
import { fetchTurmas, type Turma } from "@/services/turmaService";
import AdminAlunoHorasModal from "@/components/AdminAlunoHorasModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type Props = {
  cursoId?: string;
  certificados: CertificadoMeta[];
};

type TurmaGroup = {
  id: string;
  nome: string;
  horario?: string;
  periodoInicio?: string;
  periodoFinal?: string;
  alunos: Aluno[];
  isSemTurma?: boolean;
};

const AdminAlunosPorTurma: React.FC<Props> = ({ cursoId, certificados }) => {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedAluno, setSelectedAluno] = useState<Aluno | null>(null);

  const loadData = useCallback(async () => {
    if (!cursoId) {
      setTurmas([]);
      setAlunos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [turmasData, alunosData] = await Promise.all([
        fetchTurmas(cursoId),
        fetchAlunos(cursoId),
      ]);

      setTurmas(turmasData);
      setAlunos(alunosData);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar alunos do curso.");
    } finally {
      setLoading(false);
    }
  }, [cursoId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredAlunos = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return alunos;

    return alunos.filter((aluno) =>
      aluno.nome.toLowerCase().includes(query) ||
      aluno.email.toLowerCase().includes(query) ||
      (aluno.turmaNome || "").toLowerCase().includes(query)
    );
  }, [alunos, searchTerm]);

  const grupos = useMemo(() => {
    const groups = new Map<string, TurmaGroup>();

    turmas
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .forEach((turma) => {
        groups.set(turma.id || turma.nome, {
          id: turma.id || turma.nome,
          nome: turma.nome,
          horario: turma.horario,
          periodoInicio: turma.periodoInicio,
          periodoFinal: turma.periodoFinal,
          alunos: [],
        });
      });

    const semTurma: TurmaGroup = {
      id: "sem-turma",
      nome: "Sem turma vinculada",
      alunos: [],
      isSemTurma: true,
    };

    filteredAlunos
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .forEach((aluno) => {
        const turmaKey = aluno.turmaId && groups.has(aluno.turmaId) ? aluno.turmaId : null;

        if (turmaKey) {
          groups.get(turmaKey)?.alunos.push(aluno);
          return;
        }

        semTurma.alunos.push(aluno);
      });

    const ordered = Array.from(groups.values());
    if (semTurma.alunos.length > 0) ordered.push(semTurma);

    return ordered;
  }, [filteredAlunos, turmas]);

  const cursoNome = useMemo(() => {
    return turmas[0]?.cursoNome || alunos[0]?.cursoNome || "Curso do coordenador";
  }, [alunos, turmas]);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border bg-card py-20 shadow-sm">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!cursoId) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Curso nao vinculado</CardTitle>
          <CardDescription>
            Este usuario nao possui um curso associado para listar alunos.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Curso</p>
              <p className="truncate text-sm font-semibold text-foreground">
                {cursoNome}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
              <Layers3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Turmas</p>
              <p className="text-sm font-semibold text-foreground">{turmas.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Alunos</p>
              <p className="text-sm font-semibold text-foreground">{filteredAlunos.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar aluno por nome, e-mail ou turma..."
                className="pl-9"
              />
            </div>
            <Button variant="outline" className="gap-2" onClick={loadData}>
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>

          {grupos.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-14 text-center">
              <Users className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-4 text-sm font-medium text-foreground">Nenhum aluno encontrado</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ajuste a busca ou aguarde novos cadastros no curso.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {grupos.map((grupo) => (
                <Card key={grupo.id} className="overflow-hidden border shadow-sm">
                  <CardHeader className="gap-3 bg-muted/30 pb-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <CardTitle className="text-base">{grupo.nome}</CardTitle>
                        {!grupo.isSemTurma && (
                          <CardDescription className="mt-1">
                            {grupo.horario}{" "}
                            {grupo.periodoInicio && grupo.periodoFinal
                              ? `- ${grupo.periodoInicio} a ${grupo.periodoFinal}`
                              : ""}
                          </CardDescription>
                        )}
                      </div>
                      <Badge variant="secondary" className="w-fit">
                        {grupo.alunos.length} aluno{grupo.alunos.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    {grupo.alunos.length === 0 ? (
                      <div className="px-5 py-8 text-sm text-muted-foreground">
                        Nenhum aluno vinculado a esta turma no momento.
                      </div>
                    ) : (
                      <div className="divide-y">
                        {grupo.alunos.map((aluno) => (
                          <button
                            key={aluno.id}
                            type="button"
                            onClick={() => setSelectedAluno(aluno)}
                            className="flex w-full flex-col gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">{aluno.nome}</p>
                              <p className="truncate text-xs text-muted-foreground">{aluno.email}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {aluno.turmaNome && !grupo.isSemTurma && (
                                <Badge variant="outline" className="text-xs">
                                  {aluno.turmaNome}
                                </Badge>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AdminAlunoHorasModal
        aluno={selectedAluno}
        certificados={certificados}
        open={!!selectedAluno}
        onOpenChange={(open) => {
          if (!open) setSelectedAluno(null);
        }}
      />
    </div>
  );
};

export default AdminAlunosPorTurma;
