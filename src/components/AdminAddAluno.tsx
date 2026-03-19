import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const AdminAddAluno: React.FC = () => {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loadingCursos, setLoadingCursos] = useState(true);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cursoId, setCursoId] = useState("");
  const [saving, setSaving] = useState(false);

  // Lista de alunos
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || !cursoId) {
      toast.error("Preencha todos os campos.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("E-mail inválido.");
      return;
    }

    setSaving(true);
    try {
      await createAluno({ nome: nome.trim(), email: email.trim(), cursoId });
      toast.success("Aluno cadastrado com sucesso! Um e-mail de boas-vindas foi enviado.");
      setNome("");
      setEmail("");
      setCursoId("");
      loadAlunos();
    } catch (err: any) {
      toast.error(err.message || "Erro ao cadastrar aluno.");
    } finally {
      setSaving(false);
    }
  };

  const selectedCurso = cursos.find((c) => c.id === cursoId);

  const alunosFiltrados = alunos.filter((a) =>
    a.nome.toLowerCase().includes(buscaNome.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* Formulário de cadastro */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Cadastrar Aluno
          </h2>
          <p className="text-sm text-muted-foreground">
            Adicione um aluno vinculado a um curso já cadastrado.
          </p>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Nome completo</label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Maria da Silva"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">E-mail</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ex: maria@exemplo.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Curso</label>
                {loadingCursos ? (
                  <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando cursos...
                  </div>
                ) : cursos.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    Nenhum curso cadastrado. Cadastre um curso primeiro.
                  </p>
                ) : (
                  <Select value={cursoId} onValueChange={setCursoId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um curso" />
                    </SelectTrigger>
                    <SelectContent>
                      {cursos.map((c) => (
                        <SelectItem key={c.id || c.codigo} value={c.id || c.codigo}>
                          {c.nome} — {c.codigo} ({c.turno})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedCurso && (
                  <p className="text-xs text-muted-foreground">
                    {selectedCurso.nome} • {selectedCurso.codigo} • Turno: {selectedCurso.turno}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={saving || loadingCursos || cursos.length === 0}
                className="w-full gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {saving ? "Cadastrando..." : "Cadastrar Aluno"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Lista de alunos */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Alunos Cadastrados
          </h2>
          <p className="text-sm text-muted-foreground">
            {alunosFiltrados.length} aluno(s) encontrado(s)
          </p>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-4 sm:p-6 space-y-4">
            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={buscaNome}
                  onChange={(e) => setBuscaNome(e.target.value)}
                  placeholder="Buscar por nome..."
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
                      {c.nome} ({c.turno})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tabela */}
            {loadingAlunos ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Carregando alunos...
              </div>
            ) : alunosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <GraduationCap className="h-10 w-10 mb-2 opacity-40" />
                <p className="text-sm">Nenhum aluno encontrado.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="hidden sm:table-cell">E-mail</TableHead>
                      <TableHead>Curso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alunosFiltrados.map((aluno) => (
                      <TableRow key={aluno.id}>
                        <TableCell className="font-medium">{aluno.nome}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">
                          {aluno.email}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {aluno.cursoNome || aluno.cursoCodigo || "—"}
                          </span>
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
