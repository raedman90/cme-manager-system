import type { Request, Response, NextFunction } from "express";
import { ackAlert, resolveAlert, listAlerts, getAlertCounts } from "../services/alertsService";
import { sweepStorageValidity } from "../services/alertsSweepService";

export async function getAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await listAlerts({
      status: req.query.status as any,
      severity: req.query.severity as any,
      q: (req.query.q as string) || undefined,
      page: Number(req.query.page ?? 1),
      perPage: Number(req.query.perPage ?? 20),
    });
    res.json(result);
  } catch (e) { next(e); }
}

export async function getAlertsCounts(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getAlertCounts());
  } catch (e) { next(e); }
}

export async function patchAckAlert(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id || undefined; // se tiver auth
    res.json(await ackAlert(id, userId));
  } catch (e) { next(e); }
}

export async function patchResolveAlert(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    res.json(await resolveAlert(id));
  } catch (e) { next(e); }
}

export async function postSweepAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    const days = Number(req.body?.daysSoon ?? process.env.STORAGE_SOON_DAYS ?? 3);
    const out = await sweepStorageValidity(days);
    res.json(out);
  } catch (e) { next(e); }
}