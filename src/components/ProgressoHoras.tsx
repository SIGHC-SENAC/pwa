import React, { useEffect, useMemo, useState } from "react";
import {
  Award,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  ChevronRight,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  displayName?: string;
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
  horasMax: number;
  envios: number;
  pendencias: number;
  atividades: AtividadeDetalhada[];
};

const ProgressoHoras: React.FC<ProgressoHorasProps> = ({
  certificados,
  horasAprovadas,
  displayName,
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

  const total = certificados.length;
  const pendentes = certificados.filter((c) => c.status === "pendente").length;
  const aprovados = certificados.filter((c) => c.status === "aprovado").length;

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => setAnimatedPercent(percentual), 200);
    return () => clearTimeout(t);
  }, [loading, percentual]);

  const gruposDetalhados = useMemo<GrupoDetalhado[]>(() => {
    return gruposBase.map((grupo) => {
      const atividades: AtividadeDetalhada[] = grupo.atividades.map((atividade) => {
        const relacionados = certificados.filter((c) => c.categoriaId === atividade.id);
        const aprovadosList = relacionados.filter((c) => c.status === "aprovado");
        const pendentesLista = relacionados.filter((c) => c.status === "pendente").length;
        const rejeitados = relacionados.filter((c) => c.status === "rejeitado").length;
        const horas = aprovadosList.reduce((t, c) => t + (c.horasAprovadas ?? 0), 0);
        return {
          ...atividade,
          totalEnvios: relacionados.length,
          aprovados: aprovadosList.length,
          pendentes: pendentesLista,
          rejeitados,
          horasAprovadas: horas,
          ativo: relacionados.length > 0,
        };
      });

      const aprovadasNoGrupo = atividades.reduce((t, a) => t + a.horasAprovadas, 0);
      const enviosNoGrupo = atividades.reduce((t, a) => t + a.totalEnvios, 0);
      const pendenciasNoGrupo = atividades.reduce((t, a) => t + a.pendentes, 0);
      const maxNoGrupo = atividades.reduce((t, a) => t + (a.horasMaximas || 0), 0);

      return {
        ...grupo,
        horasAprovadas: aprovadasNoGrupo,
        horasMax: maxNoGrupo,
        envios: enviosNoGrupo,
        pendencias: pendenciasNoGrupo,
        atividades,
      };
    });
  }, [certificados, gruposBase]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const firstName = displayName?.split(" ")[0];

  const stats = [
    { label: "Enviados",  value: String(total),            color: "text-foreground" },
    { label: "Pendentes", value: String(pendentes),         color: "text-amber-500" },
    { label: "Aprovados", value: String(aprovados),         color: "text-emerald-600" },
    { label: "Horas",     value: `${horasAprovadas}h`,     color: "text-primary" },
  ];

  return (
    <>
      {/* ── OVERVIEW CARD ─────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        {/* top accent */}
        <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/20" />

        <div className="p-5 sm:p-6">
          {/* heading + badge */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-bold text-foreground leading-snug line-clamp-1">
                {nomeCurso}
              </p>
            </div>
            {concluido && (
              <Badge className="shrink-0 gap-1 bg-emerald-500/10 text-emerald-700 border-emerald-300/60 dark:text-emerald-400 dark:border-emerald-800">
                <CheckCircle2 className="h-3 w-3" />
                Apto para colar grau
              </Badge>
            )}
          </div>

          {/* big % + bar */}
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-8">
            <div className="shrink-0">
              <div className="flex items-baseline gap-0.5 leading-none">
                <span className="text-6xl font-black tabular-nums text-primary tracking-tight">
                  {animatedPercent}
                </span>
                <span className="text-2xl font-bold text-primary/60">%</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{horasAprovadas}h</span>{" "}
                de{" "}
                <span className="font-semibold text-foreground">{metaHoras}h</span>{" "}
                concluídas
              </p>
              {!concluido && horasRestantes > 0 && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Faltam{" "}
                  <span className="font-semibold text-foreground">{horasRestantes}h</span>
                </p>
              )}
            </div>

            <div className="flex-1 pb-0.5">
              <Progress value={animatedPercent} className="h-2 rounded-full" />
              <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                <span>Horas aprovadas</span>
                <span>Meta: {metaHoras}h</span>
              </div>
            </div>
          </div>

          {/* stat grid */}
          <div className="mt-5 grid grid-cols-4 overflow-hidden rounded-xl border">
            {stats.map(({ label, value, color }, i) => (
              <div
                key={label}
                className={`flex flex-col items-center gap-1 py-3 px-2 ${i !== 0 ? "border-l" : ""}`}
              >
                <span className={`text-xl font-bold tabular-nums leading-none ${color}`}>
                  {value}
                </span>
                <span className="text-[10px] text-muted-foreground leading-none">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── GROUP CARDS ───────────────────────────────────── */}
      {gruposDetalhados.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Atividades por categoria</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {gruposDetalhados.map((grupo) => {
              const grupoPct =
                grupo.horasMax > 0
                  ? Math.min(100, Math.round((grupo.horasAprovadas / grupo.horasMax) * 100))
                  : 0;
              return (
                <button
                  key={grupo.id}
                  onClick={() => setSelectedGrupo(grupo)}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {/* top accent line */}
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/80 to-primary/10 opacity-0 transition-opacity group-hover:opacity-100" />

                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground line-clamp-1">
                      {grupo.label}
                    </p>
                    {grupo.pendencias > 0 && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                        <AlertCircle className="h-2.5 w-2.5" />
                        {grupo.pendencias}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="text-4xl font-black tabular-nums tracking-tight text-foreground">
                      {grupo.horasAprovadas}
                    </span>
                    <span className="text-lg font-semibold text-muted-foreground">h</span>
                    {grupo.horasMax > 0 && (
                      <span className="text-sm text-muted-foreground">/ {grupo.horasMax}h</span>
                    )}
                  </div>

                  {grupo.horasMax > 0 && (
                    <div className="mt-3">
                      <Progress value={grupoPct} className="h-1.5 rounded-full" />
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        {grupoPct}% do limite utilizado
                      </p>
                    </div>
                  )}

                  <div className="mt-auto flex items-center justify-between pt-4">
                    <span className="text-xs text-muted-foreground">
                      {grupo.envios} envio{grupo.envios !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-semibold text-primary transition-transform group-hover:translate-x-0.5">
                      Ver detalhes
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── GROUP DETAIL MODAL ────────────────────────────── */}
      <Dialog open={!!selectedGrupo} onOpenChange={(open) => { if (!open) setSelectedGrupo(null); }}>
        <DialogContent className="max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl overflow-hidden p-0">

          {/* Header */}
          <DialogHeader className="p-0">
            <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/20" />
            <div className="px-5 pt-4 pb-3">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <GraduationCap className="h-4.5 w-4.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-base font-bold leading-tight">
                    {selectedGrupo?.label}
                  </DialogTitle>
                  <DialogDescription className="sr-only">{selectedGrupo?.label}</DialogDescription>
                </div>
              </div>
            </div>
            <div className="border-t" />
          </DialogHeader>

          {/* Activity list */}
          <div className="overflow-y-auto p-4 sm:p-5" style={{ maxHeight: "calc(85vh - 160px)" }}>
            {selectedGrupo && (
              <div className="space-y-2.5">
                {selectedGrupo.atividades.map((atividade) => {
                  const atPct = atividade.horasMaximas > 0
                    ? Math.min(100, Math.round((atividade.horasAprovadas / atividade.horasMaximas) * 100))
                    : 0;

                  if (!atividade.ativo) {
                    return (
                      <div
                        key={atividade.id}
                        className="flex items-start gap-3 rounded-xl border border-l-4 border-l-border bg-muted/20 px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-muted-foreground">{atividade.id}</span>
                            <span className="h-3 w-px bg-border" />
                            <p className="text-xs font-medium text-muted-foreground line-clamp-1">{atividade.descricao}</p>
                          </div>
                          <p className="mt-0.5 text-[10px] text-muted-foreground/60">Nenhum envio registrado</p>
                        </div>
                        <span className="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          máx. {atividade.horasMaximas}h
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={atividade.id}
                      className="overflow-hidden rounded-xl border border-l-4 border-l-primary bg-card"
                    >
                      {/* Card header */}
                      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-semibold text-foreground leading-snug">
                            {atividade.descricao}
                          </h4>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                            <span>Aprov. máx.: <span className="font-medium text-foreground">{atividade.aproveitamentoMaximo}</span></span>
                            <span>Requisito: <span className="font-medium text-foreground">{atividade.requisito}</span></span>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-md border bg-muted/40 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                          {atividade.id}
                        </span>
                      </div>

                      {/* Progress */}
                      {atividade.horasMaximas > 0 && (
                        <div className="px-4 pb-3">
                          <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
                            <span><span className="font-semibold text-foreground">{atividade.horasAprovadas}h</span> utilizadas</span>
                            <span className="flex items-center gap-1.5">
                              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">{atPct}%</span>
                              <span>de {atividade.horasMaximas}h</span>
                            </span>
                          </div>
                          <Progress value={atPct} className="h-2 rounded-full" />
                        </div>
                      )}

                      {/* Stats row */}
                      <div className="grid grid-cols-4 overflow-hidden border-t">
                        {[
                          { label: "Horas",  value: `${atividade.horasAprovadas}h`, color: "text-primary" },
                          { label: "Aprov.", value: String(atividade.aprovados),    color: "text-emerald-600" },
                          { label: "Pend.",  value: String(atividade.pendentes),    color: atividade.pendentes > 0 ? "text-amber-500" : "text-foreground" },
                          { label: "Envios", value: String(atividade.totalEnvios),  color: "text-foreground" },
                        ].map(({ label, value, color }, i) => (
                          <div key={label} className={`flex flex-col items-center gap-0.5 py-2.5 ${i !== 0 ? "border-l" : ""} bg-muted/20`}>
                            <span className={`text-base font-bold tabular-nums leading-none ${color}`}>{value}</span>
                            <span className="text-[10px] text-muted-foreground leading-none">{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProgressoHoras;
