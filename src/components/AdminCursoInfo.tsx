import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, Clock3, FileCheck2, Layers3, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { GRUPOS_ATIVIDADES } from "@/lib/categoriasComplementares";
import { fetchCursoById, type Curso } from "@/services/cursoService";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props {
  cursoId?: string;
  cursoIds?: string[];
}

const AdminCursoInfo: React.FC<Props> = ({ cursoId, cursoIds }) => {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [selectedCursoId, setSelectedCursoId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const ids = cursoIds?.length ? cursoIds : cursoId ? [cursoId] : [];

    async function loadCursos() {
      if (ids.length === 0) {
        setCursos([]);
        return;
      }

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

    return () => {
      active = false;
    };
  }, [cursoId, cursoIds]);

  const selectedCurso = useMemo(() => {
    return cursos.find((curso) => curso.id === selectedCursoId) || cursos[0] || null;
  }, [cursos, selectedCursoId]);

  const gruposAtividades = selectedCurso?.regrasAtividades?.length
    ? selectedCurso.regrasAtividades
    : GRUPOS_ATIVIDADES;

  const resumo = useMemo(() => {
    const totalAtividades = gruposAtividades.reduce((total, grupo) => total + grupo.atividades.length, 0);
    const totalHorasCategorias = gruposAtividades.reduce(
      (total, grupo) => total + grupo.atividades.reduce((grupoTotal, atividade) => grupoTotal + (atividade.horasMaximas || 0), 0),
      0
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
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                {selectedCurso?.codigo || "Curso"}
              </Badge>
              {selectedCurso?.turno && <Badge variant="secondary">{selectedCurso.turno}</Badge>}
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

      <Accordion type="multiple" className="space-y-4">
        {gruposAtividades.map((grupo) => (
          <AccordionItem key={grupo.id} value={grupo.id} className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex w-full flex-col gap-2 text-left sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{grupo.label}</h3>
                  <p className="text-sm text-muted-foreground">
                    {grupo.atividades.length} {grupo.atividades.length === 1 ? "opcao" : "opcoes"} de atividade
                  </p>
                </div>
                <Badge variant="outline" className="mr-3 w-fit bg-background">{grupo.tipo}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="overflow-x-auto border-t">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[88px]">Codigo</TableHead>
                      <TableHead>Atividade</TableHead>
                      <TableHead className="min-w-[180px]">Horas maximas</TableHead>
                      <TableHead className="min-w-[260px]">Comprovacao exigida</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grupo.atividades.map((atividade) => (
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
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default AdminCursoInfo;
