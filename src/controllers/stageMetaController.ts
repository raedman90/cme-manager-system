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
async function resolveLatestStageEventOf(cycleId: string, stage: string) {
  return prisma.stageEvent.findFirst({
    where: { cycleId, stage },
    orderBy: { occurredAt: "desc" },
    select: { id: true, stage: true },
  });
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

    const evt = await resolveLatestStageEventOf(cycleId, "LAVAGEM");
    if (!evt) return res.status(404).json({ error: "Nenhum StageEvent de LAVAGEM para este ciclo." });

    const saved = await attachWashMeta(evt.id, body);
    res.status(201).json({ ok: true, stageEventId: evt.id, data: saved });
  } catch (e) { next(e); }
}

export async function postDisinfectionMetaByCycle(req: Request, res: Response, next: NextFunction) {
  try {
    const { cycleId } = req.params;
    const body = req.body ?? {};
    const force = req.query.force === "1";

    const evt = await resolveLatestStageEventOf(cycleId, "DESINFECCAO");
    if (!evt) return res.status(404).json({ error: "Nenhum StageEvent de DESINFECCAO para este ciclo." });

    // Bloqueio de reenvio: se já existir registro e não forçar, 409
    const existing = await prisma.disinfectionEvent.findUnique({ where: { stageEventId: evt.id } });
    if (existing && !force) {
      return res.status(409).json({
        error: "Metadados de DESINFECCAO já existem para este StageEvent.",
        stageEventId: evt.id,
      });
    }

    const saved = await attachDisinfectionMeta(evt.id, body);
    res.status(201).json({ ok: true, stageEventId: evt.id, data: saved });
  } catch (e) { next(e); }
}

export async function postSterilizationMetaByCycle(req: Request, res: Response, next: NextFunction) {
  try {
    const { cycleId } = req.params;
    const body = req.body ?? {};

    const evt = await resolveLatestStageEventOf(cycleId, "ESTERILIZACAO");
    if (!evt) return res.status(404).json({ error: "Nenhum StageEvent de ESTERILIZACAO para este ciclo." });

    const saved = await attachSterilizationMeta(evt.id, body);
    res.status(201).json({ ok: true, stageEventId: evt.id, data: saved });
  } catch (e) { next(e); }
}

export async function postStorageMetaByCycle(req: Request, res: Response, next: NextFunction) {
  try {
    const { cycleId } = req.params;
    const body = req.body ?? {};

    const evt = await resolveLatestStageEventOf(cycleId, "ARMAZENAMENTO");
    if (!evt) return res.status(404).json({ error: "Nenhum StageEvent de ARMAZENAMENTO para este ciclo." });

    const saved = await attachStorageMeta(evt.id, body);
    res.status(201).json({ ok: true, stageEventId: evt.id, data: saved });
  } catch (e) { next(e); }
}
/** -------- GET para prefill: /cycles/:cycleId/stage-meta/:kind -------- */
export async function getStageMetaByCycle(req: Request, res: Response, next: NextFunction) {
  try {
    const { cycleId, kind } = req.params;
    const map: Record<string, string> = {
      wash: "LAVAGEM",
      disinfection: "DESINFECCAO",
      sterilization: "ESTERILIZACAO",
      storage: "ARMAZENAMENTO",
    };
    const stage = map[(kind || "").toLowerCase()];
    if (!stage) return res.status(400).json({ error: "Kind inválido." });

    const evt = await resolveLatestStageEventOf(cycleId, stage);
    if (!evt) return res.status(404).json({ error: `Sem StageEvent de ${stage} para este ciclo.` });

    let detail: any = null;
    if (stage === "DESINFECCAO") {
      detail = await prisma.disinfectionEvent.findUnique({ where: { stageEventId: evt.id } });
    } else if (stage === "LAVAGEM") {
      detail = await prisma.washEvent.findUnique({ where: { stageEventId: evt.id } });
    } else if (stage === "ESTERILIZACAO") {
      detail = await prisma.sterilizationEvent.findUnique({ where: { stageEventId: evt.id } });
    } else if (stage === "ARMAZENAMENTO") {
      detail = await prisma.storageEvent.findUnique({ where: { stageEventId: evt.id } });
    }

    return res.json({ ok: true, cycleId, stageEventId: evt.id, stage, detail });
  } catch (e) { next(e); }
}