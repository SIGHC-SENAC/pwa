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
import UploadDropzone from "@/components/UploadDropzone";
import HistoricoCertificados from "@/components/HistoricoCertificados";
import CardOrientacoes from "@/components/CardOrientacoes";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, Send, ShieldAlert, GraduationCap } from "lucide-react";

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

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-serif text-lg text-muted-foreground italic">(respirando...)</p>
      </div>
    );
  }

  if (!user) return null;

  if (!isAluno) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Acesso restrito</h1>
        <p className="text-center text-sm text-muted-foreground">
          Esta página é exclusiva para alunos. Entre em contato com a coordenação se acredita que isso é um erro.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-6 sm:px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground">Horas Complementares</h1>
            <p className="text-sm text-muted-foreground">Envie seu certificado em PDF para análise</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Upload Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="font-serif text-lg font-semibold text-foreground">Enviar certificado</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Selecione ou arraste um arquivo PDF para enviar
              </p>

              <div className="mt-5">
                <UploadDropzone
                  file={file}
                  onFileSelect={setFile}
                  onFileRemove={() => setFile(null)}
                  disabled={uploading}
                />
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium text-foreground" htmlFor="observacao">
                  Observação <span className="text-muted-foreground font-normal">(opcional)</span>
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
                <div className="mt-4 animate-fade-in space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Enviando...</span>
                    <span className="font-medium text-foreground">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <div className="mt-6">
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
            </div>

            {/* Histórico */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="font-serif text-lg font-semibold text-foreground">Histórico de envios</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Acompanhe o status dos seus certificados
              </p>
              <div className="mt-5">
                <HistoricoCertificados certificados={certificados} loading={histLoading} />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <CardOrientacoes />

            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-serif text-lg font-semibold text-foreground">Seu perfil</h3>
              <div className="mt-3 space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Nome: </span>
                  <span className="font-medium text-foreground">
                    {user.displayName || userData?.nome || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">E-mail: </span>
                  <span className="font-medium text-foreground">{user.email || "—"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HorasComplementares;
