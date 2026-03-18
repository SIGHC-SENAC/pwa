import express from "express";
import { criarAluno } from "../controllers/alunosController.js";
import { requireSuperAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// somente superAdmin pode criar aluno
router.post("/", ...requireSuperAdmin, criarAluno);

export default router;
