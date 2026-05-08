// Importações do Firebase Auth
import { auth, db } from "@/lib/firebase";
// Importações do Firestore
import { doc, getDoc } from "firebase/firestore";
// Importa interface de categorias de atividades
import type { GrupoAtividade } from "@/lib/categoriasComplementares";

// URL base da API backend
const API_BASE = import.meta.env.VITE_API_BASE_URL;

/**
 * Função auxiliar para obter headers com token JWT
 * @returns Headers com autorização para requisições autenticadas
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  // Obtém usuário autenticado
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado");
  // Obtém token JWT do usuário
  const token = await user.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Interface que define a estrutura de um curso
 */
export interface Curso {
  // ID único do curso
  id?: string;
  // Nome do curso
  nome: string;
  // Código do curso
  codigo: string;
  // Turno do curso (manhã, tarde ou noite)
  turno: "manhã" | "tarde" | "noite";
  // Carga horária mínima de horas complementares exigida
  cargaHorariaComplementar: number;
  // Regras e categorias de atividades permitidas
  regrasAtividades?: GrupoAtividade[];
  // Data de criação
  criadoEm?: string;
}

/**
 * Busca um curso pelo ID
 * Acessa direto no Firestore (acessível a alunos)
 * @param id - ID do curso a buscar
 * @returns Objeto com dados do curso
 */
export async function fetchCursoById(id: string): Promise<Curso> {
  // Busca documento do curso no Firestore
  const snap = await getDoc(doc(db, "cursos", id));
  if (!snap.exists()) throw new Error("Curso não encontrado");
  return { id: snap.id, ...snap.data() } as Curso;
}

/**
 * Interface para payload de criação/atualização de aluno
 */
export interface AlunoPayload {
  // Nome completo do aluno
  nome: string;
  // Email do aluno
  email: string;
  // ID do curso (para aluno com um curso)
  cursoId?: string;
  // Array de IDs de cursos (para aluno com múltiplos cursos)
  cursoIds?: string[];
  // ID da turma do aluno
  turmaId?: string;
  // IDs das turmas do aluno, uma por curso quando houver multiplos cursos
  turmaIds?: string[];
}

// ── Cursos CRUD (Create, Read, Update, Delete) ──

/**
 * Busca todos os cursos cadastrados
 * @returns Array de cursos
 */
export async function fetchCursos(): Promise<Curso[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/cursos`, { headers });
  if (!res.ok) throw new Error("Erro ao buscar cursos");
  return res.json();
}

/**
 * Cria um novo curso
 * @param curso - Objeto com dados do novo curso (sem ID, código e data)
 * @returns Dados do curso criado com ID
 */
export async function createCurso(curso: Omit<Curso, "id" | "criadoEm" | "codigo">): Promise<Curso> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/cursos`, {
    method: "POST",
    headers,
    body: JSON.stringify(curso),
  });
  if (!res.ok) throw new Error("Erro ao criar curso");
  return res.json();
}

/**
 * Atualiza um curso existente
 * @param id - ID do curso a atualizar
 * @param curso - Objeto com dados a atualizar
 * @returns Dados do curso atualizado
 */
export async function updateCurso(id: string, curso: Partial<Omit<Curso, "id">>): Promise<Curso> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/cursos/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(curso),
  });
  if (!res.ok) throw new Error("Erro ao atualizar curso");
  return res.json();
}

/**
 * Deleta um curso
 * @param id - ID do curso a deletar
 */
export async function deleteCurso(id: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/cursos/${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error("Erro ao excluir curso");
}

// ── Alunos CRUD ──

/**
 * Interface que define um aluno
 */
export interface Aluno {
  // ID único do aluno
  id: string;
  // Nome completo do aluno
  nome: string;
  // Email do aluno
  email: string;
  // ID do curso principal
  cursoId: string;
  // Código do curso principal
  cursoCodigo?: string;
  // Nome do curso principal
  cursoNome?: string;
  // Array de IDs de cursos (para alunos em múltiplos cursos)
  cursoIds?: string[];
  // Array de objetos com informações detalhadas dos cursos
  cursos?: Array<{ id: string; nome: string; codigo?: string; turno?: string }>;
  // ID da turma
  turmaId?: string;
  // Nome da turma
  turmaNome?: string;
  // IDs das turmas vinculadas ao aluno
  turmaIds?: string[];
  // Turmas vinculadas ao aluno, com informacoes do curso correspondente
  turmas?: Array<{
    id: string;
    nome: string;
    cursoId?: string;
    cursoNome?: string;
    cursoCodigo?: string;
    horario?: string;
    periodoInicio?: string;
    periodoFinal?: string;
  }>;
  // Timestamp de criação
  createdAt?: number;
}

/**
 * Busca todos os alunos (de um curso específico se informado)
 * @param cursoId - ID do curso para filtrar (opcional)
 * @returns Array de alunos
 */
export async function fetchAlunos(cursoId?: string): Promise<Aluno[]> {
  const headers = await getAuthHeaders();
  // Adiciona parâmetro de filtro se curso for informado
  const params = cursoId ? `?cursoId=${cursoId}` : "";
  const res = await fetch(`${API_BASE}/alunos${params}`, { headers });
  if (!res.ok) throw new Error("Erro ao buscar alunos");
  return res.json();
}

/**
 * Cria um novo aluno
 * @param payload - Objeto com dados do novo aluno
 * @returns Dados do aluno criado
 */
export async function createAluno(payload: AlunoPayload): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/alunos`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Erro ao cadastrar aluno");
  }
  return res.json();
}

/**
 * Atualiza um aluno existente
 * @param id - ID do aluno a atualizar
 * @param payload - Dados atualizados do aluno
 * @returns Dados atualizados do aluno
 */
export async function updateAluno(id: string, payload: AlunoPayload): Promise<Aluno> {
  const headers = await getAuthHeaders();
  const cursoId = payload.cursoId || payload.cursoIds?.[0];
  const res = await fetch(`${API_BASE}/alunos/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ ...payload, cursoId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Erro ao atualizar aluno");
  }
  return res.json();
}

/**
 * Deleta um aluno
 * @param id - ID do aluno a deletar
 */
export async function deleteAluno(id: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/alunos/${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Erro ao excluir aluno");
  }
}
