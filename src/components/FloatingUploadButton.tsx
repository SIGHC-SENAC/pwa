import React, { useEffect, useRef, useState } from "react";
import { Upload, Send, Loader2, Info, ChevronRight, ScanText, ArrowLeft, Sparkles, AlertTriangle, AlertCircle, Shield, FileSearch, BadgeCheck, XCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import UploadDropzone from "@/components/UploadDropzone";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  type GrupoAtividade,
  findAtividadeInGrupos,
  findGrupoByAtividadeId,
} from "@/services/cursoService";

interface FloatingUploadButtonProps {
  cursos?: Array<{ id?: string; nome: string; codigo?: string; turno?: string }>;
  gruposAtividades?: GrupoAtividade[];
  cursoId?: string;
  onCursoChange?: (value: string) => void;
  file: File | null;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  categoriaId: string;
  onCategoriaChange: (value: string) => void;
  uploading: boolean;
  progress: number;
  onUpload: () => void;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  step?: "anexo" | "informacoes";
  ocrText?: string;
  ocrLoading?: boolean;
  ocrError?: boolean;
  uploadError?: string | null;
  uploadSuccess?: boolean;
  aiSuggestion?: { grupoId: string; categoriaId: string } | null;
  onNextStep?: () => void;
  onBack?: () => void;
}

