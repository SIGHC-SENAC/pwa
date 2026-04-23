import React, { useEffect, useMemo, useState } from "react";
import {
  Award,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GRUPOS_ATIVIDADES } from "@/lib/categoriasComplementares";
import { CertificadoMeta } from "@/services/certificadoService";

const TOTAL_HORAS_COMPLEMENTARES = 100;

interface ProgressoHorasProps {
  certificados: CertificadoMeta[];
  horasAprovadas: number;
  nomeCurso?: string;
  loading?: boolean;
}

const ProgressoHoras: React.FC<ProgressoHorasProps> = ({
  certificados,
  horasAprovadas,
  nomeCurso = "Carregando curso...",
  loading,
}) => {
  const [animatedPercent, setAnimatedPercent] = useState(0);

  const horasRestantes = Math.max(0, TOTAL_HORAS_COMPLEMENTARES - horasAprovadas);
  const percentual = Math.min(100, Math.round((horasAprovadas / TOTAL_HORAS_COMPLEMENTARES) * 100));
  const concluido = horasAprovadas >= TOTAL_HORAS_COMPLEMENTARES;

  useEffect(() => {
    if (loading) return;
    const timeout = setTimeout(() => setAnimatedPercent(percentual), 200);
    return () => clearTimeout(timeout);
  }, [loading, percentual]);

  const gruposDetalhados = useMemo(() => {
    return GRUPOS_ATIVIDADES.map((grupo) => {
      const atividades = grupo.atividades.map((atividade) => {
        const relacionados = certificados.filter((certificado) => certificado.categoriaId === atividade.id);
        const aprovados = relacionados.filter((certificado) => certificado.status === "aprovado");
        const pendentes = relacionados.filter((certificado) => certificado.status === "pendente");
        const rejeitados = relacionados.filter((certificado) => certificado.status === "rejeitado");
        const horas = aprovados.reduce(
          (total, certificado) => total + (certificado.horasAprovadas ?? 0),
          0
        );

        return {
          ...atividade,
          totalEnvios: relacionados.length,
          aprovados: aprovados.length,
          pendentes: pendentes.length,
          rejeitados: rejeitados.length,
          horasAprovadas: horas,
          ativo: relacionados.length > 0 || horas > 0,
        };
      });

      const aprovadasNoGrupo = atividades.reduce((total, atividade) => total + atividade.horasAprovadas, 0);
      const enviosNoGrupo = atividades.reduce((total, atividade) => total + atividade.totalEnvios, 0);
      const pendenciasNoGrupo = atividades.reduce((total, atividade) => total + atividade.pendentes, 0);

      return {
        ...grupo,
        horasAprovadas: aprovadasNoGrupo,
        envios: enviosNoGrupo,
        pendencias: pendenciasNoGrupo,
        atividades,
      };
    });
  }, [certificados]);

  if (loading) {
    return <div className="h-[720px] animate-pulse rounded-xl bg-muted" />;
  }

  return (
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
            Acompanhe seu avanco no curso e o detalhamento por atividade
          </p>
        </div>
      </div>

      <div className="space-y-6 p-4 sm:p-6">
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
                  <span className="font-bold text-foreground">{TOTAL_HORAS_COMPLEMENTARES}h</span> concluidas
                </span>
                {!concluido && (
                  <span className="text-muted-foreground">
                    Faltam <span className="font-bold text-foreground">{horasRestantes}h</span> para completar
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-[320px]">
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
                <p className="mt-2 text-2xl font-bold text-foreground">{TOTAL_HORAS_COMPLEMENTARES}h</p>
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
                Meta do curso: {TOTAL_HORAS_COMPLEMENTARES}h
              </span>
            </div>
          </div>

          {horasAprovadas === 0 && (
            <p className="mt-4 text-xs italic text-muted-foreground">
              Voce ainda nao possui horas aprovadas. Envie seus certificados para comecar.
            </p>
          )}

          {concluido && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-success/10 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
              <span className="text-sm font-semibold text-success">
                Carga horaria complementar concluida!
              </span>
            </div>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {gruposDetalhados.map((grupo) => (
            <div key={grupo.id} className="rounded-xl border bg-background p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {grupo.label}
              </p>
              <p className="mt-3 text-2xl font-bold text-foreground">{grupo.horasAprovadas}h</p>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                <p>{grupo.envios} envio(s) registrados</p>
                <p>{grupo.pendencias} pendencia(s) em analise</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-5">
          {gruposDetalhados.map((grupo) => (
            <div key={grupo.id} className="rounded-2xl border bg-background p-4 sm:p-5">
              <div className="flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">{grupo.label}</h3>
                  <p className="text-sm text-muted-foreground">
                    {grupo.horasAprovadas}h aprovadas • {grupo.envios} envio(s)
                  </p>
                </div>
                <Badge variant="outline" className="w-fit border-primary/20 bg-primary/5 text-primary">
                  {grupo.atividades.filter((atividade) => atividade.ativo).length} atividade(s) com movimentacao
                </Badge>
              </div>

              <div className="mt-4 space-y-3">
                {grupo.atividades.map((atividade) => (
                  <div
                    key={atividade.id}
                    className={`rounded-xl border p-4 transition-colors ${
                      atividade.ativo ? "border-primary/15 bg-primary/[0.03]" : "bg-muted/20"
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
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
                          Aproveitamento maximo: {atividade.aproveitamentoMaximo}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Requisito: {atividade.requisito}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:min-w-[320px] sm:grid-cols-4">
                        <div className="rounded-lg border bg-background p-3">
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Award className="h-3.5 w-3.5 text-primary" />
                            Horas
                          </div>
                          <p className="mt-2 text-lg font-bold text-foreground">
                            {atividade.horasAprovadas}h
                          </p>
                        </div>
                        <div className="rounded-lg border bg-background p-3">
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                            Aprovados
                          </div>
                          <p className="mt-2 text-lg font-bold text-foreground">
                            {atividade.aprovados}
                          </p>
                        </div>
                        <div className="rounded-lg border bg-background p-3">
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Clock3 className="h-3.5 w-3.5 text-secondary" />
                            Pendentes
                          </div>
                          <p className="mt-2 text-lg font-bold text-foreground">
                            {atividade.pendentes}
                          </p>
                        </div>
                        <div className="rounded-lg border bg-background p-3">
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <FileText className="h-3.5 w-3.5 text-primary" />
                            Envios
                          </div>
                          <p className="mt-2 text-lg font-bold text-foreground">
                            {atividade.totalEnvios}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProgressoHoras;
