// src/services/reconcileService.ts
import { evaluateTransaction } from "../blockchain/fabricService";
import { EventSource } from "@prisma/client";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
/** Extrai CN do X.509; se não bater, retorna string original */
function x509ToDisplay(id?: string | null): string | null {
  if (!id) return null;
  if (!id.startsWith("x509::")) return id;
  const parts = id.split("::");
  const subject = parts[1] ?? "";
  const m = subject.match(/CN=([^/]+)/);
  return m?.[1] ?? id;
}

/** Backfill de UM ciclo pelo ID (lê ledger e grava em StageEvent) */
export async function backfillCycleFromLedger(cycleId: string) {
  const raw = await evaluateTransaction("getCycle", cycleId);
  if (!raw) return { ok: true, cycleId, count: 0, info: "Cycle não encontrado no ledger." };

  const doc = JSON.parse(raw);
  const materialId: string | undefined = doc?.instrumentId;
  const batchId: string | null = doc?.batchId ?? null;
  const history: any[] = Array.isArray(doc?.history) ? doc.history : [];

  if (!materialId) return { ok: false, cycleId, count: 0, error: "Ledger retornou cycle sem instrumentId." };

  let count = 0;
  for (const h of history) {
    const stage = String(h.stage ?? "").toUpperCase();
    const occurredAt = h.timestamp ? new Date(h.timestamp) : new Date();
    const human = x509ToDisplay(h.operatorId) ?? "ledger";
    const mspId = h.mspId ?? null;
    const txId: string | undefined = h.txId;

    // upsert por ledgerTxId (precisa do @unique no schema)
    if (!txId) continue; // no Fabric sempre vem; segurança

    await prisma.stageEvent.upsert({
      where: { ledgerTxId: txId },
      update: {}, // já registrado
      create: {
        materialId,
        cycleId,
        stage,
        occurredAt,
        operatorId: human,
        operatorMSP: mspId,
        source: EventSource.LEDGER,
        ledgerTxId: txId,
        batchId,
        notes: null,
      },
    });
    count++;
  }

  return { ok: true, cycleId, count };
}

/** Backfill de TODOS os ciclos de um material (usa tabela Cycle do seu DB) */
export async function backfillMaterialFromLedger(materialId: string) {
  const cycles = await prisma.cycle.findMany({
    where: { materialId },
    select: { id: true },
    orderBy: { timestamp: "asc" },
  });

  let total = 0;
  for (const c of cycles) {
    const r = await backfillCycleFromLedger(c.id);
    total += r.count ?? 0;
  }
  return { ok: true, materialId, cycles: cycles.length, imported: total };
}
