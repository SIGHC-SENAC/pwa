import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchCertificados,
  CertificadoMeta,
} from "@/services/certificadoService";
import AlunoHeader from "@/components/AlunoHeader";
import DashboardCards from "@/components/DashboardCards";
import UploadDropzone from "@/components/UploadDropzone";
import UploadModal from "@/components/UploadModal";
import HistoricoCertificados from "@/components/HistoricoCertificados";
import CardOrientacoes from "@/components/CardOrientacoes";
import ProgressoHoras from "@/components/ProgressoHoras";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { getDownloadURL, ref } from "firebase/storage";
import { storage } from "@/lib/firebase";
import {
  uploadCertificado,
  saveCertificadoMeta,
} from "@/services/certificadoService";
import {
  Loader2,
  Send,
  ShieldAlert,
  Upload,
  History,
  BookOpen,
  Plus,
} from "lucide-react";

const HorasComplementares: React.FC = () => {
  const { user, userData, loading: authLoading, isAluno } = useAuth();
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [observacao, setObservacao] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [certificados, setCertificados] = useState<CertificadoMeta[]>([]);
  const [histLoading, setHistLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const loadCertificados = useCallback(async () => {
    if (!user) return;
    setHistLoading(true);
    try {
      const data = await fetchCertificados(user.uid);
      setCertificados(data);
    } catch (err) {
      toast.error("Erro ao carregar histórico de certificados.");
      console.error("Erro ao carregar histórico:", err);
    } finally {
      setHistLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user && isAluno) loadCertificados();
  }, [user, isAluno, loadCertificados]);

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
            setFile(null);
            setObservacao("");
            setProgress(0);
            loadCertificados();
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

  // Loading state
  if (authLoading || (user && !userData)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  // Not aluno
  if (!isAluno) {
    if (userData?.role === "admin") {
      navigate("/admin");
      return null;
    }
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Acesso restrito</h1>
        <p className="text-center text-sm text-muted-foreground">
          Esta página é exclusiva para alunos.
        </p>
      </div>
    );
  }

  const userName = user.displayName || userData?.nome || "Aluno";
  const userEmail = user.email || userData?.email || "";
  const horasAprovadas = certificados.reduce(
    (sum, c) => sum + (c.status === "aprovado" && c.horasAprovadas ? c.horasAprovadas : 0),
    0
  );

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="min-h-screen bg-background">
      <AlunoHeader userName={userName} userEmail={userEmail} />

      <main className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6 space-y-4 sm:space-y-5">
        {/* Row 1: Welcome compact + date */}
        <div className="animate-fade-in flex items-center justify-between rounded-lg bg-gradient-to-r from-primary to-[hsl(210,72%,42%)] px-4 py-3 sm:px-5 sm:py-4 text-primary-foreground">
          <div>
            <h1 className="text-base sm:text-lg font-bold">Olá, {userName.split(" ")[0]}! 👋</h1>
            <p className="text-xs text-primary-foreground/70">Acompanhe seus certificados e horas complementares</p>
          </div>
          <p className="text-xs text-primary-foreground/50 capitalize hidden sm:block">{today}</p>
        </div>

        {/* Row 2: Cards + Progress side by side on desktop */}
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <DashboardCards certificados={certificados} loading={histLoading} />
          </div>
          <div className="lg:col-span-2">
            <ProgressoHoras horasAprovadas={horasAprovadas} loading={histLoading} />
          </div>
        </div>

        {/* Row 3: Upload + Orientações side by side */}
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 border-b bg-muted/30 px-4 py-2.5 sm:px-5 sm:py-3">
              <Upload className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Enviar certificado</h2>
            </div>
            <div className="p-4 sm:p-5 space-y-3">
              <UploadDropzone
                file={file}
                onFileSelect={setFile}
                onFileRemove={() => setFile(null)}
                disabled={uploading}
              />
              <Textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Observação opcional sobre o certificado..."
                className="resize-none"
                rows={2}
                maxLength={500}
                disabled={uploading}
              />
              {uploading && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Enviando...</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              )}
              <Button onClick={handleUpload} disabled={!file || uploading} className="w-full sm:w-auto">
                {uploading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
                ) : (
                  <><Send className="h-4 w-4" /> Enviar</>
                )}
              </Button>
            </div>
          </section>

          <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 border-b bg-muted/30 px-4 py-2.5">
              <BookOpen className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Orientações</h3>
            </div>
            <div className="p-4">
              <CardOrientacoes />
            </div>
          </section>
        </div>

        {/* Row 4: History */}
        <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 border-b bg-muted/30 px-4 py-2.5 sm:px-5 sm:py-3">
            <History className="h-4 w-4 text-secondary" />
            <h2 className="text-sm font-bold text-foreground">Histórico de envios</h2>
          </div>
          <div className="p-4 sm:p-5">
            <HistoricoCertificados certificados={certificados} loading={histLoading} />
          </div>
        </section>
      </main>

      {/* Floating upload button */}
      <button
        onClick={() => setUploadModalOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-[hsl(210,100%,24%)] transition-all hover:scale-105 active:scale-95 animate-fade-in"
        aria-label="Enviar certificado"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Upload modal */}
      <UploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onSuccess={loadCertificados}
      />
    </div>
  );
};

export default HorasComplementares;
