import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getDownloadURL } from "firebase/storage";
import { ref } from "firebase/storage";
import { useAuth } from "@/contexts/AuthContext";
import { storage } from "@/lib/firebase";
import {
  uploadCertificado,
  saveCertificadoMeta,
  fetchCertificados,
  CertificadoMeta,
} from "@/services/certificadoService";
import AlunoHeader from "@/components/AlunoHeader";
import DashboardCards from "@/components/DashboardCards";
import UploadDropzone from "@/components/UploadDropzone";
import HistoricoCertificados from "@/components/HistoricoCertificados";
import CardOrientacoes from "@/components/CardOrientacoes";
import ProgressoHoras from "@/components/ProgressoHoras";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Loader2,
  Send,
  ShieldAlert,
  Upload,
  History,
  BookOpen,
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
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user && isAluno) {
      loadCertificados();
    }
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
            toast.error(
              "O arquivo foi enviado, mas houve um erro ao salvar os dados."
            );
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
          Esta página é exclusiva para alunos. Entre em contato com a
          coordenação se acredita que isso é um erro.
        </p>
      </div>
    );
  }

  const userName = user.displayName || userData?.nome || "Aluno";
  const userEmail = user.email || userData?.email || "";

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      <AlunoHeader userName={userName} userEmail={userEmail} />

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Welcome */}
        <div className="animate-fade-in rounded-xl bg-gradient-to-r from-primary to-[hsl(210,72%,42%)] p-5 sm:p-7 text-primary-foreground shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">
                Olá, {userName.split(" ")[0]}! 👋
              </h1>
              <p className="mt-1 text-sm text-primary-foreground/80">
                Acompanhe seus certificados e horas complementares
              </p>
            </div>
            <p className="text-xs sm:text-sm text-primary-foreground/60 capitalize">
              {today}
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <DashboardCards certificados={certificados} loading={histLoading} />

        {/* Main content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upload section */}
            <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 border-b bg-muted/30 px-5 py-3.5 sm:px-6 sm:py-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Upload className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-foreground">
                    Enviar certificado
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Selecione ou arraste um arquivo PDF
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                <UploadDropzone
                  file={file}
                  onFileSelect={setFile}
                  onFileRemove={() => setFile(null)}
                  disabled={uploading}
                />

                <div>
                  <label
                    className="text-sm font-medium text-foreground"
                    htmlFor="observacao"
                  >
                    Observação{" "}
                    <span className="text-muted-foreground font-normal">
                      (opcional)
                    </span>
                  </label>
                  <Textarea
                    id="observacao"
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
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
                      <span className="text-muted-foreground">
                        Enviando...
                      </span>
                      <span className="font-medium text-foreground">
                        {progress}%
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}

                <Button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="w-full sm:w-auto"
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
            </section>

            {/* History section */}
            <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 border-b bg-muted/30 px-5 py-3.5 sm:px-6 sm:py-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10">
                  <History className="h-4 w-4 text-secondary" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-foreground">
                    Histórico de envios
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Acompanhe o status dos seus certificados
                  </p>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                <HistoricoCertificados
                  certificados={certificados}
                  loading={histLoading}
                />
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Orientações */}
            <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 border-b bg-muted/30 px-5 py-3.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <BookOpen className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-sm font-bold text-foreground">
                  Orientações
                </h3>
              </div>
              <div className="p-4 sm:p-5">
                <CardOrientacoes />
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HorasComplementares;
