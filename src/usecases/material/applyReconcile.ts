import { PrismaClient } from "@prisma/client";
import { evaluateTransaction } from "../../blockchain/fabricService";

const prisma = new PrismaClient();

type Entry = {
  etapa: string;
  timestamp: string;      // ISO
  responsavel?: string | null;
  loteId?: string | null;
};

function normStage(s: any) {
  return String(s || "").trim().toUpperCase()
    .replace("ESTERILIZAÇÃO", "ESTERILIZACAO")
    .replace("LAVAGENS", "LAVAGEM");
}
function toKey(e: Entry) {
  return `${normStage(e.etapa)}::${new Date(e.timestamp).toISOString()}`;
}

export async function applyReconcileMaterialUseCase(materialId: string) {
  // 1) pega histórico no ledger
  let ledger: Entry[] = [];
  const raw = await evaluateTransaction("getHistoryByInstrument", materialId).catch(() => null);
  if (raw) {
    const arr = JSON.parse(raw);
    ledger = (Array.isArray(arr) ? arr : []).map((it: any) => ({
      etapa: it.stage ?? it.etapa ?? "",
      timestamp: it.timestamp ?? new Date().toISOString(),
      responsavel: it.operator ?? it.responsavel ?? null,
      loteId: it.batchId ?? it.loteId ?? null,
    }));
  }

  // 2) carrega DB p/ diff
  const dbRows = await prisma.cycle.findMany({
    where: { materialId },
    orderBy: { timestamp: "asc" },
    select: { etapa: true, timestamp: true },
  });
  const dbSet = new Set(
    dbRows.map((c) => `${normStage(c.etapa)}::${(c.timestamp as Date).toISOString()}`)
  );

  const missingInDb = ledger.filter((e) => !dbSet.has(toKey(e)));

  // 3) insere no DB os que faltam
  let esterCount = 0;
  for (const e of missingInDb) {
    const etapa = normStage(e.etapa);
    if (etapa === "ESTERILIZACAO") esterCount++;
    await prisma.cycle.create({
      data: {
        materialId,
        etapa,
        responsavel: e.responsavel ?? "",
        timestamp: new Date(e.timestamp),
        loteId: e.loteId ?? null,
      },
    });
  }

  // 4) incrementa reprocessamentos só pelos novos eventos de esterilização
  if (esterCount > 0) {
    await prisma.material.update({
      where: { id: materialId },
      data: { reprocessamentos: { increment: esterCount } },
    });
  }

  return { ok: true, inserted: missingInDb.length, sterilizationsAdded: esterCount };
}
