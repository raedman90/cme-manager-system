import { PrismaClient } from "@prisma/client";
import { evaluateTransaction } from "../../blockchain/fabricService";

const prisma = new PrismaClient();

export type LoteHistoryEntry = {
  fonte: "fabric" | "db";
  etapa: string;
  timestamp: string;
  responsavel?: string | null;
  loteId?: string | null;
  materialId?: string | null;
  batchId?: string | null;
};

function mapLedger(it: any): LoteHistoryEntry {
  return {
    fonte: "fabric",
    etapa: it.stage || "",
    timestamp: it.timestamp || new Date().toISOString(),
    responsavel: it.operator || null,
    loteId: it.batchId || null,
    batchId: it.batchId || null,
    materialId: it.instrumentId || null,
  };
}

export async function getLoteHistoryUseCase(loteId: string, startDate?: string, endDate?: string, etapa?: string) {
  const lote = await prisma.lote.findUnique({
    where: { id: loteId },
    include: { materiais: { select: { id: true, nome: true, codigo: true } } },
  });
  if (!lote) throw { name: "NotFoundError", status: 404, message: "Lote não encontrado" };

  let fabricItems: LoteHistoryEntry[] = [];
  try {
    // Se o chaincode tiver um "listByBatch", preferir:
    const out = await evaluateTransaction("listByBatch", loteId);
    if (out) {
      const arr = JSON.parse(out);
      fabricItems = Array.isArray(arr) ? arr.map(mapLedger) : [];
    }
  } catch {}

  const dbCycles = await prisma.cycle.findMany({
    where: { material: { loteId } },
    orderBy: { timestamp: "asc" },
    select: { etapa: true, timestamp: true, responsavel: true, materialId: true, material: { select: { loteId: true } } },
  });

  const dbItems: LoteHistoryEntry[] = dbCycles.map((c) => ({
    fonte: "db",
    etapa: String(c.etapa || ""),
    timestamp: (c.timestamp instanceof Date ? c.timestamp.toISOString() : String(c.timestamp)),
    responsavel: c.responsavel ?? null,
    loteId: c.material?.loteId ?? null,
    materialId: c.materialId,
  }));

  let timeline = [...fabricItems, ...dbItems].filter((e) => e.etapa);
  if (startDate && endDate) {
    const s = new Date(startDate).getTime();
    const e = new Date(endDate).getTime();
    timeline = timeline.filter((x) => {
      const t = new Date(x.timestamp).getTime();
      return !Number.isNaN(t) && t >= s && t <= e;
    });
  }
  if (etapa) {
    const needle = etapa.toUpperCase();
    timeline = timeline.filter((x) => x.etapa.toUpperCase() === needle);
  }
  timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return {
    lote: { id: lote.id, name: (lote as any).nome ?? null, code: (lote as any).numero ?? null },
    materials: lote.materiais.map((m) => ({ id: m.id, name: m.nome, code: m.codigo })),
    timeline,
  };
}
