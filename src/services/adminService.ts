// Importações do Firestore para operações com banco de dados
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
// Importa instância do Firestore
import { db } from "@/lib/firebase";
// Importa tipo de certificado
import { CertificadoMeta } from "./certificadoService";

// Nome da coleção no Firestore onde certificados são armazenados
const COLLECTION = "certificados_horas_complementares";

/**
 * Busca todos os certificados de horas complementares
 * Ordenado do mais recente ao mais antigo
 * @returns Array de certificados ordenados por data de criação
 */
export async function fetchAllCertificados(): Promise<CertificadoMeta[]> {
  try {
    // Tenta fazer query com ordenação (requer índice composto no Firestore)
    const q = query(
      collection(db, COLLECTION),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    // Monta array de certificados com ID incluído
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as CertificadoMeta[];
  } catch (err) {
    // Fallback: busca sem ordenação e ordena no client-side
    console.warn("Query com orderBy falhou, tentando sem:", err);
    const snapshot = await getDocs(collection(db, COLLECTION));
    const docs = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as CertificadoMeta[];
    // Ordena por data no client-side (mais recente primeiro)
    return docs.sort((a, b) => {
      const ta = a.createdAt?.seconds ?? 0;
      const tb = b.createdAt?.seconds ?? 0;
      return tb - ta;
    });
  }
}

/**
 * Aprova um certificado de horas complementares
 * Atualiza o status para 'aprovado' e registra horas aprovadas
 * @param certId - ID do certificado a aprovar
 * @param adminUid - ID do administrador que aprova
 * @param adminNome - Nome do administrador
 * @param horasAprovadas - Número de horas aprovadas
 * @param observacaoAdmin - Observação opcional do admin
 */
export async function aprovarCertificado(
  certId: string,
  adminUid: string,
  adminNome: string,
  horasAprovadas: number,
  observacaoAdmin: string
): Promise<void> {
  // Referência ao documento do certificado
  const docRef = doc(db, COLLECTION, certId);
  // Atualiza documento com informações de aprovação
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

/**
 * Rejeita um certificado de horas complementares
 * Atualiza o status para 'rejeitado' e registra o motivo
 * @param certId - ID do certificado a rejeitar
 * @param adminUid - ID do administrador que rejeita
 * @param adminNome - Nome do administrador
 * @param motivoRejeicao - Motivo pela qual o certificado foi rejeitado
 * @param observacaoAdmin - Observação adicional do admin
 */
export async function rejeitarCertificado(
  certId: string,
  adminUid: string,
  adminNome: string,
  motivoRejeicao: string,
  observacaoAdmin: string
): Promise<void> {
  // Referência ao documento do certificado
  const docRef = doc(db, COLLECTION, certId);
  // Atualiza documento com informações de rejeição
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

/**
 * Atualiza a categoria de um certificado
 * Permite reclassificar um certificado em outra categoria de atividade
 * @param certId - ID do certificado a atualizar
 * @param categoriaId - Novo ID da categoria de atividade
 * @param categoriaNome - Novo nome da categoria de atividade
 */
export async function atualizarCategoriaCertificado(
  certId: string,
  categoriaId: string | null,
  categoriaNome: string | null
): Promise<void> {
  // Referência ao documento do certificado
  const docRef = doc(db, COLLECTION, certId);
  // Atualiza a categoria do certificado
  await updateDoc(docRef, {
    categoriaId,
    categoriaNome,
    updatedAt: serverTimestamp(),
  });
}
