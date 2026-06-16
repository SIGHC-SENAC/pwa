import { useEffect, useRef, useState } from "react";
import { Bot, MessageCircle, Send, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchCursoById, type GrupoAtividade } from "@/services/cursoService";
import { fetchCertificados } from "@/services/certificadoService";
import { fetchCertificadosStats } from "@/services/adminService";

type ChatContext = "unauthenticated" | "superAdmin" | "coordenador" | "aluno";

type Message = {
  id: string;
  role: "user" | "model";
  text: string;
};

type CursoResumido = {
  nome: string;
  metaHoras: number;
  grupos: Array<{
    label: string;
    atividades: Array<{ descricao: string; horasMaximas: number; requisito: string }>;
  }>;
};

type AlunoContext = {
  nomeAluno: string;
  cursos: CursoResumido[];
  certificados: {
    total: number;
    aprovados: number;
    pendentes: number;
    rejeitados: number;
    horasAprovadas: number;
  };
};

type CoordContext = {
  nomeCoord: string;
  cursos: CursoResumido[];
  stats: {
    total: number;
    pendentes: number;
    aprovados: number;
    rejeitados: number;
  };
};

const CONTEXT_LABELS: Record<ChatContext, string> = {
  unauthenticated: "Visitante",
  superAdmin: "Super Admin",
  coordenador: "Coordenador",
  aluno: "Aluno",
};

const WELCOME_MESSAGES: Record<ChatContext, string> = {
  unauthenticated:
    "Olá! Sou o assistente do SIGHC. Posso te explicar como funciona o sistema de horas complementares. Como posso ajudar?",
  superAdmin:
    "Olá! Sou seu assistente de administração. Posso te ajudar com gestão de cursos, turmas, usuários e relatórios. O que você precisa?",
  coordenador:
    "Olá! Sou seu assistente de coordenação. Posso te ajudar com aprovação de certificados, acompanhamento de alunos e relatórios de horas. Como posso ajudar?",
  aluno:
    "Olá! Sou seu assistente do SIGHC. Posso te ajudar com envio de certificados, dúvidas sobre atividades complementares e acompanhamento das suas horas. O que você precisa?",
};

function roleToContext(user: ReturnType<typeof useAuth>["user"], userData: ReturnType<typeof useAuth>["userData"]): ChatContext {
  if (!user) return "unauthenticated";
  const role = userData?.role;
  if (role === "superAdmin") return "superAdmin";
  if (role === "admin" || role === "coordenador") return "coordenador";
  return "aluno";
}

function mapCursos(cursosData: (Awaited<ReturnType<typeof fetchCursoById>> | null)[]): CursoResumido[] {
  return cursosData
    .filter(Boolean)
    .map((c) => ({
      nome: c!.nome,
      metaHoras: c!.cargaHorariaComplementar,
      grupos: (c!.regrasAtividades ?? []).map((g: GrupoAtividade) => ({
        label: g.label,
        atividades: g.atividades.map((a) => ({
          descricao: a.descricao,
          horasMaximas: a.horasMaximas,
          requisito: a.requisito,
        })),
      })),
    }));
}

async function buildAlunoContext(
  uid: string,
  nome: string,
  cursoIds: string[]
): Promise<AlunoContext> {
  const [cursosData, certificados] = await Promise.all([
    Promise.all(cursoIds.map((id) => fetchCursoById(id).catch(() => null))),
    fetchCertificados(uid).catch(() => []),
  ]);

  const horasAprovadas = certificados
    .filter((c) => c.status === "aprovado")
    .reduce((sum, c) => sum + (c.horasAprovadas ?? 0), 0);

  return {
    nomeAluno: nome,
    cursos: mapCursos(cursosData),
    certificados: {
      total: certificados.length,
      aprovados: certificados.filter((c) => c.status === "aprovado").length,
      pendentes: certificados.filter((c) => c.status === "pendente").length,
      rejeitados: certificados.filter((c) => c.status === "rejeitado").length,
      horasAprovadas,
    },
  };
}

