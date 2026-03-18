import { db, auth_firebase } from "../config/firebase.js";

// GET /admins - listar admins
export async function listarAdmins(req, res) {
  try {
    const snapshot = await db.collection("users").where("role", "==", "admin").get();
    const admins = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return res.json(admins);
  } catch (error) {
    console.error("Erro ao listar admins:", error);
    return res.status(500).json({ message: "Erro ao listar admins." });
  }
}

// POST /admins - criar admin
export async function criarAdmin(req, res) {
  try {
    const { nome, email } = req.body;
    if (!nome || !email) {
      return res.status(400).json({ message: "Campos nome e email são obrigatórios." });
    }

    const senhaTemporaria = email.split("@")[0] + "2025!";

    const userRecord = await auth_firebase.createUser({
      email,
      displayName: nome,
      password: senhaTemporaria,
    });

    await auth_firebase.setCustomUserClaims(userRecord.uid, { role: "admin" });

    await db.collection("users").doc(userRecord.uid).set({
      nome,
      email,
      role: "admin",
      createdAt: Date.now(),
      createdBy: req.user.uid,
    });

    return res.status(201).json({
      uid: userRecord.uid,
      nome,
      email,
      message: "Admin cadastrado com sucesso.",
    });
  } catch (error) {
    if (error.code === "auth/email-already-exists") {
      return res.status(409).json({ message: "Este e-mail já está cadastrado." });
    }
    console.error("Erro ao criar admin:", error);
    return res.status(500).json({ message: "Erro ao cadastrar admin." });
  }
}

// PUT /admins/:id - atualizar admin
export async function atualizarAdmin(req, res) {
  try {
    const { id } = req.params;
    const { nome, email } = req.body;

    const docRef = db.collection("users").doc(id);
    const doc = await docRef.get();
    if (!doc.exists || doc.data().role !== "admin") {
      return res.status(404).json({ message: "Admin não encontrado." });
    }

    const updateData = {};
    if (nome) {
      updateData.nome = nome;
      await auth_firebase.updateUser(id, { displayName: nome });
    }
    if (email) {
      updateData.email = email;
      await auth_firebase.updateUser(id, { email });
    }
    updateData.atualizadoEm = new Date().toISOString();

    await docRef.update(updateData);
    return res.json({ id, ...doc.data(), ...updateData });
  } catch (error) {
    console.error("Erro ao atualizar admin:", error);
    return res.status(500).json({ message: "Erro ao atualizar admin." });
  }
}

// DELETE /admins/:id - deletar admin
export async function deletarAdmin(req, res) {
  try {
    const { id } = req.params;

    const docRef = db.collection("users").doc(id);
    const doc = await docRef.get();
    if (!doc.exists || doc.data().role !== "admin") {
      return res.status(404).json({ message: "Admin não encontrado." });
    }

    await auth_firebase.deleteUser(id);
    await docRef.delete();

    return res.json({ message: "Admin excluído com sucesso." });
  } catch (error) {
    console.error("Erro ao deletar admin:", error);
    return res.status(500).json({ message: "Erro ao deletar admin." });
  }
}
