import React, { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, FileText, ExternalLink } from "lucide-react";
import { CertificadoMeta, formatFileSize } from "@/services/certificadoService";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

interface PdfViewerModalProps {
  cert: CertificadoMeta | null;
  open: boolean;
  onClose: () => void;
  onAprovar: (certId: string, horas: number, obs: string) => Promise<void>;
  onRejeitar: (certId: string, motivo: string, obs: string) => Promise<void>;
}

const statusConfig: Record<string, { label: string; className: string }> = {
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

const AnalysisContent: React.FC<{
  cert: CertificadoMeta;
  onClose: () => void;
  onAprovar: (certId: string, horas: number, obs: string) => Promise<void>;
  onRejeitar: (certId: string, motivo: string, obs: string) => Promise<void>;
  isMobile: boolean;
}> = ({ cert, onClose, onAprovar, onRejeitar, isMobile }) => {
  const [horas, setHoras] = useState<string>(cert.horasAprovadas?.toString() || "");
  const [obsAdmin, setObsAdmin] = useState(cert.observacaoAdmin || "");
  const [motivo, setMotivo] = useState(cert.motivoRejeicao || "");
  const [actionLoading, setActionLoading] = useState<"aprovar" | "rejeitar" | null>(null);
  const [pdfLoading, setPdfLoading] = useState(true);

  React.useEffect(() => {
    setHoras(cert.horasAprovadas?.toString() || "");
    setObsAdmin(cert.observacaoAdmin || "");
    setMotivo(cert.motivoRejeicao || "");
    setPdfLoading(true);
  }, [cert]);

  const status = statusConfig[cert.status] || statusConfig.pendente;
  const isPendente = cert.status === "pendente";

  const handleAprovar = async () => {
    const h = parseFloat(horas);
    if (!horas || isNaN(h) || h <= 0) {
      toast.error("Informe um número válido de horas.");
      return;
    }
    setActionLoading("aprovar");
    try {
      await onAprovar(cert.id, h, obsAdmin);
      toast.success("Certificado aprovado com sucesso!");
      onClose();
    } catch {
      toast.error("Erro ao aprovar certificado.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejeitar = async () => {
    if (!motivo.trim()) {
      toast.error("Informe o motivo da rejeição.");
      return;
    }
    setActionLoading("rejeitar");
    try {
      await onRejeitar(cert.id, motivo, obsAdmin);
      toast.success("Certificado rejeitado.");
      onClose();
    } catch {
      toast.error("Erro ao rejeitar certificado.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className={`flex-1 flex ${isMobile ? "flex-col" : "flex-col lg:flex-row"} overflow-hidden`}>
      {/* PDF Viewer */}
      <div className={`${isMobile ? "h-[40vh]" : "flex-1 min-h-[300px] lg:min-h-0"} bg-muted relative ${isMobile ? "border-b" : "border-b lg:border-b-0 lg:border-r"}`}>
        {pdfLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {cert.downloadURL ? (
          <iframe
            src={`${cert.downloadURL}#toolbar=1&navpanes=0`}
            className="w-full h-full"
            title="Visualização do PDF"
            onLoad={() => setPdfLoading(false)}
            onError={() => setPdfLoading(false)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <FileText className="h-10 w-10 sm:h-12 sm:w-12" />
            <p className="text-sm">Não foi possível carregar o PDF</p>
          </div>
        )}
      </div>

      {/* Details & Actions */}
      <div className={`${isMobile ? "flex-1" : "w-full lg:w-[380px]"} shrink-0 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5`}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-semibold text-foreground text-sm sm:text-base">Dados do envio</h3>
            <Badge variant="outline" className={status.className}>{status.label}</Badge>
          </div>

          <div className="space-y-1.5 sm:space-y-2 text-sm">
            <div className="flex gap-1"><span className="text-muted-foreground shrink-0">Aluno:</span> <span className="font-medium text-foreground truncate">{cert.nomeAluno}</span></div>
            <div className="flex gap-1"><span className="text-muted-foreground shrink-0">E-mail:</span> <span className="font-medium text-foreground truncate">{cert.emailAluno}</span></div>
            <div className="flex gap-1"><span className="text-muted-foreground shrink-0">Arquivo:</span> <span className="font-medium text-foreground break-all">{cert.nomeArquivo}</span></div>
            <div className="flex gap-1"><span className="text-muted-foreground shrink-0">Tamanho:</span> <span className="font-medium text-foreground">{formatFileSize(cert.tamanhoBytes)}</span></div>
            <div className="flex gap-1"><span className="text-muted-foreground shrink-0">Envio:</span> <span className="font-medium text-foreground">{formatDate(cert.createdAt)}</span></div>
            {cert.observacaoAluno && (
              <div>
                <span className="text-muted-foreground">Obs. do aluno:</span>
                <p className="mt-1 text-foreground italic text-xs bg-muted rounded-md p-2 break-words">"{cert.observacaoAluno}"</p>
              </div>
            )}
          </div>

          {cert.downloadURL && (
            <Button variant="outline" size="sm" asChild className="w-full">
              <a href={cert.downloadURL} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                Abrir PDF em nova aba
              </a>
            </Button>
          )}
        </div>

        <div className="h-px bg-border" />

        {/* Analysis fields */}
        <div className="space-y-3 sm:space-y-4">
          <h3 className="font-serif font-semibold text-foreground text-sm sm:text-base">Análise</h3>

          <div>
            <label className="text-sm font-medium text-foreground">Horas aprovadas</label>
            <Input
              type="number"
              min="0"
              step="0.5"
              value={horas}
              onChange={(e) => setHoras(e.target.value)}
              placeholder="Ex: 20"
              className="mt-1"
              disabled={!isPendente || actionLoading !== null}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Observação do admin</label>
            <Textarea
              value={obsAdmin}
              onChange={(e) => setObsAdmin(e.target.value)}
              placeholder="Observação opcional..."
              className="mt-1 resize-none"
              rows={2}
              disabled={!isPendente || actionLoading !== null}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Motivo da rejeição</label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Obrigatório para rejeição..."
              className="mt-1 resize-none"
              rows={2}
              disabled={!isPendente || actionLoading !== null}
            />
          </div>

          {!isPendente && cert.nomeAdmin && (
            <div className="text-xs text-muted-foreground space-y-1 bg-muted rounded-md p-3">
              <p>Analisado por: <span className="font-medium text-foreground">{cert.nomeAdmin}</span></p>
              <p>Data: <span className="font-medium text-foreground">{formatDate(cert.dataAnalise)}</span></p>
            </div>
          )}
        </div>

        {isPendente && (
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleAprovar}
              disabled={actionLoading !== null}
              className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
              size={isMobile ? "lg" : "default"}
            >
              {actionLoading === "aprovar" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Aprovar
            </Button>
            <Button
              onClick={handleRejeitar}
              disabled={actionLoading !== null}
              variant="destructive"
              className="flex-1"
              size={isMobile ? "lg" : "default"}
            >
              {actionLoading === "rejeitar" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Rejeitar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  cert,
  open,
  onClose,
  onAprovar,
  onRejeitar,
}) => {
  const isMobile = useIsMobile();

  if (!cert) return null;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
        <DrawerContent className="h-[95vh] flex flex-col">
          <DrawerHeader className="px-4 py-3 border-b shrink-0">
            <DrawerTitle className="font-serif text-lg">Análise do Certificado</DrawerTitle>
          </DrawerHeader>
          <AnalysisContent
            cert={cert}
            onClose={onClose}
            onAprovar={onAprovar}
            onRejeitar={onRejeitar}
            isMobile={isMobile}
          />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="font-serif text-xl">Análise do Certificado</DialogTitle>
        </DialogHeader>
        <AnalysisContent
          cert={cert}
          onClose={onClose}
          onAprovar={onAprovar}
          onRejeitar={onRejeitar}
          isMobile={false}
        />
      </DialogContent>
    </Dialog>
  );
};

export default PdfViewerModal;
