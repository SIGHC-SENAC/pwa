import React from "react";
import { FileText, ExternalLink, Inbox, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CertificadoMeta, formatFileSize } from "@/services/certificadoService";

interface HistoricoCertificadosProps {
  certificados: CertificadoMeta[];
  loading: boolean;
}

const statusConfig = {
  pendente: { label: "Pendente", className: "bg-warning/15 text-warning border-warning/30", icon: Clock },
  aprovado: { label: "Aprovado", className: "bg-success/15 text-success border-success/30", icon: CheckCircle2 },
  rejeitado: { label: "Não aprovado", className: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle },
};

function formatDate(ts: { seconds: number } | null): string {
  if (!ts) return "—";
  return new Date(ts.seconds * 1000).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const HistoricoCertificados: React.FC<HistoricoCertificadosProps> = ({
  certificados,
  loading,
}) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (certificados.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Inbox className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="mt-4 font-serif text-lg font-medium text-foreground">Nenhum certificado enviado</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Seus certificados aparecerão aqui após o envio
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {certificados.map((cert) => {
        const status = statusConfig[cert.status] || statusConfig.pendente;
        const StatusIcon = status.icon;
        return (
          <div
            key={cert.id}
            className="animate-fade-in rounded-lg border bg-card p-4 transition-shadow hover:shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{cert.nomeArquivo}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatDate(cert.createdAt)}</span>
                  <span>•</span>
                  <span>{formatFileSize(cert.tamanhoBytes)}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="outline" className={status.className}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {status.label}
                </Badge>
                {cert.downloadURL && (
                  <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                    <a href={cert.downloadURL} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Analysis result details */}
            {cert.status === "aprovado" && (
              <div className="mt-3 ml-14 rounded-md bg-success/5 border border-success/20 p-3 space-y-1">
                <p className="text-sm font-medium text-success flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Aprovado
                </p>
                {cert.horasAprovadas != null && cert.horasAprovadas > 0 && (
                  <p className="text-sm text-foreground">
                    Horas validadas: <span className="font-semibold">{cert.horasAprovadas}h</span>
                  </p>
                )}
                {cert.observacaoAdmin && (
                  <p className="text-xs text-muted-foreground">Observação: {cert.observacaoAdmin}</p>
                )}
                {cert.nomeAdmin && cert.dataAnalise && (
                  <p className="text-xs text-muted-foreground">
                    Analisado por {cert.nomeAdmin} em {formatDate(cert.dataAnalise)}
                  </p>
                )}
              </div>
            )}

            {cert.status === "rejeitado" && (
              <div className="mt-3 ml-14 rounded-md bg-destructive/5 border border-destructive/20 p-3 space-y-1">
                <p className="text-sm font-medium text-destructive flex items-center gap-1.5">
                  <XCircle className="h-3.5 w-3.5" />
                  Não aprovado
                </p>
                {cert.motivoRejeicao && (
                  <p className="text-sm text-foreground">Motivo: {cert.motivoRejeicao}</p>
                )}
                {cert.observacaoAdmin && (
                  <p className="text-xs text-muted-foreground">Observação: {cert.observacaoAdmin}</p>
                )}
                {cert.nomeAdmin && cert.dataAnalise && (
                  <p className="text-xs text-muted-foreground">
                    Analisado por {cert.nomeAdmin} em {formatDate(cert.dataAnalise)}
                  </p>
                )}
              </div>
            )}

            {cert.status === "pendente" && (
              <div className="mt-3 ml-14 rounded-md bg-warning/5 border border-warning/20 p-3">
                <p className="text-sm text-warning flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Aguardando análise
                </p>
              </div>
            )}

            {cert.observacaoAluno && (
              <p className="mt-2 ml-14 truncate text-xs text-muted-foreground italic">
                "{cert.observacaoAluno}"
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default HistoricoCertificados;
