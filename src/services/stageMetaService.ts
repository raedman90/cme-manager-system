import { Prisma, PrismaClient } from "@prisma/client";
import { getSolutionLot, getTestStripLot } from "./lotsService";
import { openAlertIfNotExists, resolveAlertsByKey } from "./alertsService";
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
  activationTime?: string; // "HH:mm"
  activationLevel?: "ATIVO_2" | "ATIVO_1" | "INATIVO" | "NAO_REALIZADO";
  testStripExpiry?: string; // ISO date "YYYY-MM-DD"
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

  // -------- validações por lote + alertas --------
  const evt = await prisma.stageEvent.findUnique({ where: { id: stageEventId }, select: { id: true, cycleId: true, stage: true } });
  const cycleId = evt?.cycleId || undefined;

  // helper concentração
  function parseConcentrationTo(unit: "PERCENT" | "PPM", s?: string): number | null {
    if (!s) return null;
    const raw = String(s).replace(",", ".").toLowerCase().trim();
    const num = parseFloat(raw.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(num)) return null;
    const hasPPM = /ppm/.test(raw);
    const hasPct = /%/.test(raw);
    if (unit === "PPM") {
      if (hasPPM) return num;
      if (hasPct) return num * 10000; // 1% ≈ 10000 ppm (aprox.)
      return num; // assume já está em ppm se não especificado
    }
    if (unit === "PERCENT") {
      if (hasPct) return num;
      if (hasPPM) return num / 10000;
      return num; // assume %
    }
    return null;
  }

  // solução
  if (body.solutionLotId) {
    const lot = await getSolutionLot(body.solutionLotId);
    if (lot) {
      if (lot.agent !== body.agent) {
        await openAlertIfNotExists({
          key: `disinfection.solution.agent_mismatch.${stageEventId}`,
          kind: "DISINFECTION_FAIL",
          severity: "WARNING",
          title: "Lote de solução incompatível com agente",
          message: `Lote ${lot.lotNumber} é ${lot.agent}, mas agente informado é ${body.agent}.`,
          cycleId,
          stageEventId,
          stage: "DESINFECCAO",
        });
      }
      if (lot.expiryAt && lot.expiryAt < new Date()) {
        await openAlertIfNotExists({
          key: `disinfection.solution.expired.${body.solutionLotId}`,
          kind: "DISINFECTION_FAIL",
          severity: "CRITICAL",
          title: "Solução desinfetante expirada",
          message: `Lote ${lot.lotNumber} expirou em ${lot.expiryAt.toISOString().slice(0,10)}.`,
          cycleId,
          stageEventId,
          stage: "DESINFECCAO",
        });
      } else {
        await resolveAlertsByKey(`disinfection.solution.expired.${body.solutionLotId}`);
      }
      if (lot.unit && (lot.minValue != null || lot.maxValue != null) && body.concentration) {
        const v = parseConcentrationTo(lot.unit, body.concentration);
        const okMin = lot.minValue == null || (v != null && v >= lot.minValue);
        const okMax = lot.maxValue == null || (v != null && v <= lot.maxValue);
        if (!(okMin && okMax)) {
          await openAlertIfNotExists({
            key: `disinfection.solution.concentration.out_of_range.${stageEventId}`,
            kind: "DISINFECTION_FAIL",
            severity: "WARNING",
            title: "Concentração fora da faixa esperada",
            message: `Informada: ${body.concentration} · Esperado: ${lot.minValue ?? "?"}–${lot.maxValue ?? "?"} ${lot.unit}`,
            cycleId,
            stageEventId,
            stage: "DESINFECCAO",
          });
        } else {
          await resolveAlertsByKey(`disinfection.solution.concentration.out_of_range.${stageEventId}`);
        }
      }
    }
  }

  // fita teste
  if (body.testStripLot) {
    const strip = await getTestStripLot(body.testStripLot);
    if (strip) {
      if (strip.agent !== body.agent) {
        await openAlertIfNotExists({
          key: `disinfection.strip.agent_mismatch.${stageEventId}`,
          kind: "DISINFECTION_FAIL",
          severity: "WARNING",
          title: "Fita teste incompatível com agente",
          message: `Fita Lote ${strip.lotNumber} é para ${strip.agent}, mas agente informado é ${body.agent}.`,
          cycleId, stageEventId, stage: "DESINFECCAO",
        });
      }
      if (strip.expiryAt && strip.expiryAt < new Date()) {
        await openAlertIfNotExists({
          key: `disinfection.strip.expired.${body.testStripLot}`,
          kind: "DISINFECTION_FAIL",
          severity: "CRITICAL",
          title: "Fita teste expirada",
          message: `Lote ${strip.lotNumber} expirou em ${strip.expiryAt.toISOString().slice(0,10)}.`,
          cycleId, stageEventId, stage: "DESINFECCAO",
        });
      } else {
        await resolveAlertsByKey(`disinfection.strip.expired.${body.testStripLot}`);
      }
    }
  }

  if (body.testStripResult === "FAIL") {
    await openAlertIfNotExists({
      key: `disinfection.strip.fail.${stageEventId}`,
      kind: "DISINFECTION_FAIL",
      severity: "CRITICAL",
      title: "Fita teste reprovada",
      message: `Resultado da fita teste: FAIL.`,
      cycleId, stageEventId, stage: "DESINFECCAO",
    });
  } else if (body.testStripResult === "PASS") {
    await resolveAlertsByKey(`disinfection.strip.fail.${stageEventId}`);
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
      activationTime: body.activationTime,
      activationLevel: body.activationLevel as any,
      testStripExpiry: body.testStripExpiry ? new Date(body.testStripExpiry) : null,
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
      activationTime: body.activationTime,
      activationLevel: body.activationLevel as any,
      testStripExpiry: body.testStripExpiry ? new Date(body.testStripExpiry) : null,
      measuredTempC: body.measuredTempC,
      ph: body.ph,
    },
  });

  await mergeMetaJSON(stageEventId, { disinfection: saved });
  // ----- ALERTAS -----
  const se = await prisma.stageEvent.findUnique({ where: { id: stageEventId }, select: { cycleId: true, stage: true } });
  const keyBase = `DISINFECTION_FAIL:${cycleId}:${stageEventId}`;
  const badStrip = saved.testStripResult === "FAIL";
  const inactive = saved.activationLevel === "INATIVO" || saved.activationLevel === "NAO_REALIZADO";
  if (badStrip || inactive) {
    await openAlertIfNotExists({
      key: keyBase,
      kind: "DISINFECTION_FAIL",
      severity: "CRITICAL",
      title: "Não conformidade na desinfecção",
      message: badStrip
        ? "Fita teste reprovada."
        : "Solução desinfetante inativa ou teste não realizado.",
      cycleId,
      stageEventId,
      stage: "DESINFECCAO",
      data: { testStripResult: saved.testStripResult, activationLevel: saved.activationLevel },
    });
  } else {
    // voltou a ficar ok -> resolver alerta desse SE
    await resolveAlertsByKey(keyBase);
  }
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
  // ----- ALERTAS -----
  const se = await prisma.stageEvent.findUnique({ where: { id: stageEventId }, select: { cycleId: true, stage: true } });
  const cycleId = se?.cycleId!;
  const keyBase = `STERILIZATION_FAIL:${cycleId}:${stageEventId}`;
  const ciFail = saved.ci === "FAIL";
  const biFail = saved.bi === "FAIL";
  if (ciFail || biFail) {
    await openAlertIfNotExists({
      key: keyBase,
      kind: "STERILIZATION_FAIL",
      severity: "CRITICAL",
      title: "Não conformidade na esterilização",
      message: ciFail && biFail ? "CI e BI reprovados." : ciFail ? "CI reprovado." : "BI reprovado.",
      cycleId,
      stageEventId,
      stage: "ESTERILIZACAO",
      data: { ci: saved.ci, bi: saved.bi },
    });
  } else {
    await resolveAlertsByKey(keyBase);
  }
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
  // ----- ALERTAS (validade) -----
  const se = await prisma.stageEvent.findUnique({ where: { id: stageEventId }, select: { cycleId: true } });
  const cycleId = se?.cycleId!;
  const keyExpired = `STORAGE_EXPIRED:${cycleId}:${stageEventId}`;
  const keySoon = `STORAGE_SOON:${cycleId}:${stageEventId}`;
  const now = new Date();
  const soonMs = 3 * 24 * 60 * 60 * 1000; // 3 dias (ajuste conforme política)
  if (saved.expiresAt && saved.expiresAt.getTime() < now.getTime()) {
    await openAlertIfNotExists({
      key: keyExpired,
      kind: "STORAGE_EXPIRED",
      severity: "CRITICAL",
      title: "Validade expirada",
      message: `Pacote expirado em ${saved.expiresAt.toISOString()}`,
      cycleId,
      stageEventId,
      stage: "ARMAZENAMENTO",
      dueAt: saved.expiresAt,
    });
    // e resolve o "soon" se existir
    await resolveAlertsByKey(keySoon);
  } else if (saved.expiresAt && saved.expiresAt.getTime() - now.getTime() <= soonMs) {
    await openAlertIfNotExists({
      key: keySoon,
      kind: "STORAGE_EXPIRES_SOON",
      severity: "WARNING",
      title: "Validade próxima do vencimento",
      message: `Vence em breve (${saved.expiresAt.toISOString()})`,
      cycleId,
      stageEventId,
      stage: "ARMAZENAMENTO",
      dueAt: saved.expiresAt,
    });
    // garantir que "expired" não fique aberto
    await resolveAlertsByKey(keyExpired);
  } else {
    // fora das janelas => limpa ambos
    await resolveAlertsByKey(keySoon);
    await resolveAlertsByKey(keyExpired);
  }
  return saved;
}
