// Importações do Firebase Storage para upload de arquivos
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  UploadTask,
} from "firebase/storage";
// Importações do Firestore para operações com banco de dados
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
// Importa instâncias do Firebase
import { storage, db } from "@/lib/firebase";

// Nome da coleção no Firestore
const COLLECTION = "certificados_horas_complementares";
// Limite máximo para upload de arquivo (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Interface que define a estrutura de um certificado de horas complementares
 * Contém informações do aluno, arquivo, status, e validação
 */
export interface CertificadoMeta {
  // ID único do certificado
  id: string;
  // ID do usuário (aluno) que enviou
  uid: string;
  // Nome do aluno
  nomeAluno: string;
  // Email do aluno
  emailAluno: string;
  // Papel do usuário (sempre 'aluno' neste caso)
  role: string;
  // Nome do arquivo enviado
  nomeArquivo: string;
  // Caminho do arquivo no Storage
  storagePath: string;
  // URL para download do arquivo
  downloadURL: string;
  // Tipo de conteúdo do arquivo (application/pdf)
  contentType: string;
  // Tamanho do arquivo em bytes
  tamanhoBytes: number;
  // Status do certificado: pendente, aprovado ou rejeitado
  status: "pendente" | "aprovado" | "rejeitado";
  // Observação do aluno sobre o certificado
  observacaoAluno: string;
  // ID da categoria de atividade complementar
  categoriaId: string | null;
  // Nome da categoria de atividade
  categoriaNome: string | null;
  // ID do curso
  cursoId?: string | null;
  // Nome do curso
  cursoNome?: string | null;
  // Código do curso
  cursoCodigo?: string | null;
  // Horas informadas pelo aluno
  horasInformadas: number | null;
  // Horas aprovadas pelo administrador
  horasAprovadas: number | null;
  // Observação do administrador
  observacaoAdmin: string | null;
  // Motivo da rejeição (se rejeitado)
  motivoRejeicao: string | null;
  // Nome do administrador que analisou
  nomeAdmin: string | null;
  // ID do administrador que analisou
  analisadoPor: string | null;
  // Data da análise (timestamp)
  dataAnalise: { seconds: number; nanoseconds: number } | null;
  // Data de criação (timestamp)
  createdAt: { seconds: number; nanoseconds: number } | null;
  // Data de última atualização (timestamp)
  updatedAt: { seconds: number; nanoseconds: number } | null;
}

/**
 * Valida se o arquivo é um PDF válido
 * @param file - Arquivo a validar
 * @returns String com mensagem de erro ou null se válido
 */
export function validatePDF(file: File): string | null {
  // Verifica se o arquivo é um PDF
  if (file.type !== "application/pdf") {
    return "Apenas arquivos PDF são aceitos.";
  }
  // Verifica se o arquivo não ultrapassa o limite de tamanho
  if (file.size > MAX_FILE_SIZE) {
    return `O arquivo excede o limite de ${MAX_FILE_SIZE / (1024 * 1024)}MB.`;
  }
  return null;
}

/**
 * Inicia upload de um certificado para o Firebase Storage
 * @param file - Arquivo PDF a fazer upload
 * @param uid - ID do usuário
 * @returns Objeto com UploadTask e caminho do arquivo no storage
 */
export function uploadCertificado(
  file: File,
  uid: string
): { task: UploadTask; storagePath: string } {
  // Gera timestamp para garantir unicidade
  const timestamp = Date.now();
  // Remove caracteres especiais do nome do arquivo
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  // Cria caminho no storage: certificados_temp/uid/timestamp-nome
  const storagePath = `certificados_temp/${uid}/${timestamp}-${safeName}`;
  // Referência ao arquivo no storage
  const storageRef = ref(storage, storagePath);
  // Inicia upload do arquivo
  const task = uploadBytesResumable(storageRef, file, {
    contentType: "application/pdf",
  });
  return { task, storagePath };
}

// URL base da API backend
const API_BASE = import.meta.env.VITE_API_BASE_URL;

/**
 * Processa o certificado enviado
 * Envia para backend que analisa o PDF e extrai informações
 * @param uid - ID do usuário
 * @param storagePath - Caminho do arquivo no storage
 * @param nomeArquivo - Nome original do arquivo
 * @param token - Token JWT do usuário
 * @param categoriaId - ID da categoria de atividade
 * @param categoriaNome - Nome da categoria
 * @param cursoId - ID do curso
 * @param cursoNome - Nome do curso
 * @param cursoCodigo - Código do curso
 * @param nomeAluno - Nome do aluno
 * @param emailAluno - Email do aluno
 * @param observacaoAluno - Observação do aluno
 * @returns Resultado do processamento com caminho final ou erro
 */
