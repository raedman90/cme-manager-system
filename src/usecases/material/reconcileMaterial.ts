import { PrismaClient } from "@prisma/client";
import { evaluateTransaction } from "../../blockchain/fabricService";

const prisma = new PrismaClient();

type Entry = {
  etapa: string;
  timestamp: string; // ISO
  responsavel?: string | null;
  loteId?: string | null;
};

function normStage(s: any) {
  return String(s || "").trim().toUpperCase();
}
function toKey(e: Entry) {
  return `${normStage(e.etapa)}::${new Date(e.timestamp).toISOString()}`;
}

// Política simples: limite por tipo (pode vir de ENV/BD depois)
function getReprocessLimit(tipo?: string | null) {
  const t = String(tipo || "").toLowerCase();
  if (t.includes("crítico")) return 100;
  if (t.includes("semicrítico")) return 200;
  return 300; // não crítico / default
}

export async function reconcileMaterialUseCase(materialId: string) {
  const mat = await prisma.material.findUnique({
    where: { id: materialId },
    select: { id: true, nome: true, codigo: true, tipo: true, reprocessamentos: true },
  });
  if (!mat) throw { status: 404, message: "Material não encontrado" };

  // Ledger
  let ledgerTimeline: Entry[] = [];
  try {
    const raw = await evaluateTransaction("getHistoryByInstrument", materialId);
    if (raw) {
      const arr = JSON.parse(raw);
      ledgerTimeline = (Array.isArray(arr) ? arr : []).map((it: any) => ({
        etapa: it.stage ?? it.etapa ?? "",
        timestamp: it.timestamp ?? new Date().toISOString(),
        responsavel: it.operator ?? it.responsavel ?? null,
        loteId: it.batchId ?? it.loteId ?? null,
      }));
    }
  } catch {}

  // DB
  const dbCycles = await prisma.cycle.findMany({
    where: { materialId },
    orderBy: { timestamp: "asc" },
    select: { etapa: true, timestamp: true, responsavel: true, materialId: true, loteId: true },
  });
  const dbTimeline: Entry[] = dbCycles.map((c) => ({
    etapa: c.etapa,
    timestamp: (c.timestamp as Date).toISOString(),
    responsavel: c.responsavel ?? null,
    loteId: c.loteId ?? null,
  }));

  // Diffs (chave = etapa+timestamp)
  const ledgerSet = new Set(ledgerTimeline.map(toKey));
  const dbSet = new Set(dbTimeline.map(toKey));

  const missingInDb = ledgerTimeline.filter((e) => !dbSet.has(toKey(e)));
  const missingInLedger = dbTimeline.filter((e) => !ledgerSet.has(toKey(e)));

  const lastLedger = ledgerTimeline[ledgerTimeline.length - 1];
  const lastDb = dbTimeline[dbTimeline.length - 1];

  // Contagem de esterilizações no ledger
  const sterileCountLedger = ledgerTimeline.filter((e) => normStage(e.etapa) === "ESTERILIZACAO").length;

  const limit = getReprocessLimit(mat.tipo);
  const exceeded = (mat.reprocessamentos ?? 0) > limit || sterileCountLedger > limit;

  return {
    material: {
      id: mat.id,
      name: mat.nome,
      code: mat.codigo,
      type: mat.tipo,
      reprocessCount_db: mat.reprocessamentos ?? 0,
      reprocessCount_ledger: sterileCountLedger,
      policy: { limit, exceeded },
    },
    ledger: {
      count: ledgerTimeline.length,
      lastStage: lastLedger?.etapa ?? null,
      lastAt: lastLedger?.timestamp ?? null,
    },
    db: {
      count: dbTimeline.length,
      lastStage: lastDb?.etapa ?? null,
      lastAt: lastDb?.timestamp ?? null,
    },
    diffs: {
      missingInDb,      // eventos que só estão no ledger
      missingInLedger,  // eventos que só estão no DB
    },
  };
}
