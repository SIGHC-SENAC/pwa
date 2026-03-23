import { db } from "../config/firebase.js";

const COLLECTION = "cursos";

async function gerarCodigoCursoUnico() {
  const tentativasMaximas = 30;

  for (let tentativa = 0; tentativa < tentativasMaximas; tentativa++) {
    const codigoGerado = String(Math.floor(10000 + Math.random() * 90000));
    const existing = await db.collection(COLLECTION).where("codigo", "==", codigoGerado).limit(1).get();

    if (existing.empty) {
      return codigoGerado;
    }
  }

  throw new Error("Não foi possível gerar um código de curso único.");
}

// GET /cursos
export async function listarCursos(req, res) {
  try {
    const snapshot = await db.collection(COLLECTION).orderBy("criadoEm", "desc").get();
    const cursos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return res.json(cursos);
  } catch (error) {
    console.error("Erro ao listar cursos:", error);
    return res.status(500).json({ message: "Erro ao listar cursos." });
  }
}

// GET /cursos/:id
export async function buscarCurso(req, res) {
  try {
    const { id } = req.params;
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ message: "Curso não encontrado." });
    }
    return res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error("Erro ao buscar curso:", error);
    return res.status(500).json({ message: "Erro ao buscar curso." });
  }
}

// POST /cursos
export async function criarCurso(req, res) {
  try {
    const { nome, turno, cargaHorariaComplementar } = req.body;
    if (!nome || !turno || !cargaHorariaComplementar) {
      return res.status(400).json({ message: "Campos nome, turno e cargaHorariaComplementar são obrigatórios." });
    }

    const codigo = await gerarCodigoCursoUnico();

    const docRef = await db.collection(COLLECTION).add({
      nome,
      codigo,
      turno,
      cargaHorariaComplementar: Number(cargaHorariaComplementar),
      coordenadorId: null,
      coordenadorNome: null,
      coordenadorEmail: null,
      criadoEm: new Date().toISOString(),
    });

    return res.status(201).json({ id: docRef.id, nome, codigo, turno, cargaHorariaComplementar: Number(cargaHorariaComplementar) });
  } catch (error) {
    console.error("Erro ao criar curso:", error);
    return res.status(500).json({ message: "Erro ao criar curso." });
  }
}

// PUT /cursos/:id
export async function atualizarCurso(req, res) {
  try {
    const { id } = req.params;
    const { nome, codigo, turno, cargaHorariaComplementar } = req.body;

    const docRef = db.collection(COLLECTION).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ message: "Curso não encontrado." });
    }

    const updateData = {};
    if (nome) updateData.nome = nome;
    if (codigo) updateData.codigo = codigo;
    if (turno) updateData.turno = turno;
    if (cargaHorariaComplementar) updateData.cargaHorariaComplementar = Number(cargaHorariaComplementar);
    updateData.atualizadoEm = new Date().toISOString();

    await docRef.update(updateData);
    return res.json({ id, ...doc.data(), ...updateData });
  } catch (error) {
    console.error("Erro ao atualizar curso:", error);
    return res.status(500).json({ message: "Erro ao atualizar curso." });
  }
}

// DELETE /cursos/:id
export async function deletarCurso(req, res) {
  try {
    const { id } = req.params;
    const docRef = db.collection(COLLECTION).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ message: "Curso não encontrado." });
    }

    await docRef.delete();
    return res.json({ message: "Curso excluído com sucesso." });
  } catch (error) {
    console.error("Erro ao deletar curso:", error);
    return res.status(500).json({ message: "Erro ao deletar curso." });
  }
}
