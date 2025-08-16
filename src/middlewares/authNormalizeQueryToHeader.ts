import type { Request, Response, NextFunction } from "express";

// Se vier ?token= ou ?access_token=, copia para Authorization: Bearer ...
export function authNormalizeQueryToHeader(req: Request, _res: Response, next: NextFunction) {
  const q =
    (typeof req.query.token === "string" && req.query.token) ||
    (typeof req.query.access_token === "string" && req.query.access_token) ||
    "";
  if (q && !req.headers.authorization) {
    // reescreve o objeto de headers (evita readonly do tipo TS)
    (req as any).headers = { ...req.headers, authorization: `Bearer ${q}` };
  }
  next();
}
