import {
  collection,
  query,
  where,
  getCountFromServer,
  orderBy,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { CertificadoMeta } from "./certificadoService";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Usuário não autenticado");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export type CertPageResult = {
  certs: CertificadoMeta[];
  lastId: string | null;
  hasMore: boolean;
};

/**
 * Busca uma página de certificados via API backend.
 * O backend enriquece nomeAluno/emailAluno a partir da coleção users.
 */
export async function fetchCertificadosPaged(options: {
  startAfterId?: string | null;
  statusFilter?: string | null;
  uidFilter?: string | null;
  turmaId?: string | null;
  cursoIds?: string[];
  sortField?: "createdAt" | "nomeAluno";
  sortDir?: "asc" | "desc";
}): Promise<CertPageResult> {
  const {
    startAfterId = null,
    statusFilter = null,
    uidFilter = null,
    turmaId = null,
    cursoIds = [],
    sortField = "createdAt",
    sortDir = "desc",
  } = options;

  const params = new URLSearchParams();
  if (startAfterId)                             params.set("startAfterId", startAfterId);
  if (statusFilter && statusFilter !== "todos") params.set("status", statusFilter);
  if (uidFilter)                                params.set("uid", uidFilter);
  if (turmaId)                                  params.set("turmaId", turmaId);
  if (cursoIds.length === 1)                    params.set("cursoId", cursoIds[0]);
  params.set("sortField", sortField);
  params.set("sortDir", sortDir);

  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/certificados?${params.toString()}`, { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`[${res.status}] Erro ao buscar certificados: ${body}`);
  }

  const data = await res.json();
  return {
    certs:  data.certs  as CertificadoMeta[],
    lastId: data.lastId as string | null,
    hasMore: data.hasMore as boolean,
  };
}

export async function fetchCertificadosStats(cursoIds: string[]): Promise<{
  total: number;
  pendentes: number;
  aprovados: number;
  rejeitados: number;
}> {
  const base = collection(db, COLLECTION);

  const makeQuery = (extraWhere?: any) => {
    const constraints: any[] = [];
    if (cursoIds.length > 0 && cursoIds.length <= 10)
      constraints.push(where("cursoId", "in", cursoIds));
    if (extraWhere) constraints.push(extraWhere);
    return constraints.length ? query(base, ...constraints) : query(base);
  };

  try {
    const [total, pendentes, aprovados, rejeitados] = await Promise.all([
      getCountFromServer(makeQuery()),
      getCountFromServer(makeQuery(where("status", "==", "pendente"))),
      getCountFromServer(makeQuery(where("status", "==", "aprovado"))),
      getCountFromServer(makeQuery(where("status", "==", "rejeitado"))),
    ]);
    return {
      total: total.data().count,
      pendentes: pendentes.data().count,
      aprovados: aprovados.data().count,
      rejeitados: rejeitados.data().count,
    };
  } catch {
    return { total: 0, pendentes: 0, aprovados: 0, rejeitados: 0 };
  }
}

const COLLECTION = "certificados_horas_complementares";

async function notificarAlunoCertificadoAnalisado(
  certificado: CertificadoMeta,
  status: "aprovado" | "rejeitado",
  extra: { horasAprovadas?: number; motivoRejeicao?: string } = {}
): Promise<void> {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;

    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/notificacoes/certificado-analisado`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        alunoId: certificado.uid,
        certificadoId: certificado.id,
        status,
        nomeArquivo: certificado.nomeArquivo,
        ...extra,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erro ao enviar notificacao ao aluno");
    }
  } catch (err) {
    console.warn("Nao foi possivel enviar push ao aluno:", err);
  }
}

export async function fetchAllCertificados(): Promise<CertificadoMeta[]> {
  try {
    const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as CertificadoMeta[];
  } catch (err) {
    console.warn("Query com orderBy falhou, tentando sem:", err);
    const snapshot = await getDocs(collection(db, COLLECTION));
    const docs = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as CertificadoMeta[];

    const tsMs = (ts: any): number => {
      if (!ts) return 0;
      if (typeof ts === "number") return ts > 1e10 ? ts : ts * 1000;
      if (typeof ts.seconds === "number") return ts.seconds * 1000;
      return 0;
    };
    return docs.sort((a, b) => tsMs(b.createdAt) - tsMs(a.createdAt));
  }
}

export async function aprovarCertificado(
  certId: string,
  adminUid: string,
  adminNome: string,
  horasAprovadas: number,
  observacaoAdmin: string
): Promise<void> {
  const docRef = doc(db, COLLECTION, certId);
  const certSnap = await getDoc(docRef);
  const cert = certSnap.exists() ? ({ id: certSnap.id, ...certSnap.data() } as CertificadoMeta) : null;

  await updateDoc(docRef, {
    status: "aprovado",
    horasAprovadas,
    observacaoAdmin: observacaoAdmin || "",
    motivoRejeicao: "",
    analisadoPor: adminUid,
    nomeAdmin: adminNome,
    dataAnalise: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (cert) {
    await notificarAlunoCertificadoAnalisado(cert, "aprovado", { horasAprovadas });
  }
}

export async function rejeitarCertificado(
  certId: string,
  adminUid: string,
  adminNome: string,
  motivoRejeicao: string,
  observacaoAdmin: string
): Promise<void> {
  const docRef = doc(db, COLLECTION, certId);
  const certSnap = await getDoc(docRef);
  const cert = certSnap.exists() ? ({ id: certSnap.id, ...certSnap.data() } as CertificadoMeta) : null;

  await updateDoc(docRef, {
    status: "rejeitado",
    horasAprovadas: 0,
    observacaoAdmin: observacaoAdmin || "",
    motivoRejeicao,
    analisadoPor: adminUid,
    nomeAdmin: adminNome,
    dataAnalise: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (cert) {
    await notificarAlunoCertificadoAnalisado(cert, "rejeitado", { motivoRejeicao });
  }
}

export async function atualizarCategoriaCertificado(
  certId: string,
  categoriaId: string | null,
  categoriaNome: string | null
): Promise<void> {
  const docRef = doc(db, COLLECTION, certId);
  await updateDoc(docRef, {
    categoriaId,
    categoriaNome,
    updatedAt: serverTimestamp(),
  });
}
