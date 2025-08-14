import type { Request, Response, NextFunction } from "express";
import {
  attachWashMeta,
  attachDisinfectionMeta,
  attachSterilizationMeta,
  attachStorageMeta,
} from "../services/stageMetaService";

export async function postWashMeta(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params; // StageEvent ID
    const saved = await attachWashMeta(id, req.body);
    res.status(201).json({ ok: true, stageEventId: id, wash: saved });
  } catch (e) { next(e); }
}

export async function postDisinfectionMeta(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const saved = await attachDisinfectionMeta(id, req.body);
    res.status(201).json({ ok: true, stageEventId: id, disinfection: saved });
  } catch (e) { next(e); }
}

export async function postSterilizationMeta(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const saved = await attachSterilizationMeta(id, req.body);
    res.status(201).json({ ok: true, stageEventId: id, sterilization: saved });
  } catch (e) { next(e); }
}

export async function postStorageMeta(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const saved = await attachStorageMeta(id, req.body);
    res.status(201).json({ ok: true, stageEventId: id, storage: saved });
  } catch (e) { next(e); }
}
