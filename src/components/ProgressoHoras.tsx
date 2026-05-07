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
import { GRUPOS_ATIVIDADES, type GrupoAtividade } from "@/lib/categoriasComplementares";
import { CertificadoMeta } from "@/services/certificadoService";

/**
 * Carga horária total exigida pelo curso. 
 * TODO: Tornar dinâmico vindo das configurações do curso.
 */
const TOTAL_HORAS_COMPLEMENTARES = 100;

/**
 * Cores verdes para o campo "Aprovados" em cada atividade de ensino
 */
const CORES_VERDES_APROVADOS: Record<string, { bg: string; border: string }> = {
  "1.1": { bg: "bg-green-50", border: "border-green-300" },
  "1.2": { bg: "bg-green-50", border: "border-green-300" },
  "1.3": { bg: "bg-green-50", border: "border-green-300" },
  "1.4": { bg: "bg-green-50", border: "border-green-300" },
  "1.5": { bg: "bg-green-50", border: "border-green-300" },
  "1.6": { bg: "bg-green-50", border: "border-green-300" },
  "1.7": { bg: "bg-green-50", border: "border-green-300" },
  "1.8": { bg: "bg-green-50", border: "border-green-300" },
  "1.9": { bg: "bg-green-50", border: "border-green-300" },
  // Pesquisa
  "2.1": { bg: "bg-green-50", border: "border-green-300" },
  "2.2": { bg: "bg-green-50", border: "border-green-300" },
  "2.3": { bg: "bg-green-50", border: "border-green-300" },
  "2.4": { bg: "bg-green-50", border: "border-green-300" },
  "2.5": { bg: "bg-green-50", border: "border-green-300" },
  // Extensão
  "3.1": { bg: "bg-green-50", border: "border-green-300" },
  "3.2": { bg: "bg-green-50", border: "border-green-300" },
  "3.3": { bg: "bg-green-50", border: "border-green-300" },
  "3.4": { bg: "bg-green-50", border: "border-green-300" },
  "3.5": { bg: "bg-green-50", border: "border-green-300" },
  "3.6": { bg: "bg-green-50", border: "border-green-300" },
  "3.7": { bg: "bg-green-50", border: "border-green-300" },
};

/**
 * Cores laranja para o campo "Pendentes" em cada atividade de ensino
 */
const CORES_LARANJA_PENDENTES: Record<string, { bg: string; border: string }> = {
  "1.1": { bg: "bg-orange-50", border: "border-orange-300" },
  "1.2": { bg: "bg-orange-50", border: "border-orange-300" },
  "1.3": { bg: "bg-orange-50", border: "border-orange-300" },
  "1.4": { bg: "bg-orange-50", border: "border-orange-300" },
  "1.5": { bg: "bg-orange-50", border: "border-orange-300" },
  "1.6": { bg: "bg-orange-50", border: "border-orange-300" },
  "1.7": { bg: "bg-orange-50", border: "border-orange-300" },
  "1.8": { bg: "bg-orange-50", border: "border-orange-300" },
  "1.9": { bg: "bg-orange-50", border: "border-orange-300" },
  // Pesquisa
  "2.1": { bg: "bg-orange-50", border: "border-orange-300" },
  "2.2": { bg: "bg-orange-50", border: "border-orange-300" },
  "2.3": { bg: "bg-orange-50", border: "border-orange-300" },
  "2.4": { bg: "bg-orange-50", border: "border-orange-300" },
  "2.5": { bg: "bg-orange-50", border: "border-orange-300" },
  // Extensão
  "3.1": { bg: "bg-orange-50", border: "border-orange-300" },
  "3.2": { bg: "bg-orange-50", border: "border-orange-300" },
  "3.3": { bg: "bg-orange-50", border: "border-orange-300" },
  "3.4": { bg: "bg-orange-50", border: "border-orange-300" },
  "3.5": { bg: "bg-orange-50", border: "border-orange-300" },
  "3.6": { bg: "bg-orange-50", border: "border-orange-300" },
  "3.7": { bg: "bg-orange-50", border: "border-orange-300" },
};

/**
 * Obtém a cor verde para o campo Aprovados de uma atividade
 */
