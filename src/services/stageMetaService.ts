import { Prisma, PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Utilitário para erro 400
function badRequest(message: string) {
  const e: any = new Error(message);
  e.status = 400;
  return e;
}

// Garante que o StageEvent existe e corresponde à etapa esperada
async function assertStageEvent(id: string, expectedStage: string) {
  const evt = await prisma.stageEvent.findUnique({ where: { id } });
  if (!evt) throw badRequest("StageEvent não encontrado.");
  const s = (evt.stage || "").toUpperCase();
  if (s !== expectedStage.toUpperCase()) {
    throw badRequest(`StageEvent é da etapa ${s}, não ${expectedStage}.`);
  }
  return evt;
}
function isJsonObject(v: unknown): v is Prisma.JsonObject {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function toJsonObject(v: unknown): Prisma.JsonObject {
  return isJsonObject(v) ? (v as Prisma.JsonObject) : ({} as Prisma.JsonObject);
}

// Deep merge simples para JsonObject
function deepMergeJson(a: Prisma.JsonObject, b: Prisma.JsonObject): Prisma.JsonObject {
  const out: Prisma.JsonObject = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const av = out[k];
    if (isJsonObject(av) && isJsonObject(v)) {
      out[k] = deepMergeJson(av, v);
    } else {
      out[k] = v as Prisma.JsonValue;
    }
  }
  return out;
}
// Mescla JSON no StageEvent.meta para compatibilidade
// Mescla JSON no StageEvent.meta para compatibilidade
export async function mergeMetaJSON(stageEventId: string, patch: unknown) {
  const curr = await prisma.stageEvent.findUnique({
    where: { id: stageEventId },
    select: { meta: true },
  });

  const base = toJsonObject(curr?.meta);
  const add = toJsonObject(patch);

  const next = deepMergeJson(base, add);

  await prisma.stageEvent.update({
    where: { id: stageEventId },
    data: { meta: next as Prisma.InputJsonValue },
  });
}

/* ----------------------------- LAVAGEM ----------------------------- */
export async function attachWashMeta(stageEventId: string, body: {
  method: "MANUAL" | "ULTRASSONICA" | "TERMO_DESINFECCAO";
  detergent?: string;
  timeMin?: number;
  tempC?: number;
}) {
  await assertStageEvent(stageEventId, "LAVAGEM");
  if (!body?.method) throw badRequest("LAVAGEM: 'method' é obrigatório.");

  const saved = await prisma.washEvent.upsert({
    where: { stageEventId },
    update: {
      method: body.method,
      detergent: body.detergent,
      timeMin: body.timeMin,
      tempC: body.tempC,
    },
    create: {
      stageEventId,
      method: body.method,
      detergent: body.detergent,
      timeMin: body.timeMin,
      tempC: body.tempC,
    },
  });

  await mergeMetaJSON(stageEventId, { wash: saved });
  return saved;
}

/* --------------------------- DESINFECÇÃO --------------------------- */
export async function attachDisinfectionMeta(stageEventId: string, body: {
  agent: "PERACETICO" | "HIPOCLORITO" | "OPA" | "QUATERNARIO" | "ALCOOL70" | "OUTRO";
  concentration?: string;
  contactMin: number;
  solutionLotId?: string;
  testStripLot?: string;
  testStripResult?: "PASS" | "FAIL" | "NA";
  measuredTempC?: number;
  ph?: number;
}) {
  await assertStageEvent(stageEventId, "DESINFECCAO");
  if (!body?.agent) throw badRequest("DESINFECCAO: 'agent' é obrigatório.");
  if (body?.contactMin == null || body.contactMin <= 0) {
    throw badRequest("DESINFECCAO: 'contactMin' deve ser > 0.");
  }
  if (["PERACETICO", "OPA", "HIPOCLORITO"].includes(body.agent) && !body.concentration) {
    throw badRequest("DESINFECCAO: 'concentration' é obrigatória para o agente selecionado.");
  }

  const saved = await prisma.disinfectionEvent.upsert({
    where: { stageEventId },
    update: {
      agent: body.agent,
      concentration: body.concentration,
      contactMin: body.contactMin,
      solutionLotId: body.solutionLotId,
      testStripLot: body.testStripLot,
      testStripResult: body.testStripResult ?? null,
      measuredTempC: body.measuredTempC,
      ph: body.ph,
    },
    create: {
      stageEventId,
      agent: body.agent,
      concentration: body.concentration,
      contactMin: body.contactMin,
      solutionLotId: body.solutionLotId,
      testStripLot: body.testStripLot,
      testStripResult: body.testStripResult ?? null,
      measuredTempC: body.measuredTempC,
      ph: body.ph,
    },
  });

  await mergeMetaJSON(stageEventId, { disinfection: saved });
  return saved;
}

/* -------------------------- ESTERILIZAÇÃO -------------------------- */
export async function attachSterilizationMeta(stageEventId: string, body: {
  method: "STEAM_134" | "STEAM_121" | "H2O2" | "ETO" | "OUTRO";
  autoclaveId?: string;
  program?: string;
  exposureMin?: number;
  tempC?: number;
  ci?: "PASS" | "FAIL" | "NA";
  bi?: "PASS" | "FAIL" | "NA";
  loadId?: string;
}) {
  await assertStageEvent(stageEventId, "ESTERILIZACAO");
  if (!body?.method) throw badRequest("ESTERILIZACAO: 'method' é obrigatório.");

  const saved = await prisma.sterilizationEvent.upsert({
    where: { stageEventId },
    update: {
      method: body.method,
      autoclaveId: body.autoclaveId,
      program: body.program,
      exposureMin: body.exposureMin,
      tempC: body.tempC,
      ci: body.ci ?? null,
      bi: body.bi ?? null,
      loadId: body.loadId,
    },
    create: {
      stageEventId,
      method: body.method,
      autoclaveId: body.autoclaveId,
      program: body.program,
      exposureMin: body.exposureMin,
      tempC: body.tempC,
      ci: body.ci ?? null,
      bi: body.bi ?? null,
      loadId: body.loadId,
    },
  });

  await mergeMetaJSON(stageEventId, { sterilization: saved });
  return saved;
}

/* --------------------------- ARMAZENAMENTO ------------------------- */
export async function attachStorageMeta(stageEventId: string, body: {
  location?: string;
  shelfPolicy?: "TIME" | "EVENT";
  expiresAt?: string;   // ISO
  integrityOk?: boolean;
}) {
  await assertStageEvent(stageEventId, "ARMAZENAMENTO");

  const when = body.expiresAt ? new Date(body.expiresAt) : null;
  if (when && Number.isNaN(when.getTime())) throw badRequest("ARMAZENAMENTO: 'expiresAt' inválido (ISO).");

  const saved = await prisma.storageEvent.upsert({
    where: { stageEventId },
    update: {
      location: body.location,
      shelfPolicy: body.shelfPolicy ?? null,
      expiresAt: when,
      integrityOk: body.integrityOk ?? null,
    },
    create: {
      stageEventId,
      location: body.location,
      shelfPolicy: body.shelfPolicy ?? null,
      expiresAt: when,
      integrityOk: body.integrityOk ?? null,
    },
  });

  await mergeMetaJSON(stageEventId, { storage: saved });
  return saved;
}
