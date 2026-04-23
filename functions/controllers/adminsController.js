import { db, auth_firebase } from "../config/firebase.js";
import { transporter } from "../config/nodemailer.js";

const USERS_COLLECTION = "users";
const CURSOS_COLLECTION = "cursos";

async function validarCursoParaCoordenador(cursoId, adminIdIgnorado = null) {
  const cursoDoc = await db.collection(CURSOS_COLLECTION).doc(cursoId).get();
  if (!cursoDoc.exists) {
    const error = new Error("Curso não encontrado.");
    error.status = 404;
    throw error;
  }

  const adminNoCursoSnapshot = await db
    .collection(USERS_COLLECTION)
    .where("role", "==", "admin")
    .where("cursoId", "==", cursoId)
    .get();

  const adminNoCurso = adminNoCursoSnapshot.docs.find((doc) => doc.id !== adminIdIgnorado);
  if (adminNoCurso) {
    const error = new Error("Este curso já possui um coordenador vinculado.");
    error.status = 409;
    throw error;
  }

  return { id: cursoDoc.id, ...cursoDoc.data() };
}

async function atualizarCursoComCoordenador(cursoId, coordenadorData) {
  await db.collection(CURSOS_COLLECTION).doc(cursoId).set(
    {
      ...coordenadorData,
      atualizadoEm: new Date().toISOString(),
    },
    { merge: true }
  );
}

// GET /admins - listar admins
export async function listarAdmins(req, res) {
  try {
    const snapshot = await db.collection(USERS_COLLECTION).where("role", "==", "admin").get();
    const admins = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return res.json(admins);
  } catch (error) {
    console.error("Erro ao listar admins:", error);
    return res.status(500).json({ message: "Erro ao listar admins." });
  }
}

// POST /admins - criar admin
export async function criarAdmin(req, res) {
  let userRecord = null;
  try {
    const { nome, email, cursoId } = req.body;
    if (!nome || !email || !cursoId) {
      return res.status(400).json({ message: "Campos nome, email e cursoId são obrigatórios." });
    }

    const curso = await validarCursoParaCoordenador(cursoId);

    const senhaTemporaria = email.split("@")[0] + "2025!";

    userRecord = await auth_firebase.createUser({
      email,
      displayName: nome,
      password: senhaTemporaria,
    });

    await auth_firebase.setCustomUserClaims(userRecord.uid, { role: "admin" });

    await db.collection(USERS_COLLECTION).doc(userRecord.uid).set({
      nome,
      email,
      role: "admin",
      cursoId: curso.id,
      cursoNome: curso.nome,
      cursoCodigo: curso.codigo,
      createdAt: Date.now(),
      createdBy: req.user.uid,
    });

    await atualizarCursoComCoordenador(curso.id, {
      coordenadorId: userRecord.uid,
      coordenadorNome: nome,
      coordenadorEmail: email,
    });

    // Enviar e-mail com credenciais temporárias
    try {
      await transporter.sendMail({
        from: `"SIGHC - Senac" <${process.env.USER_GMAIL}>`,
        to: email,
        subject: "Suas credenciais de acesso ao SIGHC",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
            <h2 style="color: #003366;">Bem-vindo ao SIGHC</h2>
            <p>Olá <strong>${nome}</strong>,</p>
            <p>Sua conta de administrador foi criada com sucesso. Use as credenciais abaixo para acessar o sistema:</p>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 4px 0;"><strong>E-mail:</strong> ${email}</p>
              <p style="margin: 4px 0;"><strong>Senha temporária:</strong> ${senhaTemporaria}</p>
            </div>
            <p style="color: #ef4444; font-size: 14px;">⚠️ Recomendamos que altere sua senha no primeiro acesso.</p>
            <p style="font-size: 12px; color: #9ca3af; margin-top: 24px;">Faculdade Senac Pernambuco</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Erro ao enviar e-mail:", emailError);
    }

    return res.status(201).json({
      uid: userRecord.uid,
      nome,
      email,
      cursoId: curso.id,
      message: "Admin cadastrado com sucesso.",
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    if (error.code === "auth/email-already-exists") {
      return res.status(409).json({ message: "Este e-mail já está cadastrado." });
    }

    if (userRecord?.uid) {
      try {
        await auth_firebase.deleteUser(userRecord.uid);
      } catch (rollbackError) {
        console.error("Erro ao fazer rollback de usuário criado:", rollbackError);
      }
    }

    console.error("Erro ao criar admin:", error);
    return res.status(500).json({ message: "Erro ao cadastrar admin." });
  }
}

// PUT /admins/:id - atualizar admin
export async function atualizarAdmin(req, res) {
  try {
    const { id } = req.params;
    const { nome, email, cursoId } = req.body;

    const docRef = db.collection(USERS_COLLECTION).doc(id);
    const doc = await docRef.get();
    if (!doc.exists || doc.data().role !== "admin") {
      return res.status(404).json({ message: "Admin não encontrado." });
    }

    const adminAtual = doc.data();
    const cursoFinalId = cursoId || adminAtual.cursoId;
    if (!cursoFinalId) {
      return res.status(400).json({ message: "O coordenador deve estar vinculado a um curso." });
    }

    const cursoFinal = await validarCursoParaCoordenador(cursoFinalId, id);

    const updateData = {};
    if (nome) {
      updateData.nome = nome;
      await auth_firebase.updateUser(id, { displayName: nome });
    }
    if (email) {
      updateData.email = email;
      await auth_firebase.updateUser(id, { email });
    }

    if (cursoId) {
      updateData.cursoId = cursoFinal.id;
    }

    updateData.cursoNome = cursoFinal.nome;
    updateData.cursoCodigo = cursoFinal.codigo;
    updateData.atualizadoEm = new Date().toISOString();

    await docRef.update(updateData);

    const nomeFinal = updateData.nome || adminAtual.nome;
    const emailFinal = updateData.email || adminAtual.email;

    if (adminAtual.cursoId && adminAtual.cursoId !== cursoFinal.id) {
      await atualizarCursoComCoordenador(adminAtual.cursoId, {
        coordenadorId: null,
        coordenadorNome: null,
        coordenadorEmail: null,
      });
    }

    await atualizarCursoComCoordenador(cursoFinal.id, {
      coordenadorId: id,
      coordenadorNome: nomeFinal,
      coordenadorEmail: emailFinal,
    });

    return res.json({ id, ...doc.data(), ...updateData });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error("Erro ao atualizar admin:", error);
    return res.status(500).json({ message: "Erro ao atualizar admin." });
  }
}

// DELETE /admins/:id - deletar admin
export async function deletarAdmin(req, res) {
  try {
    const { id } = req.params;

    const docRef = db.collection(USERS_COLLECTION).doc(id);
    const doc = await docRef.get();
    if (!doc.exists || doc.data().role !== "admin") {
      return res.status(404).json({ message: "Admin não encontrado." });
    }

    const adminData = doc.data();

    await auth_firebase.deleteUser(id);
    await docRef.delete();

    if (adminData.cursoId) {
      await atualizarCursoComCoordenador(adminData.cursoId, {
        coordenadorId: null,
        coordenadorNome: null,
        coordenadorEmail: null,
      });
    }

    return res.json({ message: "Admin excluído com sucesso." });
  } catch (error) {
    console.error("Erro ao deletar admin:", error);
    return res.status(500).json({ message: "Erro ao deletar admin." });
  }
}
