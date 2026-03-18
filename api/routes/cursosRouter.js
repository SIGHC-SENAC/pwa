import express from "express";
import { requireSuperAdmin } from "../middlewares/authMiddleware.js";
import { listarCursos, buscarCurso, criarCurso, atualizarCurso, deletarCurso } from "../controllers/cursosController.js";

const router = express.Router();

router.get("/", ...requireSuperAdmin, listarCursos);
router.get("/:id", ...requireSuperAdmin, buscarCurso);
router.post("/", ...requireSuperAdmin, criarCurso);
router.put("/:id", ...requireSuperAdmin, atualizarCurso);
router.delete("/:id", ...requireSuperAdmin, deletarCurso);

export default router;
