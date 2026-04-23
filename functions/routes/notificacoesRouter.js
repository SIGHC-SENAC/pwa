import express from "express";
import { notificarAdminsUpload } from "../controllers/notificacoesController.js";

const router = express.Router();

router.post("/upload-certificado", notificarAdminsUpload);

export default router;
