import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

function pickToken(req: Request): string {
  // 1) Authorization: Bearer xxx
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7).trim();

  // 2) Query: ?token=xxx ou ?access_token=xxx
  const qToken =
    (typeof req.query.token === "string" && req.query.token) ||
    (typeof req.query.access_token === "string" && req.query.access_token) ||
    "";
  if (qToken) return qToken.trim();

  // 3) Header alternativo
  const xhdr = (req.headers["x-access-token"] as string | undefined) || "";
  if (xhdr) return xhdr.trim();

  // 4) Cookie
  const ck = (req as any).cookies?.token || (req as any).cookies?.access_token || "";
  if (ck) return String(ck).trim();

  return "";
}

export function authFromHeaderOrQuery(req: Request, res: Response, next: NextFunction) {
  // Bypass opcional em dev (útil para SSE em ambiente local)
  if (process.env.DEV_SSE_NOAUTH === "1") {
    (req as any).user = { sub: "dev", role: "admin" };
    return next();
  }

  const token = pickToken(req);
  if (!token) {
    return res.status(401).json({ error: "Unauthorized (no token in header/query/cookie)" });
  }

  try {
    const secret = process.env.JWT_SECRET || process.env.AUTH_SECRET || "dev-secret";
    const payload = jwt.verify(token, secret) as any;
    (req as any).user = payload;
    return next();
  } catch (e: any) {
    return res.status(401).json({ error: "Invalid token", detail: e?.message || "verify failed" });
  }
}

// Se vier ?token= ou ?access_token=, copia para Authorization: Bearer ...
export function authNormalizeQueryToHeader(req: Request, _res: Response, next: NextFunction) {
  const q =
    (typeof req.query.token === "string" && req.query.token) ||
    (typeof req.query.access_token === "string" && req.query.access_token) ||
    "";
  if (q && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${q}`;
  }
  next();
}