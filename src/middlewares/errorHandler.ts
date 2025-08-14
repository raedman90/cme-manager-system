import { Request, Response, NextFunction } from 'express'

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const preset = res.statusCode && res.statusCode !== 200 ? res.statusCode : undefined;
  const status = Number.isInteger(err?.status) ? err.status : (preset ?? 500);
  const message = err?.message || err?.error || "Erro interno";
  if (process.env.NODE_ENV !== "production") console.error("[error]", err);
  res.status(status).json({ error: message });
}
