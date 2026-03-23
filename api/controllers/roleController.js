// roleController.js
import { auth_firebase, db } from "../config/firebase.js";

// Setar role no Auth e opcionalmente salvar no Firestore
export async function setUserRole(req, res) {
  try {
    const { uid, role } = req.body; // role: "admin" | "aluno" | "superAdmin"
    if (!uid || !["admin", "aluno", "superAdmin"].includes(role)) {
      return res.status(400).json({ error: "uid e role válidos são obrigatórios" });
    }

    await auth_firebase.setCustomUserClaims(uid, { role });
    await db.collection("users").doc(uid).set({ role }, { merge: true });

    return res.json({ ok: true, uid, role });
  } catch (e) {
    return res.status(500).json({ error: "Falha ao setar role", details: String(e) });
  }
}
