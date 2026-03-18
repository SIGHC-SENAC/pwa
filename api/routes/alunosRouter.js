import express from "express";
import { criarAluno } from "../controllers/alunosController.js";
import { requireAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// somente admin pode criar aluno
router.post("/", ...requireAdmin, criarAluno);

export default router;