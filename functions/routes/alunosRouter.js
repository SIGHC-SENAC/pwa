import express from "express";
import { listarAlunos, criarAluno } from "../controllers/alunosController.js";
import { requireSuperAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", ...requireSuperAdmin, listarAlunos);
router.post("/", ...requireSuperAdmin, criarAluno);

export default router;
