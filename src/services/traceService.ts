// src/services/traceService.ts
import { submitAndWait, evaluateTransaction } from "../blockchain/fabricService";
import { EventSource, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Etapas permitidas (sem acento) */
export type Stage =
  | "RECEBIMENTO"
  | "LAVAGEM"
  | "DESINFECCAO"
  | "ESTERILIZACAO"
  | "ARMAZENAMENTO";

export type StageParams = {
  wash?: {
    method?: "MANUAL" | "ULTRASSONICA" | "TERMO_DESINFECCAO";
    detergent?: string;
    timeMin?: number;
    tempC?: number;
  };
  disinfection?: {
    agent: "PERACETICO" | "HIPOCLORITO" | "OPA" | "QUATERNARIO" | "ALCOOL70" | "OUTRO";
    concentration?: string;
    contactMin: number;
    solutionLotId?: string;
    testStripLot?: string;
    testStripResult?: "PASS" | "FAIL";
    measuredTempC?: number;
    ph?: number;
  };
  sterilization?: {
    method: "STEAM_134" | "STEAM_121" | "H2O2" | "ETO" | "OUTRO";
    autoclaveId?: string;
    program?: string;
    exposureMin?: number;
    tempC?: number;
    ci?: "PASS" | "FAIL" | "NA";
    bi?: "PASS" | "FAIL" | "NA";
    loadId?: string;
  };
  storage?: {
    location?: string;
    shelfPolicy?: "TIME" | "EVENT";
    expiresAt?: string; // ISO
    integrityOk?: boolean;
  };
};

function badRequest(msg: string) {
  const e: any = new Error(msg);
  e.status = 400;
  return e;
}

function normStage(input: string): Stage {
  const up = input.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const allowed: Stage[] = [
    "RECEBIMENTO",
    "LAVAGEM",
    "DESINFECCAO",
    "ESTERILIZACAO",
    "ARMAZENAMENTO",
  ];
  if (!allowed.includes(up as Stage)) throw new Error(`Etapa inválida: ${input}`);
  return up as Stage;
}

/** Extrai CN de uma identidade x509::...; se não bater, retorna o id original */
function x509ToDisplay(id?: string | null): string | null {
  if (!id) return null;
  if (!id.startsWith("x509::")) return id;
  const parts = id.split("::");
  const subject = parts[1] ?? "";
  const m = subject.match(/CN=([^/]+)/);
  return m?.[1] ?? id;
}

type CreateArgs = {
  cycleId: string;
  materialId: string;
  batchId?: string | null;
  stage: string;
  /** crachá/nome do funcionário enviado pelo app */
  operatorId?: string | null;
  operatorMSP?: string | null;
  notes?: string | null;
  /** parâmetros técnicos por etapa (lavagem, desinfecção, etc.) */
  params?: StageParams;
  /** se false, não grava fallback DB quando o ledger falhar */
  allowDbFallback?: boolean;
};

type UpdateArgs = {
  cycleId: string;
  nextStage: string;
  operatorId?: string | null; // crachá/nome
  operatorMSP?: string | null;
  notes?: string | null;
  params?: StageParams;
  allowDbFallback?: boolean;
};

type RecordResult = {
  ok: boolean;
  source: "LEDGER" | "DB";
  txId: string | null;
};

function getLastHistoryEntry(doc: any) {
  const hist = Array.isArray(doc?.history) ? doc.history : [];
  return hist.length ? hist[hist.length - 1] : null;
}
function validateAndExtractMeta(_stage: string, _params?: StageParams) {
  return {}; // sempre retorna objeto vazio
}
/** helpers numéricos simples */
function toNum(v: any): number | undefined {
  if (v === "" || v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Aceita formatos "legados/achatados" vindos do front (wash_method, dis_*, st_*, storage_*)
 * e converte para o StageParams oficial ({ wash: {...}, disinfection: {...}, ... }).
 */
function coerceLegacyParams(stage: string, params?: any): StageParams {
  const p = { ...(params ?? {}) };

  // Se já vier no formato certo, mantém
  if (p.wash || p.disinfection || p.sterilization || p.storage) return p as StageParams;

  const out: StageParams = {};

  if (stage === "LAVAGEM") {
    const method =
      p.wash_method ?? p.method ?? p.washMethod ?? undefined;
    const detergent =
      p.wash_detergent ?? p.detergent ?? p.washDetergent ?? undefined;
    const timeMin =
      toNum(p.wash_timeMin ?? p.timeMin ?? p.washTimeMin);
    const tempC =
      toNum(p.wash_tempC ?? p.tempC ?? p.washTempC);

    const w: any = {};
    if (method) w.method = method;
    if (detergent) w.detergent = detergent;
    if (timeMin !== undefined) w.timeMin = timeMin;
    if (tempC !== undefined) w.tempC = tempC;
    if (Object.keys(w).length) out.wash = w;
  }

  if (stage === "DESINFECCAO") {
    const agent =
      p.dis_agent ?? p.agent ?? p.disAgent ?? undefined;
    const concentration =
      p.dis_concentration ?? p.concentration ?? p.disConcentration ?? undefined;
    const contactMin =
      toNum(p.dis_contactMin ?? p.contactMin ?? p.disContactMin);
    const solutionLotId =
      p.dis_solutionLotId ?? p.solutionLotId ?? undefined;
    const testStripLot =
      p.dis_testStripLot ?? p.testStripLot ?? undefined;
    const testStripResult =
      p.dis_testStripResult ?? p.testStripResult ?? undefined;
    const measuredTempC =
      toNum(p.dis_measuredTempC ?? p.measuredTempC);
    const ph = toNum(p.dis_ph ?? p.ph);

    const d: any = {};
    if (agent) d.agent = agent;
    if (concentration) d.concentration = concentration;
    if (contactMin !== undefined) d.contactMin = contactMin;
    if (solutionLotId) d.solutionLotId = solutionLotId;
    if (testStripLot) d.testStripLot = testStripLot;
    if (testStripResult) d.testStripResult = testStripResult;
    if (measuredTempC !== undefined) d.measuredTempC = measuredTempC;
    if (ph !== undefined) d.ph = ph;
    if (Object.keys(d).length) out.disinfection = d;
  }

  if (stage === "ESTERILIZACAO") {
    const method =
      p.st_method ?? p.ster_method ?? p.method ?? p.stMethod ?? undefined;
    const autoclaveId =
      p.st_autoclaveId ?? p.autoclaveId ?? undefined;
    const program =
      p.st_program ?? p.program ?? undefined;
    const exposureMin =
      toNum(p.st_exposureMin ?? p.exposureMin);
    const tempC =
      toNum(p.st_tempC ?? p.tempC);
    const ci = p.st_ci ?? p.ci ?? undefined;
    const bi = p.st_bi ?? p.bi ?? undefined;
    const loadId =
      p.st_loadId ?? p.loadId ?? undefined;

    const z: any = {};
    if (method) z.method = method;
    if (autoclaveId) z.autoclaveId = autoclaveId;
    if (program) z.program = program;
    if (exposureMin !== undefined) z.exposureMin = exposureMin;
    if (tempC !== undefined) z.tempC = tempC;
    if (ci) z.ci = ci;
    if (bi) z.bi = bi;
    if (loadId) z.loadId = loadId;
    if (Object.keys(z).length) out.sterilization = z;
  }

  if (stage === "ARMAZENAMENTO") {
    const location =
      p.storage_location ?? p.location ?? undefined;
    const shelfPolicy =
      p.storage_shelfPolicy ?? p.shelfPolicy ?? undefined;
    const expiresAt =
      p.storage_expiresAt ?? p.expiresAt ?? undefined;
    const integrityOk =
      typeof p.storage_integrityOk === "boolean"
        ? p.storage_integrityOk
        : (typeof p.integrityOk === "boolean" ? p.integrityOk : undefined);

    const g: any = {};
    if (location) g.location = location;
    if (shelfPolicy) g.shelfPolicy = shelfPolicy;
    if (expiresAt) g.expiresAt = expiresAt;
    if (integrityOk !== undefined) g.integrityOk = integrityOk;
    if (Object.keys(g).length) out.storage = g;
  }

  return out;
}
/**
 * Cria um ciclo no Ledger e registra StageEvent no DB.
 * Em caso de erro no ledger, grava fallback DB (se allowDbFallback !== false).
 */
export async function recordCreateCycle(args: CreateArgs): Promise<RecordResult> {
  const stage = normStage(args.stage);
  const meta = validateAndExtractMeta(stage, args.params);

  try {
    // 1) Ledger (submit aguarda commit via eventHandlerOptions no Gateway)
    const { txId } = await submitAndWait(
      "createCycle",
      args.cycleId,
      args.batchId ?? "",
      args.materialId,
      stage
    );

    // 2) Readback: pega timestamp/operator do ledger
    const got = await evaluateTransaction("getCycle", args.cycleId);
    const doc = got ? JSON.parse(got) : null;
    const last = getLastHistoryEntry(doc);

    const occurredAt = last?.timestamp ? new Date(last.timestamp) : new Date();
    const mspId = last?.mspId ?? null;
    // Operador “humano”: prioriza o crachá/nome vindo do app; senão CN do x509
    const human = args.operatorId ?? x509ToDisplay(last?.operatorId) ?? "ledger";

    // 3) DB (idempotente por ledgerTxId)
    await prisma.$transaction(async (tx) => {
      await tx.cycle.upsert({
        where: { id: args.cycleId },
        create: {
          id: args.cycleId,
          materialId: args.materialId,
          etapa: stage,
          loteId: args.batchId ?? null,
          responsavel: human,
        } as any,
        update: {
          etapa: stage,
          responsavel: human,
        },
      });

      await tx.stageEvent.upsert({
        where: { ledgerTxId: txId },
        update: {}, // já registrado
        create: {
          materialId: args.materialId,
          cycleId: args.cycleId,
          stage,
          occurredAt,
          operatorId: human, // crachá/nome
          operatorMSP: mspId,
          source: EventSource.LEDGER,
          ledgerTxId: txId,
          batchId: args.batchId ?? null,
          notes: args.notes ?? null,
        },
      });

      if (stage === "ESTERILIZACAO") {
        await tx.material.update({
          where: { id: args.materialId },
          data: { reprocessamentos: { increment: 1 } },
        });
      }
    });

    return { ok: true, source: "LEDGER", txId };
  } catch (err) {
    console.warn("[Fabric] submitAndWait falhou:", (err as any)?.message || err);
    if (args.allowDbFallback === false) throw err;

    // Fallback somente DB (sem txId)
    await prisma.$transaction(async (tx) => {
      const human = args.operatorId ?? "db-fallback";

      await tx.cycle.upsert({
        where: { id: args.cycleId },
        create: {
          id: args.cycleId,
          materialId: args.materialId,
          etapa: stage,
          loteId: args.batchId ?? null,
          responsavel: human,
        } as any,
        update: {
          etapa: stage,
          responsavel: human,
        },
      });

      await tx.stageEvent.create({
        data: {
          materialId: args.materialId,
          cycleId: args.cycleId,
          stage,
          occurredAt: new Date(), // horário do servidor (sem ledger)
          operatorId: human, // crachá/nome
          operatorMSP: args.operatorMSP ?? null,
          source: EventSource.DB,
          ledgerTxId: null,
          batchId: args.batchId ?? null,
          notes: args.notes ?? "[fallback DB] Ledger indisponível.",
        },
      });

      if (stage === "ESTERILIZACAO") {
        await tx.material
          .update({
            where: { id: args.materialId },
            data: { reprocessamentos: { increment: 1 } },
          })
          .catch(() => {});
      }
    });

    return { ok: false, source: "DB", txId: null };
  }
}

/**
 * Atualiza etapa no Ledger e registra StageEvent no DB.
 * Em caso de erro no ledger, grava fallback DB (se allowDbFallback !== false).
 */
export async function recordUpdateStage(args: UpdateArgs): Promise<RecordResult> {
  const stage = normStage(args.nextStage);
  const meta = validateAndExtractMeta(stage, args.params);

  try {
    // 1) Ledger
    const { txId } = await submitAndWait("updateCycleStage", args.cycleId, stage);

    // 2) Readback
    const got = await evaluateTransaction("getCycle", args.cycleId);
    const doc = got ? JSON.parse(got) : null;
    const last = getLastHistoryEntry(doc);

    const occurredAt = last?.timestamp ? new Date(last.timestamp) : new Date();
    const mspId = last?.mspId ?? null;
    const materialId = doc?.instrumentId as string | undefined;
    const batchId = doc?.batchId ?? null;
    if (!materialId) throw new Error("Ledger retornou ciclo sem 'instrumentId'.");

    const human = args.operatorId ?? x509ToDisplay(last?.operatorId) ?? "ledger";

    // 3) DB
    await prisma.$transaction(async (tx) => {
      await tx.cycle.upsert({
        where: { id: args.cycleId },
        create: {
          id: args.cycleId,
          materialId,
          etapa: stage,
          loteId: batchId,
          responsavel: human,
        } as any,
        update: {
          etapa: stage,
          responsavel: human,
        },
      });

      await tx.stageEvent.upsert({
        where: { ledgerTxId: txId },
        update: {},
        create: {
          materialId,
          cycleId: args.cycleId,
          stage,
          occurredAt,
          operatorId: human, // crachá/nome
          operatorMSP: mspId,
          source: EventSource.LEDGER,
          ledgerTxId: txId,
          batchId,
          notes: args.notes ?? null,
        },
      });

      if (stage === "ESTERILIZACAO") {
        await tx.material.update({
          where: { id: materialId },
          data: { reprocessamentos: { increment: 1 } },
        });
      }
    });

    return { ok: true, source: "LEDGER", txId };
  } catch (err) {
    console.warn("[Fabric] submitAndWait falhou:", (err as any)?.message || err);
    if (args.allowDbFallback === false) throw err;

    // Fallback: tenta descobrir materialId/batchId
    let materialId: string | null = null;
    let batchId: string | null = null;
    try {
      const got2 = await evaluateTransaction("getCycle", args.cycleId);
      const doc2 = got2 ? JSON.parse(got2) : null;
      materialId = doc2?.instrumentId ?? null;
      batchId = doc2?.batchId ?? null;
    } catch {
      // tenta pelo banco
      const c = await prisma.cycle.findUnique({
        where: { id: args.cycleId },
        select: { materialId: true, loteId: true },
      });
      materialId = c?.materialId ?? null;
      batchId = c?.loteId ?? null;
    }
    if (!materialId) throw err;

    const human = args.operatorId ?? "db-fallback";

    await prisma.$transaction(async (tx) => {
      await tx.cycle.upsert({
        where: { id: args.cycleId },
        create: {
          id: args.cycleId,
          materialId,
          etapa: stage,
          loteId: batchId,
          responsavel: human,
        } as any,
        update: {
          etapa: stage,
          responsavel: human,
        },
      });

      await tx.stageEvent.create({
        data: {
          materialId,
          cycleId: args.cycleId,
          stage,
          occurredAt: new Date(),
          operatorId: human, // crachá/nome
          operatorMSP: args.operatorMSP ?? null,
          source: EventSource.DB,
          ledgerTxId: null,
          batchId,
          notes: args.notes ?? "[fallback DB] Ledger indisponível.",
        },
      });

      if (stage === "ESTERILIZACAO") {
        await tx.material
          .update({
            where: { id: materialId },
            data: { reprocessamentos: { increment: 1 } },
          })
          .catch(() => {});
      }
    });

    return { ok: false, source: "DB", txId: null };
  }
}
