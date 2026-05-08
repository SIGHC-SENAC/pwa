import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { CertificadoMeta } from "./certificadoService";

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

    return docs.sort((a, b) => {
      const ta = a.createdAt?.seconds ?? 0;
      const tb = b.createdAt?.seconds ?? 0;
      return tb - ta;
    });
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
