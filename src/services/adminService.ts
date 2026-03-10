import {
  collection,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CertificadoMeta } from "./certificadoService";

const COLLECTION = "certificados_horas_complementares";

export async function fetchAllCertificados(): Promise<CertificadoMeta[]> {
  try {
    const q = query(
      collection(db, COLLECTION),
      orderBy("createdAt", "desc")
    );
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
}

export async function rejeitarCertificado(
  certId: string,
  adminUid: string,
  adminNome: string,
  motivoRejeicao: string,
  observacaoAdmin: string
): Promise<void> {
  const docRef = doc(db, COLLECTION, certId);
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
}
