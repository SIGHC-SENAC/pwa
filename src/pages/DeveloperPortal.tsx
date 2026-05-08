import React, { useMemo, useState } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  ChevronDown,
  Clipboard,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Search,
  ServerCog,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
type Audience = "superAdmin" | "admin" | "aluno" | "publico";
interface Endpoint {
  id: string;
  group: string;
  title: string;
  method: HttpMethod;
  path: string;
  audience: Audience[];
  auth: "Bearer Firebase ID token" | "Pública";
  description: string;
  payload?: string;
  response?: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://api.sighc.com.br";
const POSTMAN_COLLECTION_URL =
  "https://web.postman.co/workspace/My-Workspace~bcfd2e47-7726-4914-8323-35559fa0d32d/collection/31258510-fda771e8-2196-496c-847f-5d7478e4fe9b?action=share&source=copy-link&creator=31258510";
const endpoints: Endpoint[] = [
  {
    id: "health",
    group: "status",
    title: "Status da API",
    method: "GET",
    path: "/",
    audience: ["publico"],
    auth: "Pública",
    description: "Confirma que a API HTTP das Functions esta respondendo.",
    response: '{\n  "status": "API funcionando"\n}',
  },
  {
    id: "auth-super-admin",
    group: "auth",
    title: "Login do superAdmin",
    method: "POST",
    path: "/auth/login/super-admin",
    audience: ["publico"],
    auth: "Pública",
    description: "Autentica o superAdmin por meio de um endpoint HTTP das Functions.",
    payload: '{\n  "email": "superadmin@sighc.com.br",\n  "password": "senha"\n}',
    response: '{\n  "uid": "firebase-uid",\n  "email": "superadmin@sighc.com.br",\n  "role": "superAdmin",\n  "tokenType": "Bearer",\n  "idToken": "firebase-id-token",\n  "refreshToken": "firebase-refresh-token",\n  "expiresIn": 3600\n}',
  },
  {
    id: "auth-admin",
    group: "auth",
    title: "Login do admin",
    method: "POST",
    path: "/auth/login/admin",
    audience: ["publico"],
    auth: "Pública",
    description: "Autentica administradores de curso/turma.",
    payload: '{\n  "email": "admin@sighc.com.br",\n  "password": "senha"\n}',
  },
  {
    id: "auth-aluno",
    group: "auth",
    title: "Login do aluno",
    method: "POST",
    path: "/auth/login/aluno",
    audience: ["publico"],
    auth: "Pública",
    description: "Autentica alunos para envio e consulta de certificados.",
    payload: '{\n  "email": "aluno@sighc.com.br",\n  "password": "senha"\n}',
  },
  {
    id: "admins-list",
    group: "admins",
    title: "Listar administradores",
    method: "GET",
    path: "/admins",
    audience: ["superAdmin"],
    auth: "Bearer Firebase ID token",
    description: "Retorna todos os usuários administrativos cadastrados.",
  },
  {
    id: "admins-create",
    group: "admins",
    title: "Criar administrador",
    method: "POST",
    path: "/admins",
    audience: ["superAdmin"],
    auth: "Bearer Firebase ID token",
    description: "Cria um novo admin vinculado a um ou mais cursos.",
    payload: '{\n  "nome": "Nome do admin",\n  "email": "admin@sighc.com.br",\n  "cursoIds": ["cursoId"]\n}',
  },
  {
    id: "admins-update",
    group: "admins",
    title: "Atualizar administrador",
    method: "PUT",
    path: "/admins/:id",
    audience: ["superAdmin"],
    auth: "Bearer Firebase ID token",
    description: "Atualiza nome, e-mail ou cursos vinculados ao admin.",
    payload: '{\n  "nome": "Novo nome",\n  "cursoIds": ["cursoId"]\n}',
  },
  {
    id: "admins-delete",
    group: "admins",
    title: "Excluir administrador",
    method: "DELETE",
    path: "/admins/:id",
    audience: ["superAdmin"],
    auth: "Bearer Firebase ID token",
    description: "Remove um usuário administrativo pelo ID.",
  },
  {
    id: "alunos-list",
    group: "alunos",
    title: "Listar alunos",
    method: "GET",
    path: "/alunos",
    audience: ["superAdmin"],
    auth: "Bearer Firebase ID token",
    description: "Lista alunos para superAdmin. Aceita filtro por cursoId via query string.",
  },
  {
    id: "alunos-create",
    group: "alunos",
    title: "Criar aluno",
    method: "POST",
    path: "/alunos",
    audience: ["superAdmin"],
    auth: "Bearer Firebase ID token",
    description: "Cria o cadastro de um aluno pelo superAdmin.",
    payload: '{\n  "nome": "Nome do aluno",\n  "email": "aluno@sighc.com.br",\n  "cursoId": "cursoId",\n  "turmaId": "turmaId"\n}',
  },
  {
    id: "alunos-update",
    group: "alunos",
    title: "Atualizar aluno",
    method: "PUT",
    path: "/alunos/:id",
    audience: ["superAdmin"],
    auth: "Bearer Firebase ID token",
    description: "Atualiza dados cadastrais, curso ou turma de um aluno pelo ID.",
    payload: '{\n  "nome": "Novo nome",\n  "cursoId": "cursoId",\n  "turmaId": "turmaId"\n}',
  },
  {
    id: "alunos-delete",
    group: "alunos",
    title: "Excluir aluno",
    method: "DELETE",
    path: "/alunos/:id",
    audience: ["superAdmin"],
    auth: "Bearer Firebase ID token",
    description: "Remove um aluno do Auth e do banco de dados pelo ID.",
  },
  {
    id: "cursos-list",
    group: "cursos",
    title: "Listar cursos",
    method: "GET",
    path: "/cursos",
    audience: ["superAdmin"],
    auth: "Bearer Firebase ID token",
    description: "Retorna a lista de cursos cadastrados.",
  },
  {
    id: "cursos-get",
    group: "cursos",
    title: "Buscar curso",
    method: "GET",
    path: "/cursos/:id",
    audience: ["superAdmin"],
    auth: "Bearer Firebase ID token",
    description: "Busca os detalhes de um curso específico.",
  },
  {
    id: "cursos-create",
    group: "cursos",
    title: "Criar curso",
    method: "POST",
    path: "/cursos",
    audience: ["superAdmin"],
    auth: "Bearer Firebase ID token",
    description: "Cadastra um curso no SIGHC.",
    payload: '{\n  "nome": "Análise e Desenvolvimento de Sistemas",\n  "codigo": "ADS",\n  "turno": "Noite"\n}',
  },
  {
    id: "cursos-update",
    group: "cursos",
    title: "Atualizar curso",
    method: "PUT",
    path: "/cursos/:id",
    audience: ["superAdmin"],
    auth: "Bearer Firebase ID token",
    description: "Atualiza os dados de um curso pelo ID.",
  },
  {
    id: "cursos-delete",
    group: "cursos",
    title: "Excluir curso",
    method: "DELETE",
    path: "/cursos/:id",
    audience: ["superAdmin"],
    auth: "Bearer Firebase ID token",
    description: "Remove um curso do cadastro.",
  },
  {
    id: "turmas-list",
    group: "turmas",
    title: "Listar turmas",
    method: "GET",
    path: "/turmas",
    audience: ["superAdmin"],
    auth: "Bearer Firebase ID token",
    description: "Lista turmas para superAdmin. Aceita filtro por cursoId via query string.",
  },
  {
    id: "turmas-get",
    group: "turmas",
    title: "Buscar turma",
    method: "GET",
    path: "/turmas/:id",
    audience: ["superAdmin"],
    auth: "Bearer Firebase ID token",
    description: "Busca dados de uma turma específica.",
  },
  {
    id: "turmas-create",
    group: "turmas",
    title: "Criar turma",
    method: "POST",
    path: "/turmas",
    audience: ["superAdmin"],
    auth: "Bearer Firebase ID token",
    description: "Cria uma nova turma vinculada a um curso.",
    payload: '{\n  "nome": "ADS 2026.1",\n  "cursoId": "cursoId",\n  "periodo": "2026.1"\n}',
  },
  {
    id: "turmas-update",
    group: "turmas",
    title: "Atualizar turma",
    method: "PUT",
    path: "/turmas/:id",
    audience: ["superAdmin"],
    auth: "Bearer Firebase ID token",
    description: "Atualiza os dados da turma pelo ID.",
  },
  {
    id: "turmas-delete",
    group: "turmas",
    title: "Excluir turma",
    method: "DELETE",
    path: "/turmas/:id",
    audience: ["superAdmin"],
    auth: "Bearer Firebase ID token",
    description: "Remove uma turma cadastrada.",
  },
  {
    id: "certificados-processar",
    group: "certificados",
    title: "Processar certificado",
    method: "POST",
    path: "/certificados/processar",
    audience: ["aluno"],
    auth: "Pública",
    description: "Processa um certificado enviado para leitura e validação.",
    payload: '{\n  "arquivoUrl": "https://...",\n  "alunoUid": "uid"\n}',
  },
  {
    id: "notificacoes-upload",
    group: "notificacoes",
    title: "Notificar upload de certificado",
    method: "POST",
    path: "/notificacoes/upload-certificado",
    audience: ["aluno"],
    auth: "Bearer Firebase ID token",
    description: "Dispara notificação para administradores após upload do aluno.",
  },
];

const audienceLabels: Record<Audience, string> = {
  superAdmin: "superAdmin",
  admin: "admin",
  aluno: "aluno",
  publico: "pública",
};

const methodClasses: Record<HttpMethod, string> = {
  GET: "border-blue-500 bg-blue-500 text-white",
  POST: "border-emerald-500 bg-emerald-500 text-white",
  PUT: "border-orange-400 bg-orange-400 text-white",
  DELETE: "border-red-500 bg-red-500 text-white",
};

const endpointClasses: Record<HttpMethod, string> = {
  GET: "border-blue-400 bg-blue-50",
  POST: "border-emerald-400 bg-emerald-50",
  PUT: "border-orange-300 bg-orange-50",
  DELETE: "border-red-400 bg-red-50",
};

const endpointDetailClasses: Record<HttpMethod, string> = {
  GET: "border-blue-200",
  POST: "border-emerald-200",
  PUT: "border-orange-200",
  DELETE: "border-red-200",
};

const endpointHoverClasses: Record<HttpMethod, string> = {
  GET: "hover:bg-blue-100/70",
  POST: "hover:bg-emerald-100/70",
  PUT: "hover:bg-orange-100/70",
  DELETE: "hover:bg-red-100/70",
};

function buildCurl(endpoint: Endpoint) {
  const headers = endpoint.auth === "Pública"
    ? '-H "Content-Type: application/json"'
    : '-H "Content-Type: application/json" \\\n  -H "Authorization: Bearer $FIREBASE_ID_TOKEN"';
  const body = endpoint.payload ? ` \\\n  -d '${endpoint.payload.replace(/\n/g, "")}'` : "";
  return `curl -X ${endpoint.method} "${API_BASE}${endpoint.path}" \\\n  ${headers}${body}`;
}

function getRoleFromSearch(value: string) {
  if (value === "superAdmin" || value === "admin" || value === "aluno" || value === "publico") {
    return value;
  }
  return "todos";
}

const DeveloperPortal: React.FC = () => {
  const { user, userData, loading, isSuperAdmin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<Audience | "todos">("todos");
  const [openEndpoint, setOpenEndpoint] = useState<string>("admins-list");
  const userLabel = userData?.nome || userData?.email || user?.email || "Usuário";

  const groups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = endpoints.filter((endpoint) => {
      const matchesRole = role === "todos" || endpoint.audience.includes(role);
      const haystack = `${endpoint.group} ${endpoint.title} ${endpoint.method} ${endpoint.path} ${endpoint.description}`.toLowerCase();
      return matchesRole && (!normalized || haystack.includes(normalized));
    });

    return filtered.reduce<Record<string, Endpoint[]>>((acc, endpoint) => {
      acc[endpoint.group] = [...(acc[endpoint.group] || []), endpoint];
      return acc;
    }, {});
  }, [query, role]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password) {
      toast.error("Preencha e-mail e senha.");
      return;
    }

    setLoginLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const token = await credential.user.getIdTokenResult(true);
      let detectedRole = token.claims.role as string | undefined;

      if (!detectedRole) {
        const userDoc = await getDoc(doc(db, "users", credential.user.uid));
        detectedRole = userDoc.exists() ? userDoc.data().role : undefined;
      }

      if (detectedRole !== "superAdmin") {
        await signOut(auth);
        toast.error("Este subdomínio é exclusivo para superAdmin.");
        return;
      }

      toast.success("Acesso liberado ao portal Developer.");
    } catch (error: any) {
      console.error("Erro no login developer:", error);
      toast.error("E-mail ou senha inválidos.");
    } finally {
      setLoginLoading(false);
    }
  };

  const copyCurl = async (endpoint: Endpoint) => {
    try {
      await navigator.clipboard.writeText(buildCurl(endpoint));
      toast.success("cURL copiado.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white text-slate-950">
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      </main>
    );
  }

  if (!user || !isSuperAdmin) {
    return (
      <main className="min-h-screen bg-white text-slate-950">
        <section className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative hidden overflow-hidden bg-[#00529b] px-10 py-8 text-white lg:flex lg:flex-col lg:items-center lg:justify-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_70%,rgba(255,255,255,0.08),transparent_18rem),radial-gradient(circle_at_84%_44%,rgba(255,255,255,0.08),transparent_16rem)]" />
            <div className="absolute bottom-24 left-20 h-28 w-28 rounded-full border border-white/10" />
            <div className="absolute right-16 top-1/3 h-48 w-48 rounded-full border border-white/10" />

            <div className="relative z-10 flex max-w-2xl flex-col items-center text-center">
              <img
                alt="Logo Senac"
                className="mb-12 h-28 w-auto brightness-0 invert"
                src="/senac-logo.png"
              />
              <h1 className="text-4xl font-extrabold leading-tight tracking-normal">
                Sistema integrado de gestão de horas complementares
              </h1>
              <h2 className="mt-6 text-4xl font-extrabold leading-tight tracking-normal">
                SIGHC
              </h2>
              <p className="mt-16 max-w-xl text-xl font-medium leading-8 text-white/75">
                Portal técnico para consulta da documentação e das rotas HTTP das Functions do SIGHC.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center bg-slate-50 px-5 py-10">
            <div className="w-full max-w-md">
              <div className="mb-8 flex flex-col items-center gap-4 text-center lg:hidden">
                <img alt="Logo Senac" className="h-20 w-auto" src="/senac-logo.png" />
                <div>
                  <p className="text-sm text-slate-500">site: developer-sighc</p>
                  <h1 className="text-xl font-bold">Documentação e rotas SIGHC</h1>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/70">
                <div className="mb-7">
                  <h2 className="text-2xl font-bold">Acesso à documentação</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Entre para visualizar a documentação operacional, os endpoints e os exemplos de requisição das Functions.
                  </p>
                </div>

                <form className="space-y-5" onSubmit={handleLogin}>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">E-mail</span>
                    <span className="relative block">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        className="h-11 border-slate-200 bg-white pl-10 text-slate-950 placeholder:text-slate-400"
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="superadmin@sighc.com.br"
                        type="email"
                        value={email}
                      />
                    </span>
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">Senha</span>
                    <span className="relative block">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        className="h-11 border-slate-200 bg-white px-10 text-slate-950 placeholder:text-slate-400"
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="********"
                        type={showPassword ? "text" : "password"}
                        value={password}
                      />
                      <button
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                        onClick={() => setShowPassword((current) => !current)}
                        type="button"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </span>
                  </label>

                  <Button className="h-11 w-full bg-blue-500 font-semibold text-white hover:bg-blue-400" disabled={loginLoading} type="submit">
                    {loginLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    Entrar na documentação
                  </Button>
                </form>
                <p className="mt-6 text-center text-xs text-slate-500">
                  Acesso restrito a contas com perfil superAdmin.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full border border-blue-300/30 bg-blue-400/10">
              <ServerCog className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Rotas da API SIGHC</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700">
              <UserCog className="h-4 w-4 text-blue-600" />
              {userLabel}
            </span>
            <a
              className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm text-blue-700 transition hover:border-blue-300 hover:bg-blue-50"
              href={API_BASE}
              rel="noreferrer"
              target="_blank"
            >
              API base
              <ExternalLink className="h-4 w-4" />
            </a>
            <a
              className="inline-flex h-10 items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 text-sm font-medium text-orange-700 transition hover:border-orange-300 hover:bg-orange-100"
              href={POSTMAN_COLLECTION_URL}
              rel="noreferrer"
              target="_blank"
            >
              Postman
              <ExternalLink className="h-4 w-4" />
            </a>
            <Button
              className="h-10 border-slate-200 bg-white text-slate-950 hover:bg-slate-100"
              onClick={() => signOut(auth)}
              variant="outline"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8">
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <div>
              <h2 className="text-2xl font-semibold">Documentação operacional do SIGHC</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Baseada nas rotas atuais em <span className="font-mono text-slate-800">functions/index.js</span>. Use o token Firebase no cabeçalho Authorization para acessar rotas protegidas.
              </p>
            </div>

          </div>

          <div className="grid gap-4 border-b border-slate-200 p-5 lg:grid-cols-[1fr_220px]">
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-11 border-slate-200 bg-white pl-10 text-slate-950 placeholder:text-slate-400"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por rota, método ou descrição"
                value={query}
              />
            </label>

            <label className="relative block">
              <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                className="h-11 w-full appearance-none rounded-md border border-slate-200 bg-white pl-10 pr-9 text-sm text-slate-950 outline-none ring-blue-400/30 transition focus:ring-2"
                onChange={(event) => setRole(getRoleFromSearch(event.target.value))}
                value={role}
              >
                <option value="todos">Todos os perfis</option>
                <option value="superAdmin">superAdmin</option>
                <option value="admin">admin</option>
                <option value="aluno">aluno</option>
                <option value="publico">públicas</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </label>
          </div>

          <div className="p-5">
            {Object.entries(groups).map(([group, groupEndpoints]) => (
              <section className="mb-8 last:mb-0" key={group}>
                <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-baseline gap-3">
                    <h3 className="text-2xl font-semibold">{group}</h3>
                    <span className="text-sm text-slate-500">{groupEndpoints.length} requisições</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {groupEndpoints.map((endpoint) => {
                    const isOpen = openEndpoint === endpoint.id;
                    return (
                      <article
                        className={`overflow-hidden rounded border-2 ${endpointClasses[endpoint.method]}`}
                        key={endpoint.id}
                      >
                        <button
                          className={`grid w-full grid-cols-[84px_1fr_auto] items-center gap-3 px-2 py-2 text-left transition md:grid-cols-[100px_1fr_auto] ${endpointHoverClasses[endpoint.method]}`}
                          onClick={() => setOpenEndpoint(isOpen ? "" : endpoint.id)}
                          type="button"
                        >
                          <span className={`rounded-sm border px-3 py-2 text-center text-xs font-bold uppercase shadow-sm md:text-sm ${methodClasses[endpoint.method]}`}>
                            {endpoint.method}
                          </span>
                          <span className="min-w-0">
                            <span className="font-mono text-sm font-bold text-slate-800 md:text-base">{endpoint.path}</span>
                            <span className="ml-3 hidden text-sm font-medium text-slate-500 md:inline">{endpoint.title}</span>
                          </span>
                          <ChevronDown className={`h-5 w-5 text-slate-500 transition ${isOpen ? "rotate-180" : ""}`} />
                        </button>

                        <div
                          aria-hidden={!isOpen}
                          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                        >
                          <div className="overflow-hidden">
                            <div className={`border-t bg-white p-5 transition-all duration-300 ease-in-out ${endpointDetailClasses[endpoint.method]} ${isOpen ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"}`}>
                              <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
                                <div>
                                  <p className="text-sm leading-6 text-slate-600">{endpoint.description}</p>
                                  <div className="mt-4 flex flex-wrap gap-2">
                                    {endpoint.audience.map((item) => (
                                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700" key={item}>
                                        {audienceLabels[item]}
                                      </span>
                                    ))}
                                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                                      {endpoint.auth}
                                    </span>
                                  </div>

                                  {endpoint.payload && (
                                    <div className="mt-5">
                                      <p className="mb-2 text-sm font-semibold text-slate-700">Body exemplo</p>
                                      <pre className="overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-700">
                                        <code>{endpoint.payload}</code>
                                      </pre>
                                    </div>
                                  )}

                                  {endpoint.response && (
                                    <div className="mt-5">
                                      <p className="mb-2 text-sm font-semibold text-slate-700">Resposta exemplo</p>
                                      <pre className="overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-700">
                                        <code>{endpoint.response}</code>
                                      </pre>
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <div className="mb-2 flex items-center justify-between">
                                    <p className="text-sm font-semibold text-slate-700">cURL</p>
                                    <button
                                      className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5 text-xs text-blue-700 transition hover:bg-blue-50"
                                      onClick={() => copyCurl(endpoint)}
                                      type="button"
                                    >
                                      <Clipboard className="h-3.5 w-3.5" />
                                      copiar
                                    </button>
                                  </div>
                                  <pre className="max-h-72 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-700">
                                    <code>{buildCurl(endpoint)}</code>
                                  </pre>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}

            {Object.keys(groups).length === 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                Nenhuma requisicao encontrada com os filtros atuais.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
};

export default DeveloperPortal;
