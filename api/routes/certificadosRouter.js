import { Router } from "express";
import { processarCertificado } from "../controllers/certificadosController.js";

const router = Router();

router.post("/processar", processarCertificado);

export default router;