import type { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import {
  attachWashMeta,
  attachDisinfectionMeta,
  attachSterilizationMeta,
  attachStorageMeta,
} from "../services/stageMetaService";

const prisma = new PrismaClient();

/** ---------- Helpers ---------- */
async function resolveLatestStageEvent(cycleId: string) {
  // último evento (mais recente) do ciclo
  return prisma.stageEvent.findFirst({
    where: { cycleId },
    orderBy: { occurredAt: "desc" },
    select: { id: true, stage: true },
  });
}

function assertStage(kind: "wash" | "disinfection" | "sterilization" | "storage", stage?: string) {
  if (!stage) return;
  const expected = {
    wash: "LAVAGEM",
    disinfection: "DESINFECCAO",
    sterilization: "ESTERILIZACAO",
    storage: "ARMAZENAMENTO",
  }[kind];
  if (expected && stage.toUpperCase() !== expected) {
    const err: any = new Error(`Último StageEvent do ciclo não é ${expected} (atual: ${stage}).`);
    err.status = 400;
    throw err;
  }
}

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

/** =========================================================
 * Aliases por CICLO (mantém o front que chama /cycles/:id/stage-meta/:kind)
 *   POST /cycles/:cycleId/stage-meta/wash
 *   POST /cycles/:cycleId/stage-meta/disinfection
 *   POST /cycles/:cycleId/stage-meta/sterilization
 *   POST /cycles/:cycleId/stage-meta/storage
 * ========================================================= */

export async function postWashMetaByCycle(req: Request, res: Response, next: NextFunction) {
  try {
    const { cycleId } = req.params;
    const body = req.body ?? {};

    const evt = await resolveLatestStageEvent(cycleId);
    if (!evt) return res.status(404).json({ error: "Nenhum StageEvent para este ciclo." });
    assertStage("wash", evt.stage);

    const saved = await attachWashMeta(evt.id, body);
    res.status(201).json({ ok: true, stageEventId: evt.id, data: saved });
  } catch (e) { next(e); }
}

export async function postDisinfectionMetaByCycle(req: Request, res: Response, next: NextFunction) {
  try {
    const { cycleId } = req.params;
    const body = req.body ?? {};

    const evt = await resolveLatestStageEvent(cycleId);
    if (!evt) return res.status(404).json({ error: "Nenhum StageEvent para este ciclo." });
    assertStage("disinfection", evt.stage);

    const saved = await attachDisinfectionMeta(evt.id, body);
    res.status(201).json({ ok: true, stageEventId: evt.id, data: saved });
  } catch (e) { next(e); }
}

export async function postSterilizationMetaByCycle(req: Request, res: Response, next: NextFunction) {
  try {
    const { cycleId } = req.params;
    const body = req.body ?? {};

    const evt = await resolveLatestStageEvent(cycleId);
    if (!evt) return res.status(404).json({ error: "Nenhum StageEvent para este ciclo." });
    assertStage("sterilization", evt.stage);

    const saved = await attachSterilizationMeta(evt.id, body);
    res.status(201).json({ ok: true, stageEventId: evt.id, data: saved });
  } catch (e) { next(e); }
}

export async function postStorageMetaByCycle(req: Request, res: Response, next: NextFunction) {
  try {
    const { cycleId } = req.params;
    const body = req.body ?? {};

    const evt = await resolveLatestStageEvent(cycleId);
    if (!evt) return res.status(404).json({ error: "Nenhum StageEvent para este ciclo." });
    assertStage("storage", evt.stage);

    const saved = await attachStorageMeta(evt.id, body);
    res.status(201).json({ ok: true, stageEventId: evt.id, data: saved });
  } catch (e) { next(e); }
}
