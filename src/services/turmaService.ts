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
 * Interface que define uma turma
 */
export interface Turma {
  // ID único da turma
  id?: string;
  // Nome da turma
  nome: string;
  // ID do curso ao qual a turma pertence
  cursoId: string;
  // Nome do curso
  cursoNome?: string;
  // Código do curso
  cursoCodigo?: string;
  // Horário da turma
  horario: string;
  // Data de início do período
  periodoInicio: string;
  // Data de término do período
  periodoFinal: string;
  // Data de criação
  criadoEm?: string;
}

/**
 * Busca todas as turmas (de um curso específico se informado)
 * @param cursoId - ID do curso para filtrar (opcional)
 * @returns Array de turmas
 */
export async function fetchTurmas(cursoId?: string): Promise<Turma[]> {
  const headers = await getAuthHeaders();
  // Adiciona parâmetro de filtro se curso for informado
  const params = cursoId ? `?cursoId=${cursoId}` : "";
  const res = await fetch(`${API_BASE}/turmas${params}`, { headers });
  if (!res.ok) throw new Error("Erro ao buscar turmas");
  return res.json();
}

/**
 * Cria uma nova turma
 * @param turma - Objeto com dados da nova turma (sem ID, data de criação, nome e código do curso)
 * @returns Dados da turma criada com ID
 */
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

/**
 * Atualiza uma turma existente
 * @param id - ID da turma a atualizar
 * @param turma - Objeto com dados a atualizar
 * @returns Dados da turma atualizada
 */
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

/**
 * Deleta uma turma
 * @param id - ID da turma a deletar
 */
export async function deleteTurma(id: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/turmas/${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error("Erro ao excluir turma");
}
