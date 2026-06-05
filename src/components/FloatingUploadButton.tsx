import React, { useEffect, useRef, useState } from "react";
import { Upload, Send, Loader2, Info, ChevronRight, ScanText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  observacao: string;
  onObservacaoChange: (value: string) => void;
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
  onNextStep?: () => void;
  onBack?: () => void;
}

const FloatingUploadButton: React.FC<FloatingUploadButtonProps> = ({
  file,
  onFileSelect,
  onFileRemove,
  observacao,
  onObservacaoChange,
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
  onNextStep,
  onBack,
}) => {
  const [openInternal, setOpenInternal] = useState(false);
  const [grupoId, setGrupoId] = useState("");
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

  const categoriaInfo = categoriaId ? findAtividadeInGrupos(gruposDisponiveis, categoriaId) : null;
  const grupoSelecionado = gruposDisponiveis.find((grupo) => grupo.id === grupoId);

  const handleGrupoChange = (value: string) => {
    setGrupoId(value);
    onCategoriaChange("");
  };

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

  const step1Content = (
    <div className="space-y-4">
      {stepIndicator}

      {cursos.length > 0 && onCursoChange && (
        <div>
          <label className="text-sm font-medium text-foreground">
            Curso <span className="text-destructive">*</span>
          </label>
          <Select value={cursoId} onValueChange={onCursoChange} disabled={ocrLoading}>
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
        disabled={ocrLoading}
      />

      {ocrLoading && (
        <div className="animate-fade-in space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Enviando e analisando documento...</span>
            <span className="font-medium text-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      <Button
        onClick={onNextStep}
        disabled={!file || (cursos.length > 0 && !cursoId) || ocrLoading}
        className="w-full"
        size="lg"
      >
        {ocrLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processando...
          </>
        ) : (
          <>
            Próxima etapa
            <ChevronRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );

  const step2Content = (
    <div className="space-y-4">
      {stepIndicator}

      <div>
        <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <ScanText className="h-3.5 w-3.5 text-primary" />
          Texto extraído automaticamente
        </label>
        {ocrText ? (
          <div className="mt-1.5 max-h-28 overflow-y-auto rounded-md border border-border bg-muted/40 p-2.5 font-mono text-xs leading-relaxed text-muted-foreground">
            {ocrText}
          </div>
        ) : (
          <div className="mt-1.5 rounded-md border border-dashed border-border bg-muted/30 p-3 text-center text-xs text-muted-foreground">
            Nenhum texto foi extraído automaticamente deste documento.
          </div>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          Use como referência para preencher as informações abaixo.
        </p>
      </div>

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
                {categoriaInfo.horasMaximas || 0}h ({categoriaInfo.aproveitamentoMaximo})
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

      <div>
        <label className="text-sm font-medium text-foreground" htmlFor="obs-modal">
          Observação <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <Textarea
          id="obs-modal"
          value={observacao}
          onChange={(e) => onObservacaoChange(e.target.value)}
          placeholder="Descreva o certificado, evento ou atividade..."
          className="mt-1.5 resize-none"
          rows={3}
          maxLength={500}
          disabled={uploading}
        />
        <p className="mt-1 text-right text-xs text-muted-foreground">
          {observacao.length}/500
        </p>
      </div>

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

  const content = step === "informacoes" ? step2Content : step1Content;
  const description =
    step === "anexo"
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
