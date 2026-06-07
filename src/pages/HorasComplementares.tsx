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
  Menu,
  ShieldAlert,
  Upload,
  User,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import { findAtividadeInGrupos } from "@/services/cursoService";
import { Button } from "@/components/ui/button";
import FloatingUploadButton from "@/components/FloatingUploadButton";
import HistoricoCertificados from "@/components/HistoricoCertificados";
import CardOrientacoes from "@/components/CardOrientacoes";
import ProgressoHoras from "@/components/ProgressoHoras";
import NotificationBell from "@/components/NotificationBell";
import { fetchCursoById, Curso } from "@/services/cursoService";
import {
  uploadCertificado,
  processarCertificado,
  extrairTextoOcr,
  analisarComIA,
  fetchCertificados,
  saveRejectedCertificado,
  CertificadoMeta,
} from "@/services/certificadoService";

const senacLogo = "/senac-logo.png";

/**
 * Tipagem para as abas de navegação da página
 */
type Tab = "dashboard" | "historico" | "orientacoes";

/**
 * Itens de navegação da barra lateral e menu mobile
 */
const navItems: { id: Tab; label: string; icon: React.ElementType; description: string }[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Progresso detalhado das suas horas",
  },
  {
    id: "historico",
    label: "Histórico",
    icon: History,
    description: "Seus certificados enviados",
  },
  {
    id: "orientacoes",
    label: "Orientacões",
    icon: BookOpen,
    description: "Como funciona o sistema",
  },
];

/**
 * Página HorasComplementares
 * Dashboard principal do aluno para gestão de suas horas e certificados
 */
