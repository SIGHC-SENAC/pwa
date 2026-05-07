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
import { toast } from "sonner";
import { Loader2, UserPlus, Users, Search, GraduationCap } from "lucide-react";
import { fetchCursos, createAluno, fetchAlunos, Curso, Aluno } from "@/services/cursoService";
import { fetchTurmas, Turma } from "@/services/turmaService";

/**
 * Componente AdminAddAluno
 * Interface para administradores cadastrarem novos alunos ou gerenciarem os existentes.
 */
const AdminAddAluno: React.FC = () => {
  // Estados para carregamento de dados de suporte
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loadingCursos, setLoadingCursos] = useState(true);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loadingTurmas, setLoadingTurmas] = useState(false);

  // Estados do formulário de criação/edição
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cursoIds, setCursoIds] = useState<string[]>([]);
  const [turmaId, setTurmaId] = useState("");
  const [saving, setSaving] = useState(false);

  // Estados da lista de alunos e filtros
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loadingAlunos, setLoadingAlunos] = useState(true);
  const [filtroCursoId, setFiltroCursoId] = useState("todos");
  const [buscaNome, setBuscaNome] = useState("");

  /**
   * Busca a lista de cursos disponíveis
   */
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

  /**
   * Busca turmas vinculadas a um curso específico
   */
  const loadTurmasByCurso = useCallback(async (cId: string) => {
    if (!cId) {
      setTurmas([]);
      return;
    }
    setLoadingTurmas(true);
    try {
      const data = await fetchTurmas(cId);
      setTurmas(data);
    } catch {
      toast.error("Erro ao carregar turmas.");
    } finally {
      setLoadingTurmas(false);
    }
  }, []);

  /**
   * Busca a lista de alunos, opcionalmente filtrada por curso
   */
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

  // Efeito inicial para carregar cursos
  useEffect(() => {
    loadCursos();
  }, [loadCursos]);

  // Efeito para recarregar alunos quando filtros mudam
  useEffect(() => {
    loadAlunos();
  }, [loadAlunos]);

  // Efeito para buscar turmas sempre que o curso selecionado no formulário mudar
  useEffect(() => {
    setTurmaId("");
    if (cursoIds[0]) {
      loadTurmasByCurso(cursoIds[0]);
    } else {
      setTurmas([]);
    }
  }, [cursoIds, loadTurmasByCurso]);

  /**
   * Alterna a seleção de um curso no formulário (suporta múltiplos cursos)
   */
  const toggleCurso = (id?: string) => {
    if (!id) return;
    setCursoIds((current) => (current.includes(id) ? [] : [id]));
  };

  /**
   * Formata a exibição dos cursos de um aluno na tabela
   */
  const cursosLabel = (aluno: Aluno) => {
    if (aluno.cursos?.length) return aluno.cursos.map((curso) => curso.codigo || curso.nome).join(", ");
    return aluno.cursoNome || aluno.cursoCodigo || "-";
  };

  /**
   * Processa o envio do formulário de cadastro de aluno
   */
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

    setSaving(true);
    try {
      await createAluno({ nome: nome.trim(), email: email.trim(), cursoIds, turmaId: turmaId || undefined });
      toast.success("Aluno cadastrado ou atualizado com sucesso.");
      setNome("");
      setEmail("");
      setCursoIds([]);
      setTurmaId("");
      loadAlunos();
    } catch (err: any) {
      toast.error(err.message || "Erro ao cadastrar aluno.");
    } finally {
      setSaving(false);
    }
  };

  // Memoização/Cálculo de filtros na UI
  const selectedCurso = cursos.find((c) => c.id === cursoIds[0]);
  const alunosFiltrados = alunos.filter((a) =>
    a.nome.toLowerCase().includes(buscaNome.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
      {/* COLUNA ESQUERDA: FORMULÁRIO */}
      <div className="space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <UserPlus className="h-5 w-5 text-primary" />
            Cadastrar Aluno
          </h2>
          <p className="text-sm text-muted-foreground">
            Adicione ou vincule um aluno a um curso.
          </p>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-4 sm:p-6">
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
                <label className="text-sm font-medium text-foreground">Curso</label>
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
                    A turma sera vinculada ao curso selecionado: {selectedCurso.nome}
                  </p>
                )}
              </div>

              {cursoIds.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Turma</label>
                  {loadingTurmas ? (
                    <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando turmas...
                    </div>
                  ) : turmas.length === 0 ? (
                    <p className="py-2 text-sm text-muted-foreground">Nenhuma turma cadastrada para o curso selecionado.</p>
                  ) : (
                    <Select value={turmaId} onValueChange={setTurmaId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma turma" />
                      </SelectTrigger>
                      <SelectContent>
                        {turmas.map((t) => (
                          <SelectItem key={t.id} value={t.id!}>
                            {t.nome} - {t.periodoInicio} a {t.periodoFinal} ({t.horario})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              <Button type="submit" disabled={saving || loadingCursos || cursos.length === 0} className="w-full gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {saving ? "Salvando..." : "Salvar Aluno"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* COLUNA DIREITA: LISTAGEM */}
      <div className="space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Users className="h-5 w-5 text-primary" />
            Alunos Cadastrados
          </h2>
          <p className="text-sm text-muted-foreground">{alunosFiltrados.length} aluno(s) encontrado(s)</p>
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
                          {aluno.turmaNome || "-"}
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
    </div>
  );
};

export default AdminAddAluno;
