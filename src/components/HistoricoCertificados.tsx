import React from "react";
import { FileText, ExternalLink, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CertificadoMeta, formatFileSize } from "@/services/certificadoService";

interface HistoricoCertificadosProps {
  certificados: CertificadoMeta[];
  loading: boolean;
}

const statusConfig = {
  pendente: { label: "Pendente", className: "bg-warning/15 text-warning border-warning/30" },
  aprovado: { label: "Aprovado", className: "bg-success/15 text-success border-success/30" },
  rejeitado: { label: "Rejeitado", className: "bg-destructive/15 text-destructive border-destructive/30" },
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
        return (
          <div
            key={cert.id}
            className="animate-fade-in flex items-center gap-4 rounded-lg border bg-card p-4 transition-shadow hover:shadow-sm"
          >
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
              {cert.observacaoAluno && (
                <p className="mt-1 truncate text-xs text-muted-foreground italic">
                  "{cert.observacaoAluno}"
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="outline" className={status.className}>
                {status.label}
              </Badge>
              {cert.downloadURL && (
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="h-8 w-8"
                >
                  <a href={cert.downloadURL} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HistoricoCertificados;
