import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET as string;

export function autenticarJWT(req: Request, res: Response, next: NextFunction) {
  // Preflight não manda Authorization — deve passar
  if (req.method === "OPTIONS") return res.sendStatus(204);

  const header = (req.headers["authorization"] as string | undefined)?.trim();
  let token: string | null = null;
  // 1) Header padrão
  if (header?.toLowerCase().startsWith("bearer ")) {
    token = header.slice(7).trim();
  } else {
    // 2) Fallback para SSE: aceita ?token= ou ?access_token=
    const qToken =
      (typeof req.query.token === "string" && req.query.token) ||
      (typeof req.query.access_token === "string" && req.query.access_token) ||
      "";
    if (qToken) token = qToken.trim();
  }

  if (!token) return res.status(401).json({ error: "Token não fornecido" });

  try {
    const payload = jwt.verify(token, secret);
    (req as any).user = payload; // req.user para roleMiddleware
    return next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}
