import React, { useMemo } from "react";
import {
  Award,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  Mail,
  Target,
  XCircle,
} from "lucide-react";
import type { Aluno } from "@/services/cursoService";
import { type CertificadoMeta, formatFileSize } from "@/services/certificadoService";
import { GRUPOS_ATIVIDADES } from "@/lib/categoriasComplementares";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

const TOTAL_HORAS_COMPLEMENTARES = 100;

type Props = {
  aluno: Aluno | null;
  certificados: CertificadoMeta[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Aceita Firestore Timestamp { seconds }, numero em ms (Date.now()) ou numero em segundos.
function tsToMs(ts: any): number {
  if (!ts) return 0;
  if (typeof ts === "number") return ts > 1e10 ? ts : ts * 1000;
  if (typeof ts.seconds === "number") return ts.seconds * 1000;
  return 0;
}

function formatDate(ts: { seconds: number; nanoseconds?: number } | number | null | undefined): string {
  if (!ts) return "-";
  const d = new Date(tsToMs(ts));
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const AdminAlunoHorasModal: React.FC<Props> = ({ aluno, certificados, open, onOpenChange }) => {
  const alunoCertificados = useMemo(() => {
    if (!aluno) return [];

    return certificados
      .filter((cert) => cert.uid === aluno.id)
      .sort((a, b) => tsToMs(b.createdAt) - tsToMs(a.createdAt));
  }, [aluno, certificados]);

  const resumo = useMemo(() => {
    const pendentes = alunoCertificados.filter((cert) => cert.status === "pendente").length;
    const aprovados = alunoCertificados.filter((cert) => cert.status === "aprovado").length;
    const rejeitados = alunoCertificados.filter((cert) => cert.status === "rejeitado").length;
    const horasAprovadas = alunoCertificados.reduce(
      (total, cert) => total + (cert.status === "aprovado" ? cert.horasAprovadas || 0 : 0),
      0
    );

    return {
      total: alunoCertificados.length,
      pendentes,
      aprovados,
      rejeitados,
      horasAprovadas,
    };
  }, [alunoCertificados]);

  const percentual = Math.min(100, Math.round((resumo.horasAprovadas / TOTAL_HORAS_COMPLEMENTARES) * 100));

  const gruposDetalhados = useMemo(() => {
    return GRUPOS_ATIVIDADES.map((grupo) => {
      const atividades = grupo.atividades.map((atividade) => {
        const relacionados = alunoCertificados.filter((certificado) => certificado.categoriaId === atividade.id);
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

      return {
        ...grupo,
        horasAprovadas: atividades.reduce((total, atividade) => total + atividade.horasAprovadas, 0),
        envios: atividades.reduce((total, atividade) => total + atividade.totalEnvios, 0),
        pendencias: atividades.reduce((total, atividade) => total + atividade.pendentes, 0),
        atividades,
      };
    });
  }, [alunoCertificados]);

  if (!aluno) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] overflow-hidden p-0 gap-0">
        <DialogHeader className="border-b bg-primary/5 px-6 py-5 text-left">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-primary">
            <GraduationCap className="h-5 w-5" />
            Horas Complementares do Aluno
          </DialogTitle>
          <DialogDescription className="space-y-3 pt-2">
            <span className="block text-base font-semibold text-foreground">{aluno.nome}</span>
            <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {aluno.email}
              </span>
              {aluno.cursoNome && <Badge variant="outline">{aluno.cursoNome}</Badge>}
              {aluno.turmaNome && <Badge variant="outline">{aluno.turmaNome}</Badge>}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          <div className="space-y-6">
            <div className="grid gap-3 md:grid-cols-5">
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Target className="h-4 w-4 text-primary" />
                    Horas aprovadas
                  </div>
                  <p className="mt-3 text-2xl font-bold text-primary">{resumo.horasAprovadas}h</p>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="h-4 w-4 text-primary" />
                    Envios
                  </div>
                  <p className="mt-3 text-2xl font-bold text-foreground">{resumo.total}</p>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Aprovados
                  </div>
                  <p className="mt-3 text-2xl font-bold text-foreground">{resumo.aprovados}</p>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock3 className="h-4 w-4 text-secondary" />
                    Pendentes
                  </div>
                  <p className="mt-3 text-2xl font-bold text-foreground">{resumo.pendentes}</p>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <XCircle className="h-4 w-4 text-destructive" />
                    Rejeitados
                  </div>
                  <p className="mt-3 text-2xl font-bold text-foreground">{resumo.rejeitados}</p>
                </CardContent>
              </Card>
            </div>

            <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="flex items-center gap-3 border-b bg-muted/30 px-5 py-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Target className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Progresso por tipo de atividade</h3>
                  <p className="text-xs text-muted-foreground">
                    Ensino, pesquisa e extensao em 3 sanfonas
                  </p>
                </div>
              </div>

              <div className="space-y-5 p-5">
                <div className="rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/5 via-background to-background p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
                        Progresso geral
                      </p>
                      <p className="mt-2 text-lg font-bold text-foreground">{aluno.cursoNome || "Curso vinculado"}</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {resumo.horasAprovadas}h de {TOTAL_HORAS_COMPLEMENTARES}h concluidas
                      </p>
                    </div>
                    <div className="rounded-xl border bg-background/80 px-4 py-3">
                      <p className="text-xs text-muted-foreground">Percentual</p>
                      <p className="mt-1 text-2xl font-bold text-primary">{percentual}%</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Carga horaria complementar</span>
                      <span className="font-semibold text-primary">{percentual}%</span>
                    </div>
                    <Progress value={percentual} className="h-3 bg-muted" />
                  </div>
                </div>

                <Accordion type="multiple" defaultValue={gruposDetalhados.map((grupo) => grupo.id)} className="rounded-xl border">
                  {gruposDetalhados.map((grupo) => (
                    <AccordionItem key={grupo.id} value={grupo.id} className="border-b last:border-b-0">
                      <AccordionTrigger className="px-4 py-4 text-left hover:no-underline">
                        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">{grupo.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {grupo.horasAprovadas}h aprovadas • {grupo.envios} envio(s) • {grupo.pendencias} pendente(s)
                            </p>
                          </div>
                          <Badge variant="outline" className="w-fit">
                            {grupo.atividades.filter((atividade) => atividade.ativo).length} atividade(s)
                          </Badge>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-3">
                          {grupo.atividades.map((atividade) => (
                            <div
                              key={atividade.id}
                              className={`rounded-xl border p-4 ${
                                atividade.ativo ? "border-primary/15 bg-primary/[0.03]" : "bg-muted/20"
                              }`}
                            >
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline">{atividade.id}</Badge>
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
                                  <p className="mt-3 text-sm font-semibold text-foreground">{atividade.descricao}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Maximo: {atividade.horasMaximas || 0}h ({atividade.aproveitamentoMaximo})
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Requisito: {atividade.requisito}
                                  </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 sm:min-w-[280px] sm:grid-cols-4">
                                  <div className="rounded-lg border bg-background p-3">
                                    <p className="text-[11px] text-muted-foreground">Horas</p>
                                    <p className="mt-1 text-lg font-bold text-foreground">{atividade.horasAprovadas}h</p>
                                  </div>
                                  <div className="rounded-lg border bg-background p-3">
                                    <p className="text-[11px] text-muted-foreground">Aprovados</p>
                                    <p className="mt-1 text-lg font-bold text-foreground">{atividade.aprovados}</p>
                                  </div>
                                  <div className="rounded-lg border bg-background p-3">
                                    <p className="text-[11px] text-muted-foreground">Pendentes</p>
                                    <p className="mt-1 text-lg font-bold text-foreground">{atividade.pendentes}</p>
                                  </div>
                                  <div className="rounded-lg border bg-background p-3">
                                    <p className="text-[11px] text-muted-foreground">Envios</p>
                                    <p className="mt-1 text-lg font-bold text-foreground">{atividade.totalEnvios}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="flex items-center gap-3 border-b bg-muted/30 px-5 py-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Award className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Ultimos envios</h3>
                  <p className="text-xs text-muted-foreground">
                    Historico recente de certificados enviados pelo aluno
                  </p>
                </div>
              </div>

              {alunoCertificados.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <p className="text-sm font-medium text-foreground">Nenhum certificado enviado ainda.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Quando houver envios, eles aparecerao aqui.
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {alunoCertificados.slice(0, 8).map((cert) => (
                    <div key={cert.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">{cert.nomeArquivo}</p>
                          <Badge
                            variant="outline"
                            className={
                              cert.status === "aprovado"
                                ? "bg-success/10 text-success border-success/20"
                                : cert.status === "rejeitado"
                                  ? "bg-destructive/10 text-destructive border-destructive/20"
                                  : "bg-secondary/10 text-secondary border-secondary/20"
                            }
                          >
                            {cert.status}
                          </Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatDate(cert.createdAt)}</span>
                          <span>{formatFileSize(cert.tamanhoBytes)}</span>
                          {cert.categoriaNome && <span>{cert.categoriaNome}</span>}
                        </div>
                        {cert.observacaoAdmin && (
                          <p className="mt-2 text-xs text-muted-foreground">Obs. admin: {cert.observacaoAdmin}</p>
                        )}
                        {cert.motivoRejeicao && (
                          <p className="mt-1 text-xs text-destructive">Motivo: {cert.motivoRejeicao}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {cert.horasAprovadas != null && cert.horasAprovadas > 0 && (
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                            {cert.horasAprovadas}h aprovadas
                          </Badge>
                        )}
                        {cert.nomeAdmin && (
                          <Badge variant="outline">
                            {cert.nomeAdmin}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminAlunoHorasModal;