const HorasComplementares: React.FC = () => {
  const { user, userData, loading: authLoading, isAluno } = useAuth();
  const navigate = useNavigate();

  // Estados de navegação e interface
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Estados para o formulário de upload
  const [file, setFile] = useState<File | null>(null);
  const [categoriaId, setCategoriaId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Estados do fluxo multi-etapa com OCR
  const [uploadStep, setUploadStep] = useState<"anexo" | "informacoes">("anexo");
  const [ocrText, setOcrText] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [tempStoragePath, setTempStoragePath] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<{ grupoId: string; categoriaId: string } | null>(null);
  
  // Estados de dados (certificados e cursos)
  const [certificados, setCertificados] = useState<CertificadoMeta[]>([]); // Lista de certificados do aluno
  const [histLoading, setHistLoading] = useState(true); // Status de carregamento do histórico
  const [curso, setCurso] = useState<Curso | null>(null); // Curso selecionado atualmente
  const [cursos, setCursos] = useState<Curso[]>([]); // Lista de cursos que o aluno está vinculado
  const [cursoId, setCursoId] = useState(""); // ID do curso ativo no dashboard

  /**
   * Carrega os certificados do aluno do banco de dados
   */
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

  // Redireciona para login se não estiver autenticado
  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, navigate, user]);

  // Carrega dados iniciais após autenticação
  useEffect(() => {
    if (user && isAluno) loadCertificados();
  }, [isAluno, loadCertificados, user]);

  // Busca detalhes dos cursos vinculados ao aluno
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

  // Atualiza o curso selecionado quando cursoId muda
  useEffect(() => {
    setCurso(cursos.find((item) => item.id === cursoId) || cursos[0] || null);
  }, [cursoId, cursos]);

  const resetUploadState = () => {
    setFile(null);
    setCategoriaId("");
    setProgress(0);
    setTempStoragePath(null);
    setUploadStep("anexo");
    setOcrText("");
    setOcrError(false);
    setUploadError(null);
    setUploadSuccess(false);
    setAiSuggestion(null);
  };

  /**
   * Etapa 1→2: faz upload temporário e executa OCR no documento
   */
  const handleNextStep = async () => {
    if (!file || !user) return;

    setOcrLoading(true);
    setProgress(0);

    try {
      const { task, storagePath } = uploadCertificado(file, user.uid);

      await new Promise<void>((resolve, reject) => {
        task.on(
          "state_changed",
          (snapshot) => {
            setProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
          },
          (error) => reject(error),
          () => resolve()
        );
      });

      setTempStoragePath(storagePath);
      setProgress(0);

      // OCR é best-effort: falha não bloqueia o fluxo
      let extractedText = "";
      try {
        const token = await user.getIdToken();
        const { text } = await extrairTextoOcr(storagePath, token);
        extractedText = text;
        setOcrText(text);
      } catch {
        setOcrText("");
        setOcrError(true);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Análise com IA: usa o texto OCR para sugerir tipo e descrição de atividade
      if (extractedText) {
        try {
          const token = await user.getIdToken();
          const cursoSelecionado = cursos.find((c) => c.id === cursoId) || curso;
          const regras = cursoSelecionado?.regrasAtividades ?? [];
          if (regras.length > 0) {
            const sugestao = await analisarComIA(extractedText, regras, token);
            if (sugestao.grupoId && sugestao.categoriaId) {
              setAiSuggestion({ grupoId: sugestao.grupoId, categoriaId: sugestao.categoriaId });
            }
          }
        } catch {
          // Análise com IA é best-effort
        }
      }

      setUploadStep("informacoes");
    } catch {
      toast.error("Erro ao enviar o arquivo. Tente novamente.");
      setProgress(0);
    } finally {
      setOcrLoading(false);
    }
  };

  const handleBack = () => {
    setUploadStep("anexo");
    setOcrText("");
    setTempStoragePath(null);
    setAiSuggestion(null);
    setCategoriaId("");
  };

  /**
   * Etapa 2: envia o certificado já carregado para análise e registro
   */
  const handleUpload = async () => {
    if (!file || !user || !userData || !categoriaId || !cursoId || !tempStoragePath) return;

    const cursoSelecionado = cursos.find((item) => item.id === cursoId) || curso;
    const gruposCurso = cursoSelecionado?.regrasAtividades ?? [];
    const categoriaInfo = findAtividadeInGrupos(gruposCurso, categoriaId);
    const categoriaNome = categoriaInfo ? `${categoriaInfo.id} - ${categoriaInfo.descricao}` : null;

    setUploading(true);

    try {
      const token = await user.getIdToken();

      const resultado = await processarCertificado(
        user.uid,
        tempStoragePath,
        file.name,
        token,
        categoriaId,
        categoriaNome,
        cursoSelecionado?.id || cursoId,
        cursoSelecionado?.nome || null,
        cursoSelecionado?.codigo || null,
        user.displayName || userData.nome || "Aluno",
        user.email || userData.email || ""
      );

      setUploadSuccess(true);
      loadCertificados();

      // Notificação fail-safe
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
            certificadoId: resultado.certificadoId,
            cursoId: cursoSelecionado?.id || cursoId,
            cursoNome: cursoSelecionado?.nome || null,
            categoriaNome,
          }),
        });
      } catch {}

      await new Promise((resolve) => setTimeout(resolve, 2500));
      resetUploadState();
    } catch (err: any) {
      const motivo = err.message || "Erro ao validar o certificado";

      const isSecurityRejection =
        err.encontrados != null ||
        motivo.includes("segurança") ||
        motivo.includes("rejeitado") ||
        motivo.includes("inválido") ||
        motivo.includes("limite permitido");

      let rejectionReason: string;
      if (err.encontrados && (err.encontrados as string[]).length > 0) {
        rejectionReason = `Estruturas suspeitas: ${(err.encontrados as string[]).join(", ")}`;
      } else if (motivo.includes("limite permitido")) {
        rejectionReason = "Arquivo acima do tamanho máximo permitido";
      } else if (motivo.includes("inválido")) {
        rejectionReason = "O arquivo não é um PDF válido";
      } else {
        rejectionReason = motivo;
      }

      if (isSecurityRejection) {
        setUploadError(rejectionReason);
      } else {
        toast.error(motivo);
      }

      try {
        await saveRejectedCertificado({
          uid: user.uid,
          nomeAluno: user.displayName || userData.nome || "Aluno",
          emailAluno: user.email || userData.email || "",
          nomeArquivo: file.name,
          motivoRejeicao: rejectionReason,
          encontrados: err.encontrados,
          categoriaId,
          categoriaNome,
          cursoId: cursoSelecionado?.id || cursoId,
          cursoNome: cursoSelecionado?.nome || null,
          cursoCodigo: cursoSelecionado?.codigo || null,
        });
        loadCertificados();
      } catch {}

      if (isSecurityRejection) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }

      resetUploadState();
    } finally {
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

  // Proteção de rota e role
  if (!user) return null;

  if (!isAluno) {
    if (userData?.role === "superAdmin") {
      // Redireciona admins para suas áreas específicas
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

  // Preparação de dados para exibição
  const displayName = user.displayName || userData?.nome || "Aluno";
  const userEmail = user.email || userData?.email || "";
  const initials = displayName
    .split(" ")
    .map((word: string) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const activeItem = navItems.find((item) => item.id === activeTab)!;

  const renderSidebarContent = (isMobileSidebar = false) => (
    <>
      <div className="px-4 pt-5 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Menu</p>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-2">
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => {
                setActiveTab(id);
                if (isMobileSidebar) setMobileMenuOpen(false);
              }}
              className={`
                group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium
                transition-all duration-150
                ${isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground/70 hover:bg-muted hover:text-foreground"
                }
              `}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${isActive ? "bg-white/20" : "bg-muted group-hover:bg-background"}`}>
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
            if (isMobileSidebar) setMobileMenuOpen(false);
            await signOut(auth);
            navigate("/login");
          }}
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair
        </Button>
      </div>
    </>
  );;
  // Filtra certificados exibidos baseado no curso selecionado no seletor do dashboard
  const certificadosDoCurso = cursoId
    ? certificados.filter((certificado) => !certificado.cursoId || certificado.cursoId === cursoId)
    : certificados;

  // Soma total de horas já validadas pelo administrador
  const horasAprovadas = certificadosDoCurso.reduce(
    (total, certificado) =>
      total + (certificado.status === "aprovado" && certificado.horasAprovadas ? certificado.horasAprovadas : 0),
    0
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="sticky top-0 z-40 shrink-0 border-b bg-card shadow-sm">
        {/* Cabeçalho superior com Logo e Perfil */}
        <div className="flex items-center justify-between px-4 py-2.5 sm:px-6 sm:py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden shrink-0">
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Abrir menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 sm:max-w-none">
                <SheetHeader className="sr-only">
                  <SheetTitle>Menu de navegação</SheetTitle>
                  <SheetDescription>Navegue entre as seções do painel.</SheetDescription>
                </SheetHeader>
                <div className="flex h-full flex-col bg-card">
                  {renderSidebarContent(true)}
                </div>
              </SheetContent>
            </Sheet>
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
        {/* Barra Lateral de Navegação (Desktop) */}
        <aside className="hidden w-60 shrink-0 flex-col overflow-y-auto border-r bg-card md:flex">
          {renderSidebarContent()}
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto bg-background">
          {/* Cabeçalho da Seção Ativa */}
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

          <div className="space-y-6 px-4 py-5 pb-8 sm:px-8 sm:py-6">
            
            {/* CONTEÚDO DA ABA: DASHBOARD */}
            {activeTab === "dashboard" && (
              <>
                <div className="rounded-xl bg-gradient-to-r from-primary to-[hsl(210,72%,42%)] p-5 text-primary-foreground shadow-md sm:p-6">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-xl font-bold sm:text-2xl">
                        Olá, {displayName.toUpperCase().split(" ")[0]}!
                      </h2>
                      <p className="mt-0.5 text-sm text-primary-foreground/75">
                        Veja seu dashboard com o progresso das horas complementares
                      </p>
                    </div>
                    <p className="text-xs capitalize text-primary-foreground/60 sm:text-sm sm:text-right">
                      {new Date().toLocaleDateString("pt-BR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                <ProgressoHoras
                  certificados={certificadosDoCurso}
                  horasAprovadas={horasAprovadas}
                  nomeCurso={curso?.nome}
                  cargaHorariaComplementar={curso?.cargaHorariaComplementar}
                  gruposAtividades={curso?.regrasAtividades}
                  loading={histLoading}
                />
              </>
            )}

            {/* CONTEÚDO DA ABA: HISTÓRICO */}
            {activeTab === "historico" && (
              <HistoricoCertificados certificados={certificados} loading={histLoading} />
            )}

            {/* CONTEÚDO DA ABA: ORIENTAÇÕES */}
            {activeTab === "orientacoes" && <CardOrientacoes />}
          </div>
        </main>
      </div>

      {/* Botão flutuante e modal de Upload de Certificado */}
      <FloatingUploadButton
        file={file}
        cursos={cursos}
        gruposAtividades={curso?.regrasAtividades}
        cursoId={cursoId}
        onCursoChange={setCursoId}
        onFileSelect={setFile}
        onFileRemove={() => setFile(null)}
        categoriaId={categoriaId}
        onCategoriaChange={setCategoriaId}
        uploading={uploading}
        progress={progress}
        onUpload={handleUpload}
        open={uploadOpen}
        onOpenChange={(open) => {
          setUploadOpen(open);
          if (!open && !uploading && !ocrLoading) {
            resetUploadState();
          }
        }}
        step={uploadStep}
        ocrText={ocrText}
        ocrLoading={ocrLoading}
        ocrError={ocrError}
        uploadError={uploadError}
        uploadSuccess={uploadSuccess}
        aiSuggestion={aiSuggestion}
        onNextStep={handleNextStep}
        onBack={handleBack}
      />
    </div>
  );
};

export default HorasComplementares;
