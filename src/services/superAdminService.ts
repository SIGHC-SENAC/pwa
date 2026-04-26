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

export interface AdminUser {
  id: string;
  nome: string;
  email: string;
  role: string;
  cursoId?: string;
  cursoNome?: string;
  cursoCodigo?: string;
  cursoIds?: string[];
  cursos?: Array<{ id: string; nome: string; codigo?: string; turno?: string }>;
  createdAt?: number;
}

export async function fetchAdmins(): Promise<AdminUser[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/admins`, { headers });
  if (!res.ok) throw new Error("Erro ao buscar admins");
  return res.json();
}

export async function createAdmin(payload: { nome: string; email: string; cursoId?: string; cursoIds?: string[] }): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/admins`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Erro ao cadastrar admin");
  }
  return res.json();
}

export async function updateAdmin(id: string, payload: { nome?: string; email?: string; cursoId?: string; cursoIds?: string[] }): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/admins/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Erro ao atualizar admin");
  return res.json();
}

export async function deleteAdmin(id: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/admins/${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error("Erro ao excluir admin");
}
