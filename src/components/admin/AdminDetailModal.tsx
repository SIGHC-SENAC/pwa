import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, ExternalLink, FileText, User, Mail, Calendar, MessageSquare, HardDrive } from "lucide-react";
import type { CertificadoAdmin } from "@/services/adminCertificadoService";
import { aprovarCertificado, rejeitarCertificado, formatTimestamp } from "@/services/adminCertificadoService";
import { formatFileSize } from "@/services/certificadoService";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  cert: CertificadoAdmin | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

const statusBadge = (status: string) => {
  switch (status) {
    case "pendente":
      return <Badge className="bg-warning/15 text-status-pending border-warning/30">Pendente</Badge>;
    case "aprovado":
      return <Badge className="bg-success/15 text-status-approved border-success/30">Aprovado</Badge>;
    case "rejeitado":
      return <Badge className="bg-destructive/15 text-status-rejected border-destructive/30">Rejeitado</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const AdminDetailModal: React.FC<Props> = ({ cert, open, onClose, onUpdated }) => {
  const { user, userData } = useAuth();
  const [horas, setHoras] = useState("");
  const [observacao, setObservacao] = useState("");
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (cert) {
      setHoras(cert.horasAprovadas?.toString() ?? "");
      setObservacao((cert as any).observacaoAdmin ?? "");
    }
  }, [cert]);

  if (!cert) return null;

  const handleAprovar = async () => {
    const horasNum = parseFloat(horas);
    if (!horas || isNaN(horasNum) || horasNum <= 0) {
      toast.error("Informe uma quantidade válida de horas.");
      return;
    }
    if (!user) return;
    setLoading(true);
    try {
      await aprovarCertificado(
        cert.id,
        user.uid,
        user.displayName || userData?.nome || "Admin",
        horasNum,
        observacao.trim()
      );
      toast.success("Certificado aprovado com sucesso!");
      onUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao aprovar certificado.");
    } finally {
      setLoading(false);
    }
  };

  const handleRejeitar = async () => {
    if (!observacao.trim()) {
      toast.error("Informe o motivo da rejeição.");
      return;
    }
    if (!user) return;
    setLoading(true);
    try {
      await rejeitarCertificado(
        cert.id,
        user.uid,
        user.displayName || userData?.nome || "Admin",
        observacao.trim()
      );
      toast.success("Certificado rejeitado.");
      onUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao rejeitar certificado.");
    } finally {
      setLoading(false);
    }
  };

  const isPendente = cert.status === "pendente";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Detalhes do Certificado</DialogTitle>
          <DialogDescription>Analise e valide o certificado enviado pelo aluno.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info do aluno */}
          <div className="grid gap-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Aluno:</span>
              <span className="font-medium text-foreground">{cert.nomeAluno}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium text-foreground">{cert.emailAluno}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Arquivo:</span>
              <span className="font-medium text-foreground truncate">{cert.nomeArquivo}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Tamanho:</span>
              <span className="font-medium text-foreground">{formatFileSize(cert.tamanhoBytes)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Enviado em:</span>
              <span className="font-medium text-foreground">{formatTimestamp(cert.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Status:</span>
              {statusBadge(cert.status)}
            </div>
          </div>

          {cert.observacaoAluno && (
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-1">
                <MessageSquare className="h-4 w-4" />
                Observação do aluno
              </div>
              <p className="text-sm text-muted-foreground">{cert.observacaoAluno}</p>
            </div>
          )}

          <Button variant="outline" size="sm" className="w-full gap-2" asChild>
            <a href={cert.downloadURL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Abrir PDF
            </a>
          </Button>

          <Separator />

          {/* Análise */}
          <div className="space-y-3">
            <h4 className="font-serif text-sm font-semibold text-foreground">Análise</h4>
            <div>
              <label className="text-sm font-medium text-foreground">Horas aprovadas</label>
              <Input
                type="number"
                min="0"
                step="0.5"
                placeholder="Ex: 10"
                value={horas}
                onChange={(e) => setHoras(e.target.value)}
                className="mt-1"
                disabled={loading || !isPendente}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">
                Observação do admin {!isPendente ? "" : <span className="text-muted-foreground font-normal">(obrigatório para rejeição)</span>}
              </label>
              <Textarea
                placeholder="Motivo da aprovação/rejeição..."
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                className="mt-1 resize-none"
                rows={3}
                disabled={loading || !isPendente}
              />
            </div>
          </div>

          {!isPendente && cert.nomeAdmin && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p><span className="text-muted-foreground">Analisado por:</span> <span className="font-medium">{cert.nomeAdmin}</span></p>
              {cert.dataAnalise && <p><span className="text-muted-foreground">Data:</span> <span className="font-medium">{formatTimestamp(cert.dataAnalise as any)}</span></p>}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {isPendente && (
            <>
              <Button variant="destructive" onClick={handleRejeitar} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Rejeitar
              </Button>
              <Button onClick={handleAprovar} disabled={loading} className="gap-2 bg-success hover:bg-success/90 text-success-foreground">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Aprovar
              </Button>
            </>
          )}
          {!isPendente && (
            <Button variant="outline" onClick={onClose}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminDetailModal;