const FloatingUploadButton: React.FC<FloatingUploadButtonProps> = ({
  file,
  onFileSelect,
  onFileRemove,
  categoriaId,
  onCategoriaChange,
  uploading,
  progress,
  onUpload,
  open: openProp,
  onOpenChange,
  cursos = [],
  gruposAtividades,
  cursoId = "",
  onCursoChange,
  step = "anexo",
  ocrText = "",
  ocrLoading = false,
  ocrError = false,
  uploadError = null,
  uploadSuccess = false,
  aiSuggestion,
  onNextStep,
  onBack,
}) => {
  const [openInternal, setOpenInternal] = useState(false);
  const [grupoId, setGrupoId] = useState("");
  const [aiLoadingPhase, setAiLoadingPhase] = useState(0);
  const [uploadingPhase, setUploadingPhase] = useState(0);
  const controlled = openProp !== undefined && onOpenChange !== undefined;
  const open = controlled ? openProp : openInternal;
  const setOpen = controlled ? onOpenChange : setOpenInternal;
  const isMobile = useIsMobile();
  const wasUploading = useRef(false);

  useEffect(() => {
    if (uploading) {
      wasUploading.current = true;
      return;
    }

    if (wasUploading.current && !file) {
      wasUploading.current = false;
      setOpen(false);
    }
  }, [file, setOpen, uploading]);

  const gruposDisponiveis = gruposAtividades ?? [];

  useEffect(() => {
    if (categoriaId) {
      const grupo = findGrupoByAtividadeId(gruposDisponiveis, categoriaId);
      setGrupoId(grupo?.id ?? "");
    }
  }, [categoriaId, gruposDisponiveis]);

  // Reset grupoId when step goes back to anexo
  useEffect(() => {
    if (step === "anexo") {
      setGrupoId("");
    }
  }, [step]);

  // Auto-fill group and category from AI suggestion when entering step 2
  useEffect(() => {
    if (!aiSuggestion || step !== "informacoes") return;
    setGrupoId(aiSuggestion.grupoId);
    if (aiSuggestion.categoriaId) {
      onCategoriaChange(aiSuggestion.categoriaId);
    }
  }, [aiSuggestion, step, onCategoriaChange]);

  // Cycle through loading phases while ocrLoading is true
  useEffect(() => {
    if (!ocrLoading) {
      setAiLoadingPhase(0);
      return;
    }
    const t1 = setTimeout(() => setAiLoadingPhase(1), 3500);
    const t2 = setTimeout(() => setAiLoadingPhase(2), 7000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [ocrLoading]);

  // Cycle through security analysis phases while uploading
  useEffect(() => {
    if (!uploading) {
      setUploadingPhase(0);
      return;
    }
    const t1 = setTimeout(() => setUploadingPhase(1), 2500);
    const t2 = setTimeout(() => setUploadingPhase(2), 5000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [uploading]);

  const categoriaInfo = categoriaId ? findAtividadeInGrupos(gruposDisponiveis, categoriaId) : null;
  const grupoSelecionado = gruposDisponiveis.find((grupo) => grupo.id === grupoId);

  const handleGrupoChange = (value: string) => {
    setGrupoId(value);
    onCategoriaChange("");
  };

  // Extrai o maior valor de horas encontrado no texto OCR (ex: "40 horas", "20h", "8 hrs")
  const horasExtraidas = (() => {
    if (!ocrText) return null;
    const matches = [...ocrText.matchAll(/(\d+(?:[,\.]\d+)?)\s*h(?:oras?|rs?)?\b/gi)];
    if (matches.length === 0) return null;
    const valores = matches.map((m) => parseFloat(m[1].replace(",", ".")));
    return Math.max(...valores);
  })();

  const stepIndicator = (
    <div className="mb-1 flex items-center gap-2">
      <div
        className={`flex items-center gap-1.5 text-sm font-medium ${
          step === "anexo" ? "text-primary" : "text-muted-foreground"
        }`}
      >
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
            step === "anexo" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          1
        </span>
        Anexo
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
      <div
        className={`flex items-center gap-1.5 text-sm font-medium ${
          step === "informacoes" ? "text-primary" : "text-muted-foreground"
        }`}
      >
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
            step === "informacoes"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          2
        </span>
        Informações
      </div>
    </div>
  );

  const aiLoadingPhases = [
    { Icon: Upload,    title: "Enviando documento",   subtitle: "Transferência segura do arquivo..." },
    { Icon: ScanText,  title: "Extraindo texto",       subtitle: "Lendo o certificado com OCR..." },
    { Icon: Sparkles,  title: "Analisando com IA",     subtitle: "Identificando o tipo de atividade..." },
  ];
  const { Icon: PhaseIcon, title: phaseTitle, subtitle: phaseSubtitle } = aiLoadingPhases[aiLoadingPhase];

  const isOcrErrorPhase = ocrError;

  const loadingContent = (
    <div className="flex flex-col items-center gap-6 py-4">
      {stepIndicator}

      {/* Animated rings + phase icon */}
      <div className="relative flex h-40 w-40 items-center justify-center">
        <div
          className={`absolute inset-0 rounded-full border-2 animate-ping ${isOcrErrorPhase ? "border-destructive/25" : "border-primary/20"}`}
          style={{ animationDuration: "2.2s" }}
        />
        <div
          className={`absolute inset-5 rounded-full border-2 animate-ping ${isOcrErrorPhase ? "border-destructive/35" : "border-primary/30"}`}
          style={{ animationDuration: "2.2s", animationDelay: "0.55s" }}
        />
        <div
          className={`absolute inset-10 rounded-full animate-pulse ${isOcrErrorPhase ? "bg-destructive/10" : "bg-primary/10"}`}
          style={{ animationDuration: "1.8s" }}
        />
        <div
          className={`relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full shadow-lg ring-2 ${
            isOcrErrorPhase
              ? "bg-gradient-to-br from-destructive/30 to-destructive/10 shadow-destructive/20 ring-destructive/20"
              : "bg-gradient-to-br from-primary/30 to-primary/10 shadow-primary/20 ring-primary/20"
          }`}
        >
          {isOcrErrorPhase ? (
            <AlertCircle key="error" className="h-8 w-8 text-destructive" />
          ) : (
            <PhaseIcon key={aiLoadingPhase} className="h-8 w-8 text-primary" />
          )}
        </div>
      </div>

      {/* Phase label */}
      {isOcrErrorPhase ? (
        <div className="animate-fade-in space-y-1.5 text-center">
          <p className="text-base font-semibold text-destructive">Falha ao extrair texto</p>
          <p className="text-sm text-muted-foreground">Continuando sem extração automática...</p>
        </div>
      ) : (
        <div key={aiLoadingPhase} className="animate-fade-in space-y-1.5 text-center">
          <p className="text-base font-semibold text-foreground">{phaseTitle}</p>
          <p className="text-sm text-muted-foreground">{phaseSubtitle}</p>
        </div>
      )}

      {/* Bouncing dots */}
      <div className="flex gap-2">
        <span className={`h-2 w-2 rounded-full animate-bounce ${isOcrErrorPhase ? "bg-destructive/60" : "bg-primary"}`} />
        <span className={`h-2 w-2 rounded-full animate-bounce ${isOcrErrorPhase ? "bg-destructive/40" : "bg-primary/70"}`} style={{ animationDelay: "0.15s" }} />
        <span className={`h-2 w-2 rounded-full animate-bounce ${isOcrErrorPhase ? "bg-destructive/20" : "bg-primary/40"}`} style={{ animationDelay: "0.3s" }} />
      </div>

      {/* Progress bar only during upload phase */}
      {aiLoadingPhase === 0 && progress > 0 && (
        <div className="w-full space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Enviando...</span>
            <span className="font-medium text-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      )}
    </div>
  );

  const securityPhases = [
    { Icon: Shield,      title: "Analisando segurança",    subtitle: "Verificando estrutura do PDF..." },
    { Icon: FileSearch,  title: "Validando documento",      subtitle: "Procurando por conteúdo suspeito..." },
    { Icon: BadgeCheck,  title: "Registrando atividade",    subtitle: "Salvando seu certificado..." },
  ];
  const { Icon: SecIcon, title: secTitle, subtitle: secSubtitle } = securityPhases[uploadingPhase];

  const ringColor = uploadSuccess
    ? "border-emerald-500/25"
    : uploadError
    ? "border-destructive/25"
    : "border-primary/20";
  const ringColor2 = uploadSuccess
    ? "border-emerald-500/35"
    : uploadError
    ? "border-destructive/35"
    : "border-primary/30";
  const pulseColor = uploadSuccess
    ? "bg-emerald-500/10"
    : uploadError
    ? "bg-destructive/10"
    : "bg-primary/10";
  const iconBg = uploadSuccess
    ? "bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 shadow-emerald-500/20 ring-emerald-500/20"
    : uploadError
    ? "bg-gradient-to-br from-destructive/30 to-destructive/10 shadow-destructive/20 ring-destructive/20"
    : "bg-gradient-to-br from-primary/30 to-primary/10 shadow-primary/20 ring-primary/20";
  const dotColor = uploadSuccess
    ? ["bg-emerald-500/60", "bg-emerald-500/40", "bg-emerald-500/20"]
    : uploadError
    ? ["bg-destructive/60", "bg-destructive/40", "bg-destructive/20"]
    : ["bg-primary", "bg-primary/70", "bg-primary/40"];

  const uploadingContent = (
    <div className="flex flex-col items-center gap-6 py-4">
      {stepIndicator}

      <div className="relative flex h-40 w-40 items-center justify-center">
        <div
          className={`absolute inset-0 rounded-full border-2 animate-ping ${ringColor}`}
          style={{ animationDuration: "2s" }}
        />
        <div
          className={`absolute inset-5 rounded-full border-2 animate-ping ${ringColor2}`}
          style={{ animationDuration: "2s", animationDelay: "0.5s" }}
        />
        <div
          className={`absolute inset-10 rounded-full animate-pulse ${pulseColor}`}
          style={{ animationDuration: "1.8s" }}
        />
        <div
          className={`relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full shadow-lg ring-2 ${iconBg}`}
        >
          {uploadSuccess ? (
            <CheckCircle2 key="success" className="h-8 w-8 text-emerald-500" />
          ) : uploadError ? (
            <XCircle key="rejected" className="h-8 w-8 text-destructive" />
          ) : (
            <SecIcon key={uploadingPhase} className="h-8 w-8 text-primary" />
          )}
        </div>
      </div>

      {uploadSuccess ? (
        <div className="animate-fade-in space-y-1.5 text-center">
          <p className="text-base font-semibold text-emerald-600">Certificado enviado!</p>
          <p className="text-sm text-muted-foreground">Seu certificado foi recebido e aguarda análise.</p>
        </div>
      ) : uploadError ? (
        <div className="animate-fade-in space-y-1.5 text-center">
          <p className="text-base font-semibold text-destructive">Documento rejeitado</p>
          <p className="text-sm text-muted-foreground">{uploadError}</p>
        </div>
      ) : (
        <div key={uploadingPhase} className="animate-fade-in space-y-1.5 text-center">
          <p className="text-base font-semibold text-foreground">{secTitle}</p>
          <p className="text-sm text-muted-foreground">{secSubtitle}</p>
        </div>
      )}

      <div className="flex gap-2">
        <span className={`h-2 w-2 rounded-full animate-bounce ${dotColor[0]}`} />
        <span className={`h-2 w-2 rounded-full animate-bounce ${dotColor[1]}`} style={{ animationDelay: "0.15s" }} />
        <span className={`h-2 w-2 rounded-full animate-bounce ${dotColor[2]}`} style={{ animationDelay: "0.3s" }} />
      </div>
    </div>
  );

  const step1Content = (
    <div className="space-y-4">
      {stepIndicator}

      {cursos.length > 0 && onCursoChange && (
        <div>
          <label className="text-sm font-medium text-foreground">
            Curso <span className="text-destructive">*</span>
          </label>
          <Select value={cursoId} onValueChange={onCursoChange}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Selecione o curso..." />
            </SelectTrigger>
            <SelectContent>
              {cursos.filter((curso) => !!curso.id).map((curso) => (
                <SelectItem key={curso.id} value={curso.id as string}>
                  {curso.nome}{curso.codigo ? ` (${curso.codigo})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <UploadDropzone
        file={file}
        onFileSelect={onFileSelect}
        onFileRemove={onFileRemove}
      />

      <Button
        onClick={onNextStep}
        disabled={!file || (cursos.length > 0 && !cursoId)}
        className="w-full"
        size="lg"
      >
        Próxima etapa
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );

  const step2Content = (
    <div className="space-y-4">
      {stepIndicator}

      {aiSuggestion && (
        <div className="flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-xs text-primary">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          Campos preenchidos automaticamente pela IA. Revise antes de enviar.
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-foreground">
          Tipo de atividade <span className="text-destructive">*</span>
        </label>
        <Select value={grupoId} onValueChange={handleGrupoChange} disabled={uploading}>
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="Selecione o tipo..." />
          </SelectTrigger>
          <SelectContent>
            {gruposDisponiveis.map((grupo) => (
              <SelectItem key={grupo.id} value={grupo.id}>
                {grupo.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">
          Descrição da atividade <span className="text-destructive">*</span>
        </label>
        <Select
          value={categoriaId}
          onValueChange={onCategoriaChange}
          disabled={uploading || !grupoId}
        >
          <SelectTrigger className="mt-1.5">
            <SelectValue
              placeholder={
                grupoId
                  ? "Selecione a descrição..."
                  : "Selecione primeiro o tipo de atividade"
              }
            />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {grupoSelecionado?.atividades.map((atividade) => (
              <SelectItem key={atividade.id} value={atividade.id}>
                <span className="mr-1 font-medium text-muted-foreground">{atividade.id}</span>
                {atividade.descricao}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {categoriaInfo && (
          <div className="mt-2 space-y-1 rounded-md border border-border/60 bg-muted/60 p-2.5 text-xs text-muted-foreground">
            <p className="flex items-start gap-1.5">
              <Info className="mt-px h-3.5 w-3.5 shrink-0 text-primary" />
              <span>
                <span className="font-medium text-foreground">Máx.:</span>{" "}
                {categoriaInfo.horasMaximas || 0}h
              </span>
            </p>
            <p className="flex items-start gap-1.5">
              <Info className="mt-px h-3.5 w-3.5 shrink-0 text-primary" />
              <span>
                <span className="font-medium text-foreground">Requisito:</span>{" "}
                {categoriaInfo.requisito}
              </span>
            </p>
          </div>
        )}
      </div>

      {categoriaInfo && (
        <div className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-400">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>
            {horasExtraidas !== null ? (
              <>
                De <span className="font-semibold">{horasExtraidas}h</span> extraídas do certificado, o máximo que pode ser aproveitado nessa categoria é{" "}
                <span className="font-semibold">{categoriaInfo.horasMaximas}h</span>.
              </>
            ) : (
              <>
                O máximo que pode ser aproveitado nessa categoria é{" "}
                <span className="font-semibold">{categoriaInfo.horasMaximas}h</span>.{" "}
                Horas excedentes não serão contabilizadas.
              </>
            )}
          </span>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={onBack}
          disabled={uploading}
          variant="outline"
          size="lg"
          className="flex-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <Button
          onClick={onUpload}
          disabled={!categoriaId || uploading}
          size="lg"
          className="flex-1"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Enviar
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const content =
    step === "informacoes"
      ? uploading ? uploadingContent : step2Content
      : ocrLoading ? loadingContent : step1Content;
  const description = uploading
    ? uploadSuccess ? "Seu certificado foi recebido e aguarda análise." : uploadError ?? secSubtitle
    : ocrLoading
    ? phaseSubtitle
    : step === "anexo"
    ? "Selecione o arquivo PDF do certificado"
    : "Revise o texto extraído e preencha as informações";

  if (isMobile) {
    return (
      <>
        {!controlled && (
          <button
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-200 hover:scale-105 hover:bg-primary/90 hover:shadow-xl active:scale-95"
            aria-label="Enviar certificado"
          >
            <Upload className="h-6 w-6" />
          </button>
        )}
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="mx-2 rounded-t-2xl">
            <DrawerHeader>
              <DrawerTitle>Enviar certificado</DrawerTitle>
              <DrawerDescription>{description}</DrawerDescription>
            </DrawerHeader>
            <div className="max-h-[80vh] overflow-y-auto px-4 pb-6">{content}</div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      {!controlled && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-8 right-8 z-50 flex items-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-medium text-primary-foreground shadow-lg transition-all duration-200 hover:scale-105 hover:bg-primary/90 hover:shadow-xl active:scale-95"
        >
          <Upload className="h-5 w-5" />
          Enviar certificado
        </button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Enviar certificado</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FloatingUploadButton;
