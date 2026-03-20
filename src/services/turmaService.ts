import { auth } from "@/lib/firebase";

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

export interface Turma {
  id?: string;
  nome: string;
  cursoId: string;
  cursoNome?: string;
  cursoCodigo?: string;
  horario: string;
  periodoInicio: string;
  periodoFinal: string;
  criadoEm?: string;
}

export async function fetchTurmas(cursoId?: string): Promise<Turma[]> {
  const headers = await getAuthHeaders();
  const params = cursoId ? `?cursoId=${cursoId}` : "";
  const res = await fetch(`${API_BASE}/turmas${params}`, { headers });
  if (!res.ok) throw new Error("Erro ao buscar turmas");
  return res.json();
}

export async function createTurma(turma: Omit<Turma, "id" | "criadoEm" | "cursoNome" | "cursoCodigo">): Promise<Turma> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/turmas`, {
    method: "POST",
    headers,
    body: JSON.stringify(turma),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Erro ao criar turma");
  }
  return res.json();
}

export async function updateTurma(id: string, turma: Partial<Omit<Turma, "id">>): Promise<Turma> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/turmas/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(turma),
  });
  if (!res.ok) throw new Error("Erro ao atualizar turma");
  return res.json();
}

export async function deleteTurma(id: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/turmas/${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error("Erro ao excluir turma");
}
