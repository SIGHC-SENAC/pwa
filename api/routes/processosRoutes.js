import express from "express";
import {
  uploadToDrive,
  downloadFromDrive,
  deleteFromDrive,
  shareWithAllUsers,
} from "../controllers/driveController.js";
import { getProcessosPorCpf } from "../controllers/processosController.js";
import { requireAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Portal público
router.post("/por-cpf", getProcessosPorCpf);

// Google Drive — documentos dos processos
router.post("/drive/upload", uploadToDrive);
router.get("/drive/download/:fileId", downloadFromDrive);
router.delete("/drive/:fileId", deleteFromDrive);

// Compartilhamento — apenas admin
router.post("/drive/share-users", requireAdmin, shareWithAllUsers);

export default router;

