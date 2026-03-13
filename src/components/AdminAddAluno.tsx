import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, UserPlus, Users } from "lucide-react";
import { fetchCursos, createAluno, Curso } from "@/services/cursoService";

const AdminAddAluno: React.FC = () => {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loadingCursos, setLoadingCursos] = useState(true);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cursoId, setCursoId] = useState("");
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    loadCursos();
  }, [loadCursos]);

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
    } catch (err: any) {
      toast.error(err.message || "Erro ao cadastrar aluno.");
    } finally {
      setSaving(false);
    }
  };

  const selectedCurso = cursos.find((c) => c.id === cursoId);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Cadastrar Aluno
        </h2>
        <p className="text-sm text-muted-foreground">
          Adicione um aluno vinculado a um curso já cadastrado.
        </p>
      </div>

      <Card className="shadow-sm max-w-lg">
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
  );
};

export default AdminAddAluno;