export async function processarCertificado(
  uid: string,
  storagePath: string,
  nomeArquivo: string,
  token: string,
  categoriaId?: string | null,
  categoriaNome?: string | null,
  cursoId?: string | null,
  cursoNome?: string | null,
  cursoCodigo?: string | null,
  nomeAluno?: string,
  emailAluno?: string,
  observacaoAluno?: string
): Promise<{ ok: boolean; finalPath?: string; certificadoId?: string; error?: string; encontrados?: string[] }> {
  // Realiza requisição POST para backend processar o certificado
  const res = await fetch(`${API_BASE}/certificados/processar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      uid,
      storagePath,
      nomeArquivo,
      categoriaId,
      categoriaNome,
      cursoId,
      cursoNome,
      cursoCodigo,
      nomeAluno,
      emailAluno,
      observacaoAluno,
    }),
  });
  
  // Parse da resposta JSON
  const data = await res.json();
  
  // Se houver erro na resposta
  if (!res.ok) {
    const error: any = new Error(data.error || "Erro ao processar certificado");
    error.encontrados = data.encontrados;
    throw error;
  }
  
  return data;
}

/**
 * Salva os metadados do certificado no Firestore
 * @param data - Objeto com informações do certificado
 * @returns ID do documento criado
 */
export async function saveCertificadoMeta(data: {
  uid: string;
  nomeAluno: string;
  emailAluno: string;
  nomeArquivo: string;
  storagePath: string;
  downloadURL: string;
  tamanhoBytes: number;
  observacaoAluno: string;
  categoriaId: string | null;
  categoriaNome: string | null;
  cursoId?: string | null;
  cursoNome?: string | null;
  cursoCodigo?: string | null;
}): Promise<string> {
  // Adiciona novo documento à coleção
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    role: "aluno",
    contentType: "application/pdf",
    status: "pendente",
    horasInformadas: null,
    analisadoPor: null,
    dataAnalise: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  return docRef.id;
}

/**
 * Obtém a URL de download de um arquivo no Storage
 * @param storagePath - Caminho do arquivo no storage
 * @returns URL de download
 */
export async function getDownloadURLFromPath(storagePath: string): Promise<string> {
  const storageRef = ref(storage, storagePath);
  return getDownloadURL(storageRef);
}

/**
 * Busca todos os certificados de um aluno
 * @param uid - ID do usuário (aluno)
 * @returns Array de certificados ordenados por data (mais recente primeiro)
 */
export async function fetchCertificados(uid: string): Promise<CertificadoMeta[]> {
  try {
    // Tenta com ordenação (requer índice composto no Firestore)
    const q = query(
      collection(db, COLLECTION),
      where("uid", "==", uid),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as CertificadoMeta[];
  } catch (err) {
    console.warn("Query com orderBy falhou (índice composto necessário?), tentando sem orderBy:", err);
    
    // Fallback: busca sem ordenação
    const q = query(
      collection(db, COLLECTION),
      where("uid", "==", uid)
    );
    const snapshot = await getDocs(q);
    const docs = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as CertificadoMeta[];
    
    // Ordena no client-side
    return docs.sort((a, b) => {
      const ta = a.createdAt?.seconds ?? 0;
      const tb = b.createdAt?.seconds ?? 0;
      return tb - ta;
    });
  }
}

/**
 * Salva um certificado rejeitado
 * Usado quando o PDF não passa na validação de segurança
 * @param data - Informações do certificado rejeitado
 * @returns ID do documento criado
 */
export async function saveRejectedCertificado(data: {
  uid: string;
  nomeAluno?: string;
  emailAluno?: string;
  nomeArquivo: string;
  motivoRejeicao: string;
  encontrados?: string[];
  categoriaId?: string | null;
  categoriaNome?: string | null;
  cursoId?: string | null;
  cursoNome?: string | null;
  cursoCodigo?: string | null;
}): Promise<string> {
  // Adiciona certificado com status rejeitado
  const docRef = await addDoc(collection(db, COLLECTION), {
    uid: data.uid,
    nomeAluno: data.nomeAluno || "",
    emailAluno: data.emailAluno || "",
    nomeArquivo: data.nomeArquivo,
    storagePath: "",
    downloadURL: "",
    contentType: "application/pdf",
    tamanhoBytes: 0,
    status: "rejeitado",
    role: "aluno",
    observacaoAluno: "",
    categoriaId: data.categoriaId ?? null,
    categoriaNome: data.categoriaNome ?? null,
    cursoId: data.cursoId ?? null,
    cursoNome: data.cursoNome ?? null,
    cursoCodigo: data.cursoCodigo ?? null,
    horasInformadas: null,
    horasAprovadas: null,
    observacaoAdmin: null,
    motivoRejeicao: data.motivoRejeicao,
    nomeAdmin: "Sistema",
    analisadoPor: "sistema",
    dataAnalise: serverTimestamp(),
    analiseSeguranca: "rejeitado",
    encontradosSuspeitos: data.encontrados || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  return docRef.id;
}

/**
 * Formata o tamanho de arquivo para formato legível
 * @param bytes - Tamanho em bytes
 * @returns String com tamanho formatado (B, KB, ou MB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}
