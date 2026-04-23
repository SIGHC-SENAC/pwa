import express from "express";
import { requireAdmin, requireSuperAdmin } from "../middlewares/authMiddleware.js";
import { listarTurmas, buscarTurma, criarTurma, atualizarTurma, deletarTurma } from "../controllers/turmasController.js";

const router = express.Router();

router.get("/", ...requireAdmin, listarTurmas);
router.get("/:id", ...requireAdmin, buscarTurma);
router.post("/", ...requireSuperAdmin, criarTurma);
router.put("/:id", ...requireSuperAdmin, atualizarTurma);
router.delete("/:id", ...requireSuperAdmin, deletarTurma);

export default router;
