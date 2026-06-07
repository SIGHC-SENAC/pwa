import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, Clock3, FileCheck2, Layers3, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchCursoById, type Curso } from "@/services/cursoService";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props {
  cursoId?: string;
  cursoIds?: string[];
}

type GrupoAtividade = NonNullable<Curso["regrasAtividades"]>[number];

const AdminCursoInfo: React.FC<Props> = ({ cursoId, cursoIds }) => {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [selectedCursoId, setSelectedCursoId] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalGrupo, setModalGrupo] = useState<GrupoAtividade | null>(null);

  useEffect(() => {
    let active = true;
    const ids = cursoIds?.length ? cursoIds : cursoId ? [cursoId] : [];

    async function loadCursos() {
      if (ids.length === 0) { setCursos([]); return; }
      setLoading(true);
      try {
        const data = await Promise.all(ids.map((id) => fetchCursoById(id).catch(() => null)));
        if (active) {
          const cursosValidos = data.filter(Boolean) as Curso[];
          setCursos(cursosValidos);
          setSelectedCursoId((current) => current || cursosValidos[0]?.id || "");
        }
      } catch (err) {
        console.error(err);
        toast.error("Erro ao carregar informacoes dos cursos.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadCursos();
    return () => { active = false; };
  }, [cursoId, cursoIds]);

  const selectedCurso = useMemo(
    () => cursos.find((c) => c.id === selectedCursoId) || cursos[0] || null,
    [cursos, selectedCursoId]
  );

  const gruposAtividades = selectedCurso?.regrasAtividades ?? [];

  const resumo = useMemo(() => {
    const totalAtividades = gruposAtividades.reduce((t, g) => t + g.atividades.length, 0);
    const totalHorasCategorias = gruposAtividades.reduce(
      (t, g) => t + g.atividades.reduce((gt, a) => gt + (a.horasMaximas || 0), 0), 0
    );
    return {
      totalGrupos: gruposAtividades.length,
      totalAtividades,
      totalHorasCategorias,
      cargaHoraria: selectedCurso?.cargaHorariaComplementar || 0,
    };
  }, [gruposAtividades, selectedCurso?.cargaHorariaComplementar]);

  if (!cursoId && !cursoIds?.length) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center shadow-sm">
        <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/50" />
        <h2 className="mt-4 text-lg font-semibold text-foreground">Cursos nao vinculados</h2>
        <p className="mt-1 text-sm text-muted-foreground">Este coordenador ainda nao possui cursos associados.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border bg-card py-20 shadow-sm">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Card do curso */}
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                {selectedCurso?.codigo || "Curso"}
              </Badge>
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
              {selectedCurso?.nome || "Curso vinculado"}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Informacoes usadas como referencia para validacao das atividades complementares.
            </p>
            {cursos.length > 1 && (
              <div className="mt-4 max-w-md">
                <label className="text-sm font-medium text-foreground">Ver informacoes do curso</label>
                <Select value={selectedCursoId} onValueChange={setSelectedCursoId}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Selecione um curso" />
                  </SelectTrigger>
                  <SelectContent>
                    {cursos.map((curso) => (
                      <SelectItem key={curso.id || curso.codigo} value={curso.id || curso.codigo}>
                        {curso.nome} ({curso.codigo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[520px]">
            <div className="rounded-lg border bg-background p-4">
              <Clock3 className="h-5 w-5 text-primary" />
              <p className="mt-3 text-xs font-medium uppercase text-muted-foreground">Carga exigida</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{resumo.cargaHoraria}h</p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <Layers3 className="h-5 w-5 text-primary" />
              <p className="mt-3 text-xs font-medium uppercase text-muted-foreground">Categorias</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{resumo.totalGrupos}</p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <FileCheck2 className="h-5 w-5 text-primary" />
              <p className="mt-3 text-xs font-medium uppercase text-muted-foreground">Atividades</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{resumo.totalAtividades}</p>
              <p className="mt-1 text-xs text-muted-foreground">{resumo.totalHorasCategorias}h em limites</p>
            </div>
          </div>
        </div>
      </section>

      {/* Cards de categorias — clique abre modal */}
      <div className="space-y-3">
        {gruposAtividades.map((grupo) => (
          <button
            key={grupo.id}
            onClick={() => setModalGrupo(grupo)}
            className="group flex w-full items-center justify-between rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent"
          >
            <div>
              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {grupo.label}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {grupo.atividades.length} {grupo.atividades.length === 1 ? "opcao" : "opcoes"} de atividade
              </p>
            </div>
            <Badge variant="outline" className="shrink-0 bg-background">{grupo.tipo}</Badge>
          </button>
        ))}
      </div>

      {/* Modal de atividades */}
      <Dialog open={!!modalGrupo} onOpenChange={(open) => { if (!open) setModalGrupo(null); }}>
        <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{modalGrupo?.label}</DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[88px]">Codigo</TableHead>
                  <TableHead>Atividade</TableHead>
                  <TableHead className="min-w-[140px]">Horas maximas</TableHead>
                  <TableHead className="min-w-[220px]">Comprovacao exigida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modalGrupo?.atividades.map((atividade) => (
                  <TableRow key={atividade.id}>
                    <TableCell><Badge variant="outline">{atividade.id}</Badge></TableCell>
                    <TableCell className="font-medium text-foreground">{atividade.descricao}</TableCell>
                    <TableCell className="text-sm text-foreground">
                      {atividade.horasMaximas || 0}h
                      <span className="block text-xs text-muted-foreground">{atividade.aproveitamentoMaximo}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{atividade.requisito}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCursoInfo;
