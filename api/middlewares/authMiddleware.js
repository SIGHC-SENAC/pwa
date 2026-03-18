import { auth_firebase } from "../config/firebase.js";

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) return res.status(401).json({ error: "Token ausente" });

    // Verifica ID token do Firebase
    const decoded = await auth_firebase.verifyIdToken(token);

    req.user = {
      uid: decoded.uid,
      role: decoded.role || "aluno",
      email: decoded.email,
    };

    return next();
  } catch (e) {
    return res.status(401).json({ error: "Token inválido", details: String(e) });
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Não autenticado" });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Sem permissão" });
    }
    return next();
  };
}

export const requireAdmin = [requireAuth, requireRole("admin")];
export const requireAluno = [requireAuth, requireRole("aluno")];