// Importações do Firebase Auth
import { auth } from "@/lib/firebase";

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
 * Interface que define um usuário administrador
 */
export interface AdminUser {
  // ID único do admin
  id: string;
  // Nome completo do admin
  nome: string;
  // Email do admin
  email: string;
  // Papel/função (admin ou superAdmin)
  role: string;
  // ID do curso (para admin de um curso específico)
  cursoId?: string;
  // Nome do curso
  cursoNome?: string;
  // Código do curso
  cursoCodigo?: string;
  // Array de IDs de cursos (para admin com múltiplos cursos)
  cursoIds?: string[];
  // Array de objetos com informações detalhadas dos cursos
  cursos?: Array<{ id: string; nome: string; codigo?: string; turno?: string }>;
  // Timestamp de criação
  createdAt?: number;
}

/**
 * Busca todos os administradores
 * @returns Array de usuários administradores
 */
export async function fetchAdmins(): Promise<AdminUser[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/admins`, { headers });
  if (!res.ok) throw new Error("Erro ao buscar admins");
  return res.json();
}

/**
 * Cria um novo administrador
 * @param payload - Objeto com dados do novo admin
 * @returns Dados do admin criado
 */
export async function createAdmin(payload: { nome: string; email: string; cursoId?: string; cursoIds?: string[] }): Promise<any> {
  if (!payload.email.toLowerCase().endsWith("@edu.pe.senac.br")) {
    throw new Error("O e-mail do administrador deve ser do domínio @edu.pe.senac.br");
  }

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

/**
 * Atualiza um administrador existente
 * @param id - ID do admin a atualizar
 * @param payload - Objeto com dados a atualizar
 * @returns Dados do admin atualizado
 */
export async function updateAdmin(id: string, payload: { nome?: string; cursoId?: string; cursoIds?: string[] }): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/admins/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Erro ao atualizar admin");
  return res.json();
}

/**
 * Deleta um administrador
 * @param id - ID do admin a deletar
 */
export async function deleteAdmin(id: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/admins/${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error("Erro ao excluir admin");
}
