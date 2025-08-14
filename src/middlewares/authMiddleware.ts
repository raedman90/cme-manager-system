import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET as string;

export function autenticarJWT(req: Request, res: Response, next: NextFunction) {
  // Preflight não manda Authorization — deve passar
  if (req.method === "OPTIONS") return res.sendStatus(204);

  const header = (req.headers["authorization"] as string | undefined)?.trim();
  if (!header?.toLowerCase().startsWith("bearer ")) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  const token = header.slice(7).trim();
  try {
    const payload = jwt.verify(token, secret);
    (req as any).user = payload; // req.user para roleMiddleware
    return next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}
