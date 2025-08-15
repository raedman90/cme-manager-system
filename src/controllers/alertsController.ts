import type { Request, Response, NextFunction } from "express";
import { ackAlert, resolveAlert, listAlerts, getAlertCounts } from "../services/alertsService";
import { sweepStorageValidity } from "../services/alertsSweepService";
import { alertsBus, type AlertsStreamEvent } from "../events/alertsBus";

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

// ---------- SSE ----------
export async function getAlertsStream(req: Request, res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  // CORS opcional, se necessário:
  // res.setHeader("Access-Control-Allow-Origin", "*");

  const send = (ev: AlertsStreamEvent) => {
    res.write(`event: alert\n`);
    res.write(`data: ${JSON.stringify(ev)}\n\n`);
  };

  // ping inicial + contadores
  send({ type: "counts", counts: await getAlertCounts() });
  const onEvent = (ev: AlertsStreamEvent) => send(ev);
  alertsBus.on("alert", onEvent);

  const heartbeat = setInterval(() => res.write(": keep-alive\n\n"), 25000);
  req.on("close", () => {
    clearInterval(heartbeat);
    alertsBus.off("alert", onEvent);
    res.end();
  });
}