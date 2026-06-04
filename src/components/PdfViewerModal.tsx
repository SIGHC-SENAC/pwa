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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle2, XCircle, FileText, ExternalLink } from "lucide-react";
import { CertificadoMeta, getDownloadURLFromPath } from "@/services/certificadoService";
import { fetchCursoById, type GrupoAtividade } from "@/services/cursoService";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface PdfViewerModalProps {
  cert: CertificadoMeta | null;
  open: boolean;
  onClose: () => void;
  onAprovar: (certId: string, horas: number, obs: string) => Promise<void>;
  onRejeitar: (certId: string, motivo: string, obs: string) => Promise<void>;
  onAtualizarCategoria: (certId: string, categoriaId: string | null, categoriaNome: string | null) => Promise<void>;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-secondary/15 text-secondary border-secondary/30" },
  aprovado: { label: "Aprovado", className: "bg-success/15 text-success border-success/30" },
  rejeitado: { label: "Rejeitado", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

// Aceita Firestore Timestamp { seconds }, numero em ms (Date.now()) ou numero em segundos.
function formatDate(ts: { seconds: number } | number | null | undefined): string {
  if (!ts) return "—";
  const ms = typeof ts === "number"
    ? (ts > 1e10 ? ts : ts * 1000)
    : ts.seconds * 1000;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  cert,
  open,
  onClose,
  onAprovar,
  onRejeitar,
  onAtualizarCategoria,
}) => {
  const [horas, setHoras] = useState<string>("");
  const [motivo, setMotivo] = useState("");
  const [actionLoading, setActionLoading] = useState<"aprovar" | "rejeitar" | null>(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState(false);
  const [showPdfFallback, setShowPdfFallback] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [categoriaSaving, setCategoriaSaving] = useState(false);
  const [gruposAtividades, setGruposAtividades] = useState<GrupoAtividade[]>([]);
  const isMobile = useIsMobile();

  React.useEffect(() => {
    if (cert) {
      setHoras(cert.horasAprovadas?.toString() || "");
      setMotivo(cert.motivoRejeicao || "");
      setPdfLoading(true);
      setPdfError(false);
      setShowPdfFallback(false);
      setPdfUrl(cert.downloadURL || "");
      setCategoriaId(cert.categoriaId || "");
    }
  }, [cert]);

  React.useEffect(() => {
    let active = true;
    if (!cert?.cursoId) { setGruposAtividades([]); return; }

    fetchCursoById(cert.cursoId)
      .then((curso) => { if (active) setGruposAtividades(curso.regrasAtividades ?? []); })
      .catch(() => { if (active) setGruposAtividades([]); });

    return () => { active = false; };
  }, [cert?.cursoId]);

  React.useEffect(() => {
    if (!open || !cert) return;
    if (cert.downloadURL) {
      setPdfUrl(cert.downloadURL);
      return;
    }
    if (!cert.storagePath) {
      setPdfLoading(false);
      setPdfError(true);
      return;
    }

    let cancelled = false;
    setPdfLoading(true);
    getDownloadURLFromPath(cert.storagePath)
      .then((url) => {
        if (cancelled) return;
        setPdfUrl(url);
        setPdfError(false);
      })
      .catch(() => {
        if (cancelled) return;
        setPdfLoading(false);
        setPdfError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [cert, open]);

  React.useEffect(() => {
    if (!open || !pdfUrl || !pdfLoading) return;

    const timer = window.setTimeout(() => {
      setShowPdfFallback(true);
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [open, pdfLoading, pdfUrl]);

  if (!cert) return null;

  const status = statusConfig[cert.status] || statusConfig.pendente;
  const isPendente = cert.status === "pendente";
  const categoriaChanged = categoriaId !== (cert.categoriaId || "");
  const categoriaSelecionada = categoriaId
    ? gruposAtividades.flatMap((grupo) => grupo.atividades).find((atividade) => atividade.id === categoriaId)     : undefined;

  const handleAprovar = async () => {
    const h = Number(horas);
    if (!horas || !Number.isInteger(h) || h <= 0) {
      toast.error("Informe um número válido de horas.");
      return;
    }
    if (categoriaSelecionada?.horasMaximas && h > categoriaSelecionada.horasMaximas) {
      toast.error(`O limite desta atividade e ${categoriaSelecionada.horasMaximas}h.`);
      return;
    }
    setActionLoading("aprovar");
    try {
      await onAprovar(cert.id, h, "");
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
      await onRejeitar(cert.id, motivo, "");
      toast.success("Certificado rejeitado.");
      onClose();
    } catch {
      toast.error("Erro ao rejeitar certificado.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSalvarCategoria = async () => {
    if (!categoriaChanged) return;

    const categoria = categoriaId
      ? gruposAtividades.flatMap((grupo) => grupo.atividades).find((atividade) => atividade.id === categoriaId)       : undefined;
    const categoriaNome = categoria ? `${categoria.id} - ${categoria.descricao}` : null;

    setCategoriaSaving(true);
    try {
      await onAtualizarCategoria(cert.id, categoriaId || null, categoriaNome);
      toast.success("Categoria atualizada com sucesso.");
    } catch {
      toast.error("Erro ao atualizar categoria.");
    } finally {
      setCategoriaSaving(false);
    }
  };

  const openPdfButton = pdfUrl ? (
    <Button variant="outline" size="sm" asChild className="bg-background/95">
      <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
        <ExternalLink className="h-3.5 w-3.5 mr-1" />
        Abrir documento em outra página
      </a>
    </Button>
  ) : null;

  const pdfViewer = (
    <div className="bg-muted relative h-full min-h-[250px] sm:min-h-[300px]">
      {openPdfButton && (
        <div className="absolute right-3 top-3 z-20">
          {openPdfButton}
        </div>
      )}
      {pdfLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted z-10 px-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          {showPdfFallback && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-muted-foreground">
                O documento está demorando para carregar.
              </p>
            </div>
          )}
        </div>
      )}
      {pdfError ? (
        <div className="flex h-full min-h-[250px] flex-col items-center justify-center gap-3 px-4 py-12 text-center text-muted-foreground sm:min-h-[300px]">
          <FileText className="h-12 w-12" />
          <div>
            <p className="text-sm font-medium text-foreground">Não foi possível carregar a pré-visualização</p>
            <p className="mt-1 text-xs">Abra o documento em outra página para continuar a análise.</p>
          </div>
        </div>
      ) : pdfUrl ? (
        <iframe
          src={`${pdfUrl}#toolbar=1&navpanes=0`}
          className="h-full min-h-[250px] w-full sm:min-h-[300px]"
          title="Visualização do PDF"
          onLoad={() => {
            setPdfLoading(false);
            setPdfError(false);
          }}
          onError={() => {
            setPdfLoading(false);
            setPdfError(true);
          }}
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
          <FileText className="h-12 w-12" />
          <p className="text-sm">Não foi possível carregar o PDF</p>
        </div>
      )}
    </div>
  );

  const detailsPanel = (
    <div className="overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground text-sm sm:text-base">Dados do envio</h3>
          <Badge variant="outline" className={status.className}>{status.label}</Badge>
        </div>

        <div className="space-y-1.5 sm:space-y-2 text-sm">
          <div className="break-words"><span className="text-muted-foreground">Aluno:</span> <span className="font-medium text-foreground">{cert.nomeAluno}</span></div>
          <div className="break-words"><span className="text-muted-foreground">E-mail:</span> <span className="font-medium text-foreground">{cert.emailAluno}</span></div>
          <div className="break-words"><span className="text-muted-foreground">Arquivo:</span> <span className="font-medium text-foreground">{cert.nomeArquivo}</span></div>
          <div className="space-y-2">
            <span className="text-muted-foreground">Categoria:</span>
            <Select value={categoriaId || "sem-categoria"} onValueChange={(value) => setCategoriaId(value === "sem-categoria" ? "" : value)}>
              <SelectTrigger className="min-h-10 bg-background">
                <SelectValue placeholder="Selecionar categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sem-categoria">Sem categoria</SelectItem>
                {gruposAtividades.map((grupo) => (
                  <SelectGroup key={grupo.id}>
                    <SelectLabel>{grupo.label}</SelectLabel>
                    {grupo.atividades.map((atividade) => (
                      <SelectItem key={atividade.id} value={atividade.id}>
                        {atividade.id} - {atividade.descricao}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            {categoriaChanged && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleSalvarCategoria}
                disabled={categoriaSaving}
                className="w-full"
              >
                {categoriaSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Salvar categoria
              </Button>
            )}
          </div>
          <div><span className="text-muted-foreground">Envio:</span> <span className="font-medium text-foreground">{formatDate(cert.createdAt)}</span></div>
          {cert.observacaoAluno && (
            <div>
              <span className="text-muted-foreground">Obs. do aluno:</span>
              <p className="mt-1 text-foreground italic text-xs bg-muted rounded-md p-2">"{cert.observacaoAluno}"</p>
            </div>
          )}
        </div>

      </div>

      <div className="h-px bg-border" />

      {/* Analysis fields */}
      <div className="space-y-3 sm:space-y-4">
        <h3 className="font-semibold text-foreground text-sm sm:text-base">Análise</h3>

        <div>
          <label className="text-sm font-medium text-foreground">Horas aprovadas</label>
          <Input
            type="number"
            min="1"
            step="1"
            max={categoriaSelecionada?.horasMaximas}
            value={horas}
            onChange={(e) => setHoras(e.target.value)}
            placeholder="Ex: 20"
            className="mt-1"
            disabled={!isPendente || actionLoading !== null}
          />
          {categoriaSelecionada?.horasMaximas ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Limite da atividade: {categoriaSelecionada.horasMaximas}h
            </p>
          ) : null}
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
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
        <DrawerContent className="max-h-[92vh] mx-2 flex flex-col rounded-t-2xl">
          <DrawerHeader className="px-4 pb-2 shrink-0 border-b border-primary/10">
            <DrawerTitle className="text-lg font-bold text-primary">Análise do Certificado</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto">
            <div className="h-[300px]">
              {pdfViewer}
            </div>
            {detailsPanel}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-6xl w-[calc(100%-2rem)] h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0 bg-primary/5">
          <DialogTitle className="text-xl font-bold text-primary">Análise do Certificado</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-row overflow-hidden">
          <div className="relative min-h-0 flex-1 border-r bg-muted">
            {pdfViewer}
          </div>
          <div className="w-[380px] shrink-0 overflow-y-auto">
            {detailsPanel}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PdfViewerModal;
