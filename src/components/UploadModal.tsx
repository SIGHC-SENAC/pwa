import React, { useState } from "react";
import { getDownloadURL, ref } from "firebase/storage";
import { storage } from "@/lib/firebase";
import {
  uploadCertificado,
  saveCertificadoMeta,
} from "@/services/certificadoService";
import { useAuth } from "@/contexts/AuthContext";
import UploadDropzone from "@/components/UploadDropzone";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ open, onOpenChange, onSuccess }) => {
  const { user, userData } = useAuth();
  const isMobile = useIsMobile();
  const [file, setFile] = useState<File | null>(null);
  const [observacao, setObservacao] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const reset = () => {
    setFile(null);
    setObservacao("");
    setProgress(0);
  };

  const handleUpload = async () => {
    if (!file || !user || !userData) return;
    setUploading(true);
    setProgress(0);

    try {
      const { task, storagePath } = uploadCertificado(file, user.uid);

      task.on(
        "state_changed",
        (snapshot) => {
          const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(Math.round(pct));
        },
        (error) => {
          console.error("Erro no upload:", error);
          toast.error("Erro ao enviar o arquivo. Tente novamente.");
          setUploading(false);
          setProgress(0);
        },
        async () => {
          try {
            const storageRef = ref(storage, storagePath);
            const downloadURL = await getDownloadURL(storageRef);

            await saveCertificadoMeta({
              uid: user.uid,
              nomeAluno: user.displayName || userData.nome || "Aluno",
              emailAluno: user.email || userData.email,
              nomeArquivo: file.name,
              storagePath,
              downloadURL,
              tamanhoBytes: file.size,
              observacaoAluno: observacao.trim(),
            });

            toast.success("Certificado enviado com sucesso!");
            reset();
            onOpenChange(false);
            onSuccess();
          } catch (err) {
            console.error("Erro ao salvar metadados:", err);
            toast.error("O arquivo foi enviado, mas houve um erro ao salvar os dados.");
          } finally {
            setUploading(false);
          }
        }
      );
    } catch (err) {
      console.error("Erro geral:", err);
      toast.error("Erro inesperado. Tente novamente.");
      setUploading(false);
    }
  };

  const content = (
    <div className="space-y-4">
      <UploadDropzone
        file={file}
        onFileSelect={setFile}
        onFileRemove={() => setFile(null)}
        disabled={uploading}
      />

      <div>
        <label className="text-sm font-medium text-foreground" htmlFor="obs-modal">
          Observação <span className="text-muted-foreground font-normal">(opcional)</span>
        </label>
        <Textarea
          id="obs-modal"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Descreva o certificado, evento ou atividade..."
          className="mt-1 resize-none"
          rows={2}
          maxLength={500}
          disabled={uploading}
        />
        <p className="mt-0.5 text-xs text-muted-foreground text-right">{observacao.length}/500</p>
      </div>

      {uploading && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Enviando...</span>
            <span className="font-medium text-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      <Button onClick={handleUpload} disabled={!file || uploading} className="w-full" size="lg">
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
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="mx-2 rounded-t-2xl">
          <DrawerHeader className="text-left">
            <DrawerTitle>Enviar certificado</DrawerTitle>
            <DrawerDescription>Selecione ou arraste um arquivo PDF</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar certificado</DialogTitle>
          <DialogDescription>Selecione ou arraste um arquivo PDF</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};

export default UploadModal;
