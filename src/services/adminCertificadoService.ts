import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { CertificadoMeta } from "./certificadoService";

const COLLECTION = "certificados_horas_complementares";

export interface CertificadoAdmin extends CertificadoMeta {
  horasAprovadas?: number | null;
  observacaoAdmin?: string | null;
  nomeAdmin?: string | null;
}

export async function fetchAllCertificados(): Promise<CertificadoAdmin[]> {
  try {
    const q = query(
      collection(db, COLLECTION),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as CertificadoAdmin[];
  } catch {
    const q = query(collection(db, COLLECTION));
    const snapshot = await getDocs(q);
    const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as CertificadoAdmin[];
    return docs.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
  }
}

export async function aprovarCertificado(
  certificadoId: string,
  adminUid: string,
  adminNome: string,
  horasAprovadas: number,
  observacaoAdmin: string
): Promise<void> {
  const docRef = doc(db, COLLECTION, certificadoId);
  await updateDoc(docRef, {
    status: "aprovado",
    horasAprovadas,
    observacaoAdmin: observacaoAdmin || null,
    analisadoPor: adminUid,
    nomeAdmin: adminNome,
    dataAnalise: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function rejeitarCertificado(
  certificadoId: string,
  adminUid: string,
  adminNome: string,
  observacaoAdmin: string
): Promise<void> {
  const docRef = doc(db, COLLECTION, certificadoId);
  await updateDoc(docRef, {
    status: "rejeitado",
    observacaoAdmin,
    analisadoPor: adminUid,
    nomeAdmin: adminNome,
    dataAnalise: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function formatTimestamp(ts: { seconds: number; nanoseconds: number } | null): string {
  if (!ts) return "—";
  const date = new Date(ts.seconds * 1000);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
