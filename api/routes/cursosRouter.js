import express from "express";
import { requireAdmin } from "../middlewares/authMiddleware.js";
import { listarCursos, buscarCurso, criarCurso, atualizarCurso, deletarCurso } from "../controllers/cursosController.js";

const router = express.Router();

router.get("/",...requireAdmin, listarCursos);
router.get("/:id",...requireAdmin, buscarCurso);
router.post("/",...requireAdmin, criarCurso);
router.put("/:id",...requireAdmin, atualizarCurso);
router.delete("/:id", ...requireAdmin,deletarCurso);

export default router;
