import { db, auth_firebase } from "../config/firebase.js";
import { transporter } from "../config/nodemailer.js";

// GET /alunos
export async function listarAlunos(req, res) {
  try {
    const { cursoId } = req.query;
    let query = db.collection("users").where("role", "==", "aluno");
    if (cursoId) {
      query = query.where("cursoId", "==", cursoId);
    }
    const snapshot = await query.get();
    const alunos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return res.json(alunos);
  } catch (error) {
    console.error("Erro ao listar alunos:", error);
    return res.status(500).json({ message: "Erro ao listar alunos." });
  }
}

// POST /alunos
export async function criarAluno(req, res) {
  try {
    const { nome, email, cursoId, turmaId } = req.body;
    if (!nome || !email || !cursoId) {
      return res.status(400).json({ message: "Campos nome, email e cursoId são obrigatórios." });
    }

    // Verifica se o curso existe
    const cursoDoc = await db.collection("cursos").doc(cursoId).get();
    if (!cursoDoc.exists) {
      return res.status(404).json({ message: "Curso não encontrado." });
    }

    // Verifica turma se informada
    let turmaNome = null;
    if (turmaId) {
      const turmaDoc = await db.collection("turmas").doc(turmaId).get();
      if (!turmaDoc.exists) {
        return res.status(404).json({ message: "Turma não encontrada." });
      }
      turmaNome = turmaDoc.data().nome;
    }

    // Cria usuário no Firebase Auth
    const userRecord = await auth_firebase.createUser({
      email,
      displayName: nome,
      password: email.split("@")[0] + "2025!", // senha temporária
    });

    // Define custom claim de role
    await auth_firebase.setCustomUserClaims(userRecord.uid, { role: "aluno" });

    // Cria documento no Firestore
    const userData = {
      nome,
      email,
      role: "aluno",
      cursoId,
      cursoCodigo: cursoDoc.data().codigo,
      cursoNome: cursoDoc.data().nome,
      createdAt: Date.now(),
      createdBy: "admin",
    };
    if (turmaId) {
      userData.turmaId = turmaId;
      userData.turmaNome = turmaNome;
    }

    await db.collection("users").doc(userRecord.uid).set(userData);

    const senhaTemporaria = email.split("@")[0] + "2025!";

await transporter.sendMail({
  from: `"Horas Complementares - Senac" <${process.env.USER_GMAIL}>`,
  to: email,
  subject: "Bem-vindo ao Sistema de Horas Complementares - Senac",
  html: `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%); padding: 32px 24px; text-align: center;">
        <img src="https://pi-3p-tads049.web.app/logo.png" alt="Senac Pernambuco" style="height: 56px; margin-bottom: 12px;" />
        <p style="color: rgba(255,255,255,0.85); font-size: 13px; margin: 0;">Sistema Acadêmico de Horas Complementares</p>
      </div>

      <!-- Body -->
      <div style="padding: 32px 28px;">
        <h2 style="color: #1e3a5f; font-size: 22px; margin: 0 0 8px;">Olá, ${nome}! 👋</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
          Sua conta foi criada com sucesso. Use as credenciais abaixo para acessar o sistema pela primeira vez.
        </p>

        <!-- Credentials Card -->
        <div style="background: #f1f5f9; border-left: 4px solid #1e3a5f; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
          <p style="margin: 0 0 8px; color: #334155; font-size: 14px;">
            <strong>E-mail:</strong> ${email}
          </p>
          <p style="margin: 0; color: #334155; font-size: 14px;">
            <strong>Senha temporária:</strong> 
            <code style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px; font-size: 14px;">${senhaTemporaria}</code>
          </p>
        </div>

        <!-- Warning -->
        <div style="background: #fef3c7; border-radius: 8px; padding: 14px 16px; margin: 0 0 24px; display: flex; align-items: flex-start;">
          <span style="font-size: 18px; margin-right: 10px;">⚠️</span>
          <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
            <strong>Importante:</strong> Redefina sua senha no primeiro acesso para garantir a segurança da sua conta.
          </p>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 0 0 8px;">
          <a href="https://pi-3p-tads049.web.app/first-access" 
             style="display: inline-block; background: linear-gradient(135deg, #1e3a5f, #2d5a8e); color: #ffffff; padding: 14px 36px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px;">
            Acessar o Sistema
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="background: #f8fafc; padding: 20px 28px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="margin: 0 0 4px; font-size: 12px; color: #94a3b8;">Faculdade Senac Pernambuco</p>
        <p style="margin: 0; font-size: 11px; color: #cbd5e1;">Projeto Integrador 3º Período</p>
      </div>
    </div>
  `,
});


    return res.status(201).json({
      uid: userRecord.uid,
      nome,
      email,
      cursoId,
      message: "Aluno cadastrado com sucesso.",
    });
  } catch (error) {
    if (error.code === "auth/email-already-exists") {
      return res.status(409).json({ message: "Este e-mail já está cadastrado." });
    }
    console.error("Erro ao criar aluno:", error);
    return res.status(500).json({ message: "Erro ao cadastrar aluno." });
  }
}
