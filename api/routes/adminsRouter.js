import express from "express";
import { requireSuperAdmin } from "../middlewares/authMiddleware.js";
import { listarAdmins, criarAdmin, atualizarAdmin, deletarAdmin } from "../controllers/adminsController.js";

const router = express.Router();

router.get("/", ...requireSuperAdmin, listarAdmins);
router.post("/", ...requireSuperAdmin, criarAdmin);
router.put("/:id", ...requireSuperAdmin, atualizarAdmin);
router.delete("/:id", ...requireSuperAdmin, deletarAdmin);

export default router;
