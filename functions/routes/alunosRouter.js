import express from "express";
import { listarAlunos, criarAluno } from "../controllers/alunosController.js";
import { requireAdmin, requireSuperAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", ...requireAdmin, listarAlunos);
router.post("/", ...requireSuperAdmin, criarAluno);

export default router;