async function buildCoordContext(
  nome: string,
  cursoIds: string[]
): Promise<CoordContext> {
  const [cursosData, stats] = await Promise.all([
    Promise.all(cursoIds.map((id) => fetchCursoById(id).catch(() => null))),
    fetchCertificadosStats(cursoIds).catch(() => ({ total: 0, pendentes: 0, aprovados: 0, rejeitados: 0 })),
  ]);

  return {
    nomeCoord: nome,
    cursos: mapCursos(cursosData),
    stats,
  };
}

export function FloatingChatButton() {
  const { user, userData } = useAuth();
  const context = roleToContext(user, userData);

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [alunoCtx, setAlunoCtx] = useState<AlunoContext | null>(null);
  const [coordCtx, setCoordCtx] = useState<CoordContext | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevContextRef = useRef<ChatContext>(context);

  // Reset when context changes (login/logout)
  useEffect(() => {
    if (prevContextRef.current !== context) {
      setMessages([]);
      setAlunoCtx(null);
      setCoordCtx(null);
      prevContextRef.current = context;
    }
  }, [context]);

  // Fetch aluno data once when chat opens in "aluno" context
  useEffect(() => {
    if (!isOpen || context !== "aluno" || alunoCtx || !user || !userData) return;

    const cursoIds = userData.cursoIds?.length
      ? userData.cursoIds
      : userData.cursoId
        ? [userData.cursoId]
        : [];

    if (cursoIds.length === 0) return;

    buildAlunoContext(user.uid, userData.nome, cursoIds)
      .then(setAlunoCtx)
      .catch(() => {});
  }, [isOpen, context, alunoCtx, user, userData]);

  // Fetch coordenador data once when chat opens in "coordenador" context
  useEffect(() => {
    if (!isOpen || context !== "coordenador" || coordCtx || !userData) return;

    const cursoIds = userData.cursoIds?.length
      ? userData.cursoIds
      : userData.cursoId  
        ? [userData.cursoId]
        : [];

    if (cursoIds.length === 0) return;

    buildCoordContext(userData.nome, cursoIds)
      .then(setCoordCtx)
      .catch(() => {});
  }, [isOpen, context, coordCtx, userData]);

  // Show welcome message when chat opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ id: "welcome", role: "model", text: WELCOME_MESSAGES[context] }]);
    }
  }, [isOpen, context, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", text };
    const history = messages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL;
      const res = await fetch(`${apiBase}/chat/mensagem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          context,
          history,
          alunoContext: context === "aluno" ? alunoCtx : undefined,
          coordenadorContext: context === "coordenador" ? coordCtx : undefined,
        }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "model",
          text: data.response ?? "Não consegui processar sua mensagem.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "model",
          text: "Erro de conexão. Verifique sua internet e tente novamente.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed bottom-20 right-4 z-50 flex flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl"
          style={{ width: "min(380px, calc(100vw - 32px))", height: "480px" }}
        >
          {/* Header */}
          <div
            className="flex shrink-0 items-center justify-between rounded-t-2xl px-4 py-3 text-white"
            style={{ background: "#1e3a5f" }}
          >
            <div className="flex items-center gap-2">
              <Bot size={20} />
              <div>
                <p className="text-sm font-semibold">Assistente SIGHC</p>
                <p className="text-xs opacity-70">{CONTEXT_LABELS[context]}</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 opacity-70 transition-opacity hover:opacity-100"
              aria-label="Fechar chat"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "rounded-br-sm text-white"
                      : "rounded-bl-sm bg-gray-100 text-gray-800"
                  }`}
                  style={msg.role === "user" ? { background: "#1e3a5f" } : {}}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-gray-100 px-4 py-3">
                  <div className="flex gap-1">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="inline-block h-2 w-2 animate-bounce rounded-full bg-gray-400"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-gray-100 p-3">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Digite sua mensagem..."
                disabled={isLoading}
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition-shadow focus:ring-2 focus:ring-blue-900/30 disabled:opacity-50"
                maxLength={2000}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="flex items-center justify-center rounded-xl p-2 text-white transition-opacity disabled:opacity-40"
                style={{ background: "#1e3a5f" }}
                aria-label="Enviar mensagem"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating trigger button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
        style={{ background: "#1e3a5f" }}
        aria-label="Abrir assistente"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </>
  );
}
