import React, { useEffect, useMemo, useState } from "react";
import {
  Award,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  Target,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { type GrupoAtividade } from "@/services/cursoService";
import { CertificadoMeta } from "@/services/certificadoService";

const TOTAL_HORAS_COMPLEMENTARES = 100;

interface ProgressoHorasProps {
  certificados: CertificadoMeta[];
  horasAprovadas: number;
  nomeCurso?: string;
  cargaHorariaComplementar?: number;
  gruposAtividades?: GrupoAtividade[];
  loading?: boolean;
}

type AtividadeDetalhada = GrupoAtividade["atividades"][number] & {
  totalEnvios: number;
  aprovados: number;
  pendentes: number;
  rejeitados: number;
  horasAprovadas: number;
  ativo: boolean;
};

type GrupoDetalhado = GrupoAtividade & {
  horasAprovadas: number;
  envios: number;
  pendencias: number;
  atividades: AtividadeDetalhada[];
};

const ProgressoHoras: React.FC<ProgressoHorasProps> = ({
  certificados,
  horasAprovadas,
  nomeCurso = "Carregando curso...",
  cargaHorariaComplementar = TOTAL_HORAS_COMPLEMENTARES,
  gruposAtividades,
  loading,
}) => {
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const [selectedGrupo, setSelectedGrupo] = useState<GrupoDetalhado | null>(null);

  const metaHoras = cargaHorariaComplementar || TOTAL_HORAS_COMPLEMENTARES;
  const gruposBase = gruposAtividades ?? [];
  const horasRestantes = Math.max(0, metaHoras - horasAprovadas);
  const percentual = Math.min(100, Math.round((horasAprovadas / metaHoras) * 100));
  const concluido = horasAprovadas >= metaHoras;

  useEffect(() => {
    if (loading) return;
    const timeout = setTimeout(() => setAnimatedPercent(percentual), 200);
    return () => clearTimeout(timeout);
  }, [loading, percentual]);

  const gruposDetalhados = useMemo<GrupoDetalhado[]>(() => {
    return gruposBase.map((grupo) => {
      const atividades: AtividadeDetalhada[] = grupo.atividades.map((atividade) => {
        const relacionados = certificados.filter((c) => c.categoriaId === atividade.id);
        const aprovadosList = relacionados.filter((c) => c.status === "aprovado");
        const pendentes = relacionados.filter((c) => c.status === "pendente").length;
        const rejeitados = relacionados.filter((c) => c.status === "rejeitado").length;
        const horas = aprovadosList.reduce((t, c) => t + (c.horasAprovadas ?? 0), 0);
        return {
          ...atividade,
          totalEnvios: relacionados.length,
          aprovados: aprovadosList.length,
          pendentes,
          rejeitados,
          horasAprovadas: horas,
          ativo: relacionados.length > 0 || horas > 0,
        };
      });

      const aprovadasNoGrupo = atividades.reduce((t, a) => t + a.horasAprovadas, 0);
      const enviosNoGrupo = atividades.reduce((t, a) => t + a.totalEnvios, 0);
      const pendenciasNoGrupo = atividades.reduce((t, a) => t + a.pendentes, 0);

      return {
        ...grupo,
        horasAprovadas: aprovadasNoGrupo,
        envios: enviosNoGrupo,
        pendencias: pendenciasNoGrupo,
        atividades,
      };
    });
  }, [certificados, gruposBase]);

  if (loading) {
    return <div className="h-64 animate-pulse rounded-xl bg-muted" />;
  }

  return (
    <>
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b bg-muted/30 px-5 py-3.5 sm:px-6 sm:py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <GraduationCap className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground sm:text-base">
              Progresso das Horas Complementares
            </h2>
            <p className="text-xs text-muted-foreground">
              Acompanhe seu avanço no curso e o detalhamento por atividade
            </p>
          </div>
        </div>

        <div className="space-y-5 p-4 sm:p-6">
          {/* RESUMO GERAL */}
          <div className="rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/5 via-background to-background p-4 sm:p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
                    Dashboard
                  </p>
                  <p className="mt-2 text-lg font-bold text-foreground">{nomeCurso}</p>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                  <span className="text-muted-foreground">
                    <span className="font-bold text-foreground">{horasAprovadas}h</span> de{" "}
                    <span className="font-bold text-foreground">{metaHoras}h</span> concluidas
                  </span>
                  {!concluido && (
                    <span className="text-muted-foreground">
                      Faltam <span className="font-bold text-foreground">{horasRestantes}h</span> para completar
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
                <div className="rounded-xl border bg-background/80 p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Target className="h-3.5 w-3.5 text-primary" />
                    Progresso geral
                  </div>
                  <p className="mt-2 text-2xl font-bold text-primary">{animatedPercent}%</p>
                </div>
                <div className="rounded-xl border bg-background/80 p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Award className="h-3.5 w-3.5 text-primary" />
                    Meta do curso
                  </div>
                  <p className="mt-2 text-2xl font-bold text-foreground">{metaHoras}h</p>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Progresso</span>
                <span className="text-sm font-bold text-primary">{animatedPercent}%</span>
              </div>
              <Progress value={animatedPercent} className="h-3 bg-muted" />
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                  Horas aprovadas
                </span>
                <span className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  Meta do curso: {metaHoras}h
                </span>
              </div>
            </div>

            {horasAprovadas === 0 && (
              <p className="mt-4 text-xs italic text-muted-foreground">
                Você ainda nao possui horas aprovadas. Envie seus certificados para começar.
              </p>
            )}

            {concluido && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-success/10 px-4 py-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                <span className="text-sm font-semibold text-success">
                  Aluno apto a colar grau.
                </span>
              </div>
            )}
          </div>

          {/* CARDS DE GRUPO — clicáveis para abrir modal com detalhes */}
          {gruposDetalhados.length > 0 && (
            <div className="grid gap-3 md:grid-cols-3">
              {gruposDetalhados.map((grupo) => (
                <button
                  key={grupo.id}
                  onClick={() => setSelectedGrupo(grupo)}
                  className="group flex flex-col rounded-xl border bg-background p-4 text-left transition-all hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {grupo.label}
                  </p>
                  <p className="mt-3 text-2xl font-bold text-foreground">{grupo.horasAprovadas}h</p>
                  <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                    <p>{grupo.envios} envio(s) registrados</p>
                    <p>{grupo.pendencias} pendencia(s) em analise</p>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Ver atividades <ChevronRight className="h-3 w-3" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* MODAL DE DETALHES DO GRUPO */}
      <Dialog open={!!selectedGrupo} onOpenChange={(open) => { if (!open) setSelectedGrupo(null); }}>
        <DialogContent className="max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl overflow-hidden p-0">
          <DialogHeader className="border-b bg-muted/30 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <GraduationCap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base">{selectedGrupo?.label}</DialogTitle>
                <DialogDescription className="text-xs">
                  {selectedGrupo?.horasAprovadas}h aprovadas · {selectedGrupo?.envios} envio(s) ·{" "}
                  {selectedGrupo?.pendencias} pendencia(s)
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto p-4 sm:p-5" style={{ maxHeight: "calc(85vh - 80px)" }}>
            {selectedGrupo && (
              <div className="space-y-3">
                {selectedGrupo.atividades.map((atividade) => (
                  <div
                    key={atividade.id}
                    className={`rounded-xl border p-4 transition-colors ${
                      atividade.ativo ? "border-primary/15 bg-primary/[0.03]" : "bg-muted/20"
                    }`}
                  >
                    {/* Badges de status */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-border bg-background text-foreground">
                        {atividade.id}
                      </Badge>
                      {atividade.horasAprovadas > 0 && (
                        <Badge className="bg-success/15 text-success hover:bg-success/15">
                          {atividade.horasAprovadas}h aprovadas
                        </Badge>
                      )}
                      {atividade.pendentes > 0 && (
                        <Badge className="bg-secondary/15 text-secondary hover:bg-secondary/15">
                          {atividade.pendentes} pendente(s)
                        </Badge>
                      )}
                      {atividade.rejeitados > 0 && (
                        <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/15">
                          {atividade.rejeitados} rejeitado(s)
                        </Badge>
                      )}
                    </div>

                    <h4 className="mt-3 text-sm font-semibold text-foreground">
                      {atividade.descricao}
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Aproveitamento máximo: {atividade.horasMaximas || 0}h ({atividade.aproveitamentoMaximo})
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Requisito: {atividade.requisito}
                    </p>

                    {/* Mini-cards de contagem */}
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      <div className="rounded-lg border bg-background p-2.5">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Award className="h-3 w-3 text-primary" />
                          Horas
                        </div>
                        <p className="mt-1.5 text-base font-bold text-foreground">
                          {atividade.horasAprovadas}h
                        </p>
                      </div>
                      <div className="rounded-lg border bg-green-50 border-green-300 p-2.5">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3 text-success" />
                          Aprov.
                        </div>
                        <p className="mt-1.5 text-base font-bold text-foreground">
                          {atividade.aprovados}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-orange-50 border-orange-300 p-2.5">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock3 className="h-3 w-3 text-secondary" />
                          Pend.
                        </div>
                        <p className="mt-1.5 text-base font-bold text-foreground">
                          {atividade.pendentes}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-background p-2.5">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <FileText className="h-3 w-3 text-primary" />
                          Envios
                        </div>
                        <p className="mt-1.5 text-base font-bold text-foreground">
                          {atividade.totalEnvios}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProgressoHoras;
