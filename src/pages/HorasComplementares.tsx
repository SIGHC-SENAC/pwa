import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { toast } from "sonner";
import {
  BookOpen,
  GraduationCap,
  History,
  LayoutDashboard,
  Loader2,
  LogOut,
  ShieldAlert,
  Upload,
  User,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import { findAtividadeById } from "@/lib/categoriasComplementares";
import { Button } from "@/components/ui/button";
import DashboardCards from "@/components/DashboardCards";
import FloatingUploadButton from "@/components/FloatingUploadButton";
import HistoricoCertificados from "@/components/HistoricoCertificados";
import CardOrientacoes from "@/components/CardOrientacoes";
import ProgressoHoras from "@/components/ProgressoHoras";
import NotificationBell from "@/components/NotificationBell";
import { fetchCursoById, Curso } from "@/services/cursoService";
import {
  uploadCertificado,
  processarCertificado,
  fetchCertificados,
  saveRejectedCertificado,
  CertificadoMeta,
} from "@/services/certificadoService";

const senacLogo = "/senac-logo.png";

type Tab = "dashboard" | "historico" | "orientacoes";

const navItems: { id: Tab; label: string; icon: React.ElementType; description: string }[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Progresso detalhado das suas horas",
  },
  {
    id: "historico",
    label: "Historico",
    icon: History,
    description: "Seus certificados enviados",
  },
  {
    id: "orientacoes",
    label: "Orientacoes",
    icon: BookOpen,
    description: "Como funciona o sistema",
  },
];

