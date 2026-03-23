import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export interface Curso {
  id?: string;
  nome: string;
  codigo: string;
  turno: "manhã" | "tarde" | "noite";
  cargaHorariaComplementar: number;
  criadoEm?: string;
}

export async function fetchCursoById(id: string): Promise<Curso> {
  // Busca direto do Firestore (acessível ao aluno sem precisar de role admin)
  const snap = await getDoc(doc(db, "cursos", id));
  if (!snap.exists()) throw new Error("Curso não encontrado");
  return { id: snap.id, ...snap.data() } as Curso;
}

export interface AlunoPayload {
  nome: string;
  email: string;
  cursoId: string;
  turmaId?: string;
}

// ── Cursos CRUD ──

export async function fetchCursos(): Promise<Curso[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/cursos`, { headers });
  if (!res.ok) throw new Error("Erro ao buscar cursos");
  return res.json();
}

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

export async function deleteCurso(id: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/cursos/${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error("Erro ao excluir curso");
}

// ── Alunos ──

export interface Aluno {
  id: string;
  nome: string;
  email: string;
  cursoId: string;
  cursoCodigo?: string;
  cursoNome?: string;
  turmaId?: string;
  turmaNome?: string;
  createdAt?: number;
}

export async function fetchAlunos(cursoId?: string): Promise<Aluno[]> {
  const headers = await getAuthHeaders();
  const params = cursoId ? `?cursoId=${cursoId}` : "";
  const res = await fetch(`${API_BASE}/alunos${params}`, { headers });
  if (!res.ok) throw new Error("Erro ao buscar alunos");
  return res.json();
}

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
