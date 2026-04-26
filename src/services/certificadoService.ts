import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  UploadTask,
} from "firebase/storage";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { storage, db } from "@/lib/firebase";

const COLLECTION = "certificados_horas_complementares";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface CertificadoMeta {
  id: string;
  uid: string;
  nomeAluno: string;
  emailAluno: string;
  role: string;
  nomeArquivo: string;
  storagePath: string;
  downloadURL: string;
  contentType: string;
  tamanhoBytes: number;
  status: "pendente" | "aprovado" | "rejeitado";
  observacaoAluno: string;
  categoriaId: string | null;
  categoriaNome: string | null;
  cursoId?: string | null;
  cursoNome?: string | null;
  cursoCodigo?: string | null;
  horasInformadas: number | null;
  horasAprovadas: number | null;
  observacaoAdmin: string | null;
  motivoRejeicao: string | null;
  nomeAdmin: string | null;
  analisadoPor: string | null;
  dataAnalise: { seconds: number; nanoseconds: number } | null;
  createdAt: { seconds: number; nanoseconds: number } | null;
  updatedAt: { seconds: number; nanoseconds: number } | null;
}

export function validatePDF(file: File): string | null {
  if (file.type !== "application/pdf") {
    return "Apenas arquivos PDF são aceitos.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return `O arquivo excede o limite de ${MAX_FILE_SIZE / (1024 * 1024)}MB.`;
  }
  return null;
}

export function uploadCertificado(
  file: File,
  uid: string
): { task: UploadTask; storagePath: string } {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `certificados_temp/${uid}/${timestamp}-${safeName}`;
  const storageRef = ref(storage, storagePath);
  const task = uploadBytesResumable(storageRef, file, {
    contentType: "application/pdf",
  });
  return { task, storagePath };
}

const API_BASE = import.meta.env.VITE_API_BASE_URL;

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
  const data = await res.json();
  if (!res.ok) {
    const error: any = new Error(data.error || "Erro ao processar certificado");
    error.encontrados = data.encontrados;
    throw error;
  }
  return data;
}

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

export async function getDownloadURLFromPath(storagePath: string): Promise<string> {
  const storageRef = ref(storage, storagePath);
  return getDownloadURL(storageRef);
}

export async function fetchCertificados(uid: string): Promise<CertificadoMeta[]> {
  try {
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
    // Fallback: query without orderBy (no composite index needed)
    const q = query(
      collection(db, COLLECTION),
      where("uid", "==", uid)
    );
    const snapshot = await getDocs(q);
    const docs = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as CertificadoMeta[];
    // Sort client-side
    return docs.sort((a, b) => {
      const ta = a.createdAt?.seconds ?? 0;
      const tb = b.createdAt?.seconds ?? 0;
      return tb - ta;
    });
  }
}

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

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}