const HorasComplementares: React.FC = () => {
  const { user, userData, loading: authLoading, isAluno } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [uploadOpen, setUploadOpen] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [observacao, setObservacao] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [certificados, setCertificados] = useState<CertificadoMeta[]>([]);
  const [histLoading, setHistLoading] = useState(true);
  const [curso, setCurso] = useState<Curso | null>(null);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [cursoId, setCursoId] = useState("");

  const loadCertificados = useCallback(async () => {
    if (!user) return;

    setHistLoading(true);
    try {
      const data = await fetchCertificados(user.uid);
      setCertificados(data);
    } catch {
      toast.error("Erro ao carregar historico de certificados.");
    } finally {
      setHistLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, navigate, user]);

  useEffect(() => {
    if (user && isAluno) loadCertificados();
  }, [isAluno, loadCertificados, user]);

  useEffect(() => {
    const cursoIds = userData?.cursoIds?.length ? userData.cursoIds : userData?.cursoId ? [userData.cursoId] : [];
    if (cursoIds.length === 0) return;

    Promise.all(cursoIds.map((id) => fetchCursoById(id).catch(() => null)))
      .then((data) => {
        const cursosValidos = data.filter(Boolean) as Curso[];
        setCursos(cursosValidos);
        setCursoId((current) => current || cursosValidos[0]?.id || "");
        setCurso(cursosValidos[0] || null);
      })
      .catch(() => {});
  }, [userData?.cursoId, userData?.cursoIds]);

  useEffect(() => {
    setCurso(cursos.find((item) => item.id === cursoId) || cursos[0] || null);
  }, [cursoId, cursos]);

  const handleUpload = async () => {
    if (!file || !user || !userData || !categoriaId || !cursoId) return;

    const cursoSelecionado = cursos.find((item) => item.id === cursoId) || curso;
    const gruposCurso = cursoSelecionado?.regrasAtividades || [];
    const categoriaInfo = gruposCurso
      .flatMap((grupo) => grupo.atividades)
      .find((atividade) => atividade.id === categoriaId) || findAtividadeById(categoriaId);
    const categoriaNome = categoriaInfo ? `${categoriaInfo.id} - ${categoriaInfo.descricao}` : null;

    setUploading(true);
    setProgress(0);

    try {
      const { task, storagePath } = uploadCertificado(file, user.uid);

      task.on(
        "state_changed",
        (snapshot) => {
          setProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
        },
        () => {
          toast.error("Erro ao enviar o arquivo. Tente novamente.");
          setUploading(false);
          setProgress(0);
        },
        async () => {
          try {
            const token = await user.getIdToken();

            await processarCertificado(
              user.uid,
              storagePath,
              file.name,
              token,
              categoriaId,
              categoriaNome,
              cursoSelecionado?.id || cursoId,
              cursoSelecionado?.nome || null,
              cursoSelecionado?.codigo || null,
              user.displayName || userData.nome || "Aluno",
              user.email || userData.email || "",
              observacao
            );

            toast.success("Certificado enviado e validado com sucesso!");
            setFile(null);
            setObservacao("");
            setCategoriaId("");
            setProgress(0);
            loadCertificados();

            try {
              await fetch(`${import.meta.env.VITE_API_BASE_URL}/notificacoes/upload-certificado`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  nomeAluno: user.displayName || userData.nome || "Aluno",
                  nomeArquivo: file.name,
                }),
              });
            } catch {}
          } catch (err: any) {
            const motivo = err.message || "Erro ao validar o certificado";
            toast.error(motivo);

            try {
              await saveRejectedCertificado({
                uid: user.uid,
                nomeAluno: user.displayName || userData.nome || "Aluno",
                emailAluno: user.email || userData.email || "",
                nomeArquivo: file.name,
                motivoRejeicao: motivo,
                encontrados: err.encontrados,
                categoriaId,
                categoriaNome,
                cursoId: cursoSelecionado?.id || cursoId,
                cursoNome: cursoSelecionado?.nome || null,
                cursoCodigo: cursoSelecionado?.codigo || null,
              });
              loadCertificados();
            } catch {}

            setFile(null);
            setCategoriaId("");
            setProgress(0);
          } finally {
            setUploading(false);
          }
        }
      );
    } catch {
      toast.error("Erro inesperado. Tente novamente.");
      setUploading(false);
    }
  };

  if (authLoading || (user && !userData)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  if (!isAluno) {
    if (userData?.role === "superAdmin") {
      navigate("/super-admin");
      return null;
    }

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
          Esta pagina e exclusiva para alunos.
        </p>
      </div>
    );
  }

  const displayName = user.displayName || userData?.nome || "Aluno";
  const userEmail = user.email || userData?.email || "";
  const initials = displayName
    .split(" ")
    .map((word: string) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const activeItem = navItems.find((item) => item.id === activeTab)!;
  const certificadosDoCurso = cursoId
    ? certificados.filter((certificado) => !certificado.cursoId || certificado.cursoId === cursoId)
    : certificados;

  const horasAprovadas = certificadosDoCurso.reduce(
    (total, certificado) =>
      total + (certificado.status === "aprovado" && certificado.horasAprovadas ? certificado.horasAprovadas : 0),
    0
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="sticky top-0 z-40 shrink-0 border-b bg-card shadow-sm">
        <div className="flex items-center justify-between px-4 py-2.5 sm:px-6 sm:py-3">
          <div className="flex min-w-0 items-center gap-3">
            <img src={senacLogo} alt="Senac Pernambuco" className="h-9 w-auto object-contain sm:h-10" />
            <div className="hidden h-8 w-px bg-border sm:block" />
            <div className="hidden min-w-0 sm:block">
              <p className="flex items-center gap-1.5 text-sm font-bold leading-tight text-primary">
                <GraduationCap className="h-4 w-4" />
                Horas Complementares
              </p>
              <p className="text-[11px] leading-tight text-muted-foreground">
                Acompanhe seus certificados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationBell userId={user.uid} />
            <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background px-3 py-1.5 shadow-sm">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {initials}
              </div>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                <p className="truncate text-[11px] text-muted-foreground">{userEmail}</p>
              </div>
              <User className="h-3.5 w-3.5 shrink-0 text-primary sm:hidden" />
            </div>
          </div>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-primary via-primary to-secondary" />
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-60 shrink-0 flex-col overflow-y-auto border-r bg-card md:flex">
          <div className="px-4 pb-2 pt-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Menu
            </p>
          </div>

          <nav className="flex flex-1 flex-col gap-0.5 px-2">
            {navItems.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;

              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`
                    group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium
                    transition-all duration-150
                    ${isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground/70 hover:bg-muted hover:text-foreground"
                    }
                  `}
                >
                  <span
                    className={`
                      flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors
                      ${isActive ? "bg-white/20" : "bg-muted group-hover:bg-background"}
                    `}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="truncate">{label}</span>
                  {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/80" />}
                </button>
              );
            })}
          </nav>

          <div className="mx-3 my-3 h-px bg-border" />

          <div className="px-3 pb-4">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-full gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={async () => {
                await signOut(auth);
                navigate("/login");
              }}
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </Button>
          </div>
        </aside>

        <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-card shadow-[0_-1px_8px_rgba(0,0,0,0.08)] md:hidden">
          <div className="flex">
            {navItems.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;

              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className="flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors"
                >
                  <span
                    className={`
                      flex h-6 w-6 items-center justify-center rounded-md transition-colors
                      ${isActive ? "text-primary" : "text-muted-foreground"}
                    `}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className={`text-[10px] font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                  {isActive && <span className="absolute bottom-0 h-0.5 w-8 rounded-full bg-primary" />}
                </button>
              );
            })}
          </div>
        </div>

        <main className="min-w-0 flex-1 overflow-y-auto bg-background">
          <div className="sticky top-0 z-10 border-b border-border/60 bg-background/95 px-5 py-3.5 backdrop-blur-sm sm:px-8">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  {(() => {
                    const Icon = activeItem.icon;
                    return <Icon className="h-4 w-4 text-primary" />;
                  })()}
                </div>
                <div>
                  <h1 className="text-sm font-bold leading-tight text-foreground">{activeItem.label}</h1>
                  <p className="text-xs text-muted-foreground">{activeItem.description}</p>
                </div>
              </div>

              <Button
                onClick={() => setUploadOpen(true)}
                size="sm"
                className="shrink-0 gap-2"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Enviar Certificado</span>
                <span className="sm:hidden">Enviar</span>
              </Button>
            </div>
          </div>

          <div className="space-y-6 px-4 py-5 pb-24 sm:px-8 sm:py-6 md:pb-8">
            {activeTab === "dashboard" && (
              <>
                <div className="rounded-xl bg-gradient-to-r from-primary to-[hsl(210,72%,42%)] p-5 text-primary-foreground shadow-md sm:p-7">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-xl font-bold sm:text-2xl">
                        Ola, {displayName.split(" ")[0]}!
                      </h2>
                      <p className="mt-1 text-sm text-primary-foreground/80">
                        Veja seu dashboard com o progresso das horas complementares
                      </p>
                    </div>
                    <p className="text-xs capitalize text-primary-foreground/60 sm:text-sm">
                      {new Date().toLocaleDateString("pt-BR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                <DashboardCards certificados={certificadosDoCurso} loading={histLoading} />

                <ProgressoHoras
                  certificados={certificadosDoCurso}
                  horasAprovadas={horasAprovadas}
                  nomeCurso={curso?.nome}
                  loading={histLoading}
                />
              </>
            )}

            {activeTab === "historico" && (
              <HistoricoCertificados certificados={certificados} loading={histLoading} />
            )}

            {activeTab === "orientacoes" && <CardOrientacoes />}
          </div>
        </main>
      </div>

      <FloatingUploadButton
        file={file}
        cursos={cursos}
        gruposAtividades={curso?.regrasAtividades}
        cursoId={cursoId}
        onCursoChange={setCursoId}
        onFileSelect={setFile}
        onFileRemove={() => setFile(null)}
        observacao={observacao}
        onObservacaoChange={setObservacao}
        categoriaId={categoriaId}
        onCategoriaChange={setCategoriaId}
        uploading={uploading}
        progress={progress}
        onUpload={handleUpload}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
      />
    </div>
  );
};

export default HorasComplementares;
