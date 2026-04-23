import express from "express";
import alunosRoutes from "./routes/alunosRouter.js";
import * as functions from "firebase-functions";
import notificacoesRoutes from "./routes/notificacoesRouter.js";
import cursosRoutes from "./routes/cursosRouter.js";
import certificadosRoutes from "./routes/certificadosRouter.js";
import adminsRoutes from "./routes/adminsRouter.js";
import turmasRoutes from "./routes/turmasRouter.js";
import cors from "cors";

const router = express();
router.use(express.json());
router.use(cors());

// rotas
router.use("/alunos", alunosRoutes);
router.use("/notificacoes", notificacoesRoutes);
router.use("/cursos", cursosRoutes);
router.use("/certificados", certificadosRoutes);
router.use("/admins", adminsRoutes);
router.use("/turmas", turmasRoutes);

router.get("/", (req, res) => {
  res.json({ status: "API funcionando" });
});

export const app = functions.https.onRequest(router);
