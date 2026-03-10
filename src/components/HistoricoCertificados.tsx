import React, { useState } from "react";
import { FileText, ExternalLink, Inbox, CheckCircle2, XCircle, Clock, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CertificadoMeta, formatFileSize } from "@/services/certificadoService";
import { cn } from "@/lib/utils";

interface HistoricoCertificadosProps {
  certificados: CertificadoMeta[];
  loading: boolean;
}

const statusConfig = {
  pendente: { label: "Pendente", className: "bg-secondary/15 text-secondary border-secondary/30", icon: Clock },
  aprovado: { label: "Aprovado", className: "bg-success/15 text-success border-success/30", icon: CheckCircle2 },
  rejeitado: { label: "Rejeitado", className: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle },
};

function formatDate(ts: { seconds: number } | null): string {
  if (!ts) return "—";
  return new Date(ts.seconds * 1000).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const CertificadoRow: React.FC<{ cert: CertificadoMeta }> = ({ cert }) => {
  const [expanded, setExpanded] = useState(false);
  const status = statusConfig[cert.status] || statusConfig.pendente;
  const StatusIcon = status.icon;
  const hasDetails = cert.observacaoAdmin || cert.motivoRejeicao || cert.observacaoAluno || cert.nomeAdmin;

  return (
    <div className="rounded-lg border bg-card transition-shadow hover:shadow-sm">
      {/* Compact row */}
      <div
        className={cn("flex items-center gap-2.5 px-3 py-2.5 cursor-pointer", hasDetails && "cursor-pointer")}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        <FileText className="h-4 w-4 text-primary shrink-0" />
        <p className="truncate text-sm font-medium text-foreground flex-1 min-w-0">{cert.nomeArquivo}</p>
        <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">{formatDate(cert.createdAt)}</span>
        {cert.status === "aprovado" && cert.horasAprovadas != null && cert.horasAprovadas > 0 && (
          <span className="text-xs font-bold text-foreground shrink-0">{cert.horasAprovadas}h</span>
        )}
        <Badge variant="outline" className={`${status.className} text-[10px] shrink-0`}>
          <StatusIcon className="h-3 w-3 mr-0.5" />
          {status.label}
        </Badge>
        {cert.downloadURL && (
          <Button variant="ghost" size="icon" asChild className="h-7 w-7 shrink-0" onClick={(e) => e.stopPropagation()}>
            <a href={cert.downloadURL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        )}
        {hasDetails && (
          <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0", expanded && "rotate-180")} />
        )}
      </div>

      {/* Expandable details */}
      {expanded && (
        <div className="border-t px-3 py-2.5 space-y-1.5 animate-fade-in text-xs">
          <span className="text-muted-foreground sm:hidden">{formatDate(cert.createdAt)} • {formatFileSize(cert.tamanhoBytes)}</span>
          {cert.status === "aprovado" && cert.observacaoAdmin && (
            <p className="text-muted-foreground">Observação: {cert.observacaoAdmin}</p>
          )}
          {cert.status === "rejeitado" && cert.motivoRejeicao && (
            <p className="text-destructive">Motivo: {cert.motivoRejeicao}</p>
          )}
          {cert.status === "rejeitado" && cert.observacaoAdmin && (
            <p className="text-muted-foreground">Observação: {cert.observacaoAdmin}</p>
          )}
          {cert.observacaoAluno && (
            <p className="text-muted-foreground italic">"{cert.observacaoAluno}"</p>
          )}
          {cert.nomeAdmin && cert.dataAnalise && (
            <p className="text-muted-foreground">
              Analisado por {cert.nomeAdmin} em {formatDate(cert.dataAnalise)}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const HistoricoCertificados: React.FC<HistoricoCertificadosProps> = ({ certificados, loading }) => {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (certificados.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Inbox className="h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm font-bold text-foreground">Nenhum certificado enviado</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Seus certificados aparecerão aqui após o envio</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {certificados.map((cert) => (
        <CertificadoRow key={cert.id} cert={cert} />
      ))}
    </div>
  );
};

export default HistoricoCertificados;
