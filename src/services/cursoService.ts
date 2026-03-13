import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const API_BASE = "https://us-central1-pi-3p-tads049.cloudfunctions.net/app";

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
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/cursos/${id}`, { headers });
  if (!res.ok) throw new Error("Erro ao buscar curso");
  return res.json();
}

export interface AlunoPayload {
  nome: string;
  email: string;
  cursoId: string;
}

// ── Cursos CRUD ──

export async function fetchCursos(): Promise<Curso[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/cursos`, { headers });
  if (!res.ok) throw new Error("Erro ao buscar cursos");
  return res.json();
}

export async function createCurso(curso: Omit<Curso, "id" | "criadoEm">): Promise<Curso> {
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
