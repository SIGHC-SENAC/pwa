import React, { useState, useCallback, useEffect, useRef } from "react";
import { Upload, Send, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import UploadDropzone from "@/components/UploadDropzone";
import { useIsMobile } from "@/hooks/use-mobile";

interface FloatingUploadButtonProps {
  file: File | null;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  observacao: string;
  onObservacaoChange: (value: string) => void;
  uploading: boolean;
  progress: number;
  onUpload: () => void;
  onSuccess?: () => void;
}

const FloatingUploadButton: React.FC<FloatingUploadButtonProps> = ({
  file,
  onFileSelect,
  onFileRemove,
  observacao,
  onObservacaoChange,
  uploading,
  progress,
  onUpload,
  onSuccess,
}) => {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const content = (
    <div className="space-y-4">
      <UploadDropzone
        file={file}
        onFileSelect={onFileSelect}
        onFileRemove={onFileRemove}
        disabled={uploading}
      />

      <div>
        <label className="text-sm font-medium text-foreground" htmlFor="obs-modal">
          Observação{" "}
          <span className="text-muted-foreground font-normal">(opcional)</span>
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
        <p className="mt-1 text-xs text-muted-foreground text-right">
          {observacao.length}/500
        </p>
      </div>

      {uploading && (
        <div className="animate-fade-in space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Enviando...</span>
            <span className="font-medium text-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      <Button
        onClick={onUpload}
        disabled={!file || uploading}
        className="w-full"
        size="lg"
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Enviar certificado
          </>
        )}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-200 hover:bg-primary/90 hover:shadow-xl hover:scale-105 active:scale-95"
          aria-label="Enviar certificado"
        >
          <Upload className="h-6 w-6" />
        </button>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="mx-2 rounded-t-2xl">
            <DrawerHeader>
              <DrawerTitle>Enviar certificado</DrawerTitle>
              <DrawerDescription>Selecione ou arraste um arquivo PDF</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6">{content}</div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-8 right-8 z-50 flex items-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-medium text-primary-foreground shadow-lg transition-all duration-200 hover:bg-primary/90 hover:shadow-xl hover:scale-105 active:scale-95"
      >
        <Upload className="h-5 w-5" />
        Enviar Certificado
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Enviar certificado</DialogTitle>
            <DialogDescription>Selecione ou arraste um arquivo PDF</DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FloatingUploadButton;