const obterCorVerde = (atividadeId: string) => {
  return CORES_VERDES_APROVADOS[atividadeId] || { bg: "bg-background", border: "border-border" };
};

/**
 * Obtém a cor laranja para o campo Pendentes de uma atividade
 */
const obterCorLaranja = (atividadeId: string) => {
  return CORES_LARANJA_PENDENTES[atividadeId] || { bg: "bg-background", border: "border-border" };
};

interface ProgressoHorasProps {
  certificados: CertificadoMeta[];
  horasAprovadas: number;
  nomeCurso?: string;
  cargaHorariaComplementar?: number;
  gruposAtividades?: GrupoAtividade[];
  loading?: boolean;
}

/**
 * Componente ProgressoHoras
 * Renderiza o dashboard de progresso do aluno, com barras de porcentagem e 
 * detalhamento de horas por grupos (Ensino, Pesquisa, Extensão).
 */
const ProgressoHoras: React.FC<ProgressoHorasProps> = ({
  certificados,
  horasAprovadas,
  nomeCurso = "Carregando curso...",
  cargaHorariaComplementar = TOTAL_HORAS_COMPLEMENTARES,
  gruposAtividades,
  loading,
}) => {
  // Estado para controlar a animação da barra de progresso ao carregar
  const [animatedPercent, setAnimatedPercent] = useState(0);

  // Cálculos básicos de progresso
  const metaHoras = cargaHorariaComplementar || TOTAL_HORAS_COMPLEMENTARES;
  const gruposBase = gruposAtividades?.length ? gruposAtividades : GRUPOS_ATIVIDADES;
  const horasRestantes = Math.max(0, metaHoras - horasAprovadas);
  const percentual = Math.min(100, Math.round((horasAprovadas / metaHoras) * 100));
  // Verifica se o aluno já atingiu a meta
  const concluido = horasAprovadas >= metaHoras;

  useEffect(() => {
    if (loading) return;
    const timeout = setTimeout(() => setAnimatedPercent(percentual), 200);
    return () => clearTimeout(timeout);
  }, [loading, percentual]);

  /**
   * Cruza os dados das categorias estáticas com os certificados reais do aluno
   * para calcular subtotais por grupo e atividade.
   */
  const gruposDetalhados = useMemo(() => {
    return gruposBase.map((grupo) => {
      const atividades = grupo.atividades.map((atividade) => {
        const relacionados = certificados.filter((certificado) => certificado.categoriaId === atividade.id);
        const aprovados = relacionados.filter((certificado) => certificado.status === "aprovado");
        const pendentes = relacionados.filter((certificado) => certificado.status === "pendente");
        const rejeitados = relacionados.filter((certificado) => certificado.status === "rejeitado");
        // Soma apenas as horas que foram validadas pelo admin para esta categoria específica
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

      // Totais consolidados do grupo (Ex: Total de Ensino)
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
  }, [certificados, gruposBase]);

  if (loading) {
    return <div className="h-[720px] animate-pulse rounded-xl bg-muted" />;
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-center gap-3 border-b bg-muted/30 px-5 py-3.5 sm:px-6 sm:py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          {/* Ícone indicativo de progresso acadêmico */}
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

      <div className="space-y-6 p-4 sm:p-6">
        {/* CARD DE RESUMO GERAL (TOTALIZADOR) */}
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

          {/* Feedback visual de zero horas */}
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

        {/* GRID DE RESUMO POR GRUPO (Ensino, Pesquisa, Extensão) */}
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

        {/* DETALHAMENTO POR ATIVIDADE (Lista completa de categorias permitidas) */}
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
                          Aproveitamento maximo: {atividade.horasMaximas || 0}h ({atividade.aproveitamentoMaximo})
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
                        <div className={`rounded-lg border p-3 ${
                          `${obterCorVerde(atividade.id).bg} ${obterCorVerde(atividade.id).border}`
                        }`}>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                            Aprovados
                          </div>
                          <p className="mt-2 text-lg font-bold text-foreground">
                            {atividade.aprovados}
                          </p>
                        </div>
                        <div className={`rounded-lg border p-3 ${
                          `${obterCorLaranja(atividade.id).bg} ${obterCorLaranja(atividade.id).border}`
                        }`}>
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
