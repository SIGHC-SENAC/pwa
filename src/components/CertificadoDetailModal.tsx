import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, FileText, ExternalLink } from "lucide-react";
import { CertificadoMeta, formatFileSize } from "@/services/certificadoService";
import { useIsMobile } from "@/hooks/use-mobile";

interface Props {
  cert: CertificadoMeta | null;
  open: boolean;
  onClose: () => void;
}

const statusConfig = {
  pendente: { label: "Pendente", className: "bg-secondary/15 text-secondary border-secondary/30", icon: Clock },
  aprovado: { label: "Aprovado", className: "bg-success/15 text-success border-success/30", icon: CheckCircle2 },
  rejeitado: { label: "Não aprovado", className: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle },
};

function formatDate(ts: { seconds: number } | null): string {
  if (!ts) return "—";
  return new Date(ts.seconds * 1000).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const CertificadoDetailModal: React.FC<Props> = ({ cert, open, onClose }) => {
  const isMobile = useIsMobile();
  if (!cert) return null;

  const status = statusConfig[cert.status] || statusConfig.pendente;
  const StatusIcon = status.icon;

  const content = (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Status badge */}
      <div className="flex items-center justify-between">
        <Badge variant="outline" className={`${status.className} text-xs px-3 py-1`}>
          <StatusIcon className="h-3.5 w-3.5 mr-1" />
          {status.label}
        </Badge>
        {cert.horasAprovadas != null && cert.horasAprovadas > 0 && (
          <span className="text-lg font-bold text-success">{cert.horasAprovadas}h</span>
        )}
      </div>

      {/* File info */}
      <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground break-words line-clamp-2 overflow-hidden">{cert.nomeArquivo}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatFileSize(cert.tamanhoBytes)} · {formatDate(cert.createdAt)}
          </p>
          {cert.categoriaNome && (
            <p className="text-xs text-primary font-medium mt-1">{cert.categoriaNome}</p>
          )}
        </div>
      </div>

      {/* Observation from student */}
      {cert.observacaoAluno && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Sua observação</p>
          <p className="text-sm text-foreground italic bg-muted/50 rounded-md p-2.5">"{cert.observacaoAluno}"</p>
        </div>
      )}

      {/* Analysis result */}
      {cert.status === "aprovado" && (
        <div className="rounded-lg border border-success/20 bg-success/5 p-4 space-y-2">
          <p className="text-sm font-semibold text-success flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            Certificado Aprovado
          </p>
          {cert.horasAprovadas != null && cert.horasAprovadas > 0 && (
            <p className="text-sm text-foreground">
              Horas validadas: <span className="font-bold">{cert.horasAprovadas}h</span>
            </p>
          )}
          {cert.observacaoAdmin && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Observação da coordenação</p>
              <p className="text-sm text-foreground break-words">{cert.observacaoAdmin}</p>
            </div>
          )}
          {cert.nomeAdmin && cert.dataAnalise && (
            <p className="text-xs text-muted-foreground pt-1 border-t border-success/10">
              Analisado por {cert.nomeAdmin} · {formatDate(cert.dataAnalise)}
            </p>
          )}
        </div>
      )}

      {cert.status === "rejeitado" && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 space-y-2">
          <p className="text-sm font-semibold text-destructive flex items-center gap-1.5">
            <XCircle className="h-4 w-4" />
            Certificado Não Aprovado
          </p>
          {cert.motivoRejeicao && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Motivo</p>
              <p className="text-sm text-foreground break-words">{cert.motivoRejeicao}</p>
            </div>
          )}
          {cert.observacaoAdmin && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Observação da coordenação</p>
              <p className="text-sm text-foreground break-words">{cert.observacaoAdmin}</p>
            </div>
          )}
          {cert.nomeAdmin && cert.dataAnalise && (
            <p className="text-xs text-muted-foreground pt-1 border-t border-destructive/10">
              Analisado por {cert.nomeAdmin} · {formatDate(cert.dataAnalise)}
            </p>
          )}
        </div>
      )}

      {cert.status === "pendente" && (
        <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-4">
          <p className="text-sm text-secondary flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            Aguardando análise da coordenação
          </p>
        </div>
      )}

      {/* Open PDF button */}
      {cert.downloadURL && (
        <Button variant="outline" size="sm" asChild className="w-full">
          <a href={cert.downloadURL} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Abrir PDF
          </a>
        </Button>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
        <DrawerContent className="max-h-[85vh] mx-2 rounded-t-2xl">
          <DrawerHeader className="px-4 pb-2 border-b border-border/50">
            <DrawerTitle className="text-base font-bold text-primary">Detalhes do Certificado</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md w-[calc(100%-2rem)] overflow-hidden p-0">
        <DialogHeader className="px-4 pt-5 pb-0 sm:px-6">
          <DialogTitle className="text-lg font-bold text-primary">Detalhes do Certificado</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">{content}</div>
      </DialogContent>
    </Dialog>
  );
};

export default CertificadoDetailModal;
