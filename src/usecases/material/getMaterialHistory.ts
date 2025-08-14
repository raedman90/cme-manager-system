import { PrismaClient } from "@prisma/client";
import { evaluateTransaction } from "../../blockchain/fabricService";

const prisma = new PrismaClient();

export type HistoryEntry = {
  fonte: "fabric" | "db";
  etapa: string;
  timestamp: string;           // ISO
  responsavel?: string | null;
  loteId?: string | null;
  materialId?: string | null;  // útil no merge
  batchId?: string | null;     // vindo do ledger
};

function mapLedgerItem(it: any): HistoryEntry {
  // Ajuste aqui conforme o shape que o chaincode retorna
  return {
    fonte: "fabric",
    etapa: it.stage || it.etapa || "",
    timestamp: it.timestamp || it.ts || new Date().toISOString(),
    responsavel: it.operator || it.responsavel || null,
    loteId: it.batchId || it.loteId || null,
    materialId: it.instrumentId || it.materialId || null,
    batchId: it.batchId || null,
  };
}

export async function getMaterialHistoryUseCase(materialId: string, startDate?: string, endDate?: string, etapa?: string) {
  const [material, dbCycles] = await Promise.all([
    prisma.material.findUnique({
      where: { id: materialId },
      select: { id: true, nome: true, codigo: true },
    }),
    prisma.cycle.findMany({
      where: { materialId },
      orderBy: { timestamp: "asc" },
      select: { etapa: true, timestamp: true, responsavel: true, materialId: true, loteId: true },
    }),
  ]);

  if (!material) throw { name: "NotFoundError", status: 404, message: "Material não encontrado" };

  let fabricItems: HistoryEntry[] = [];
  try {
    const out = await evaluateTransaction("getHistoryByInstrument", materialId);
    if (out) {
      const arr = JSON.parse(out);
      fabricItems = Array.isArray(arr) ? arr.map(mapLedgerItem) : [];
    }
  } catch (e) {
    // ledger offline: segue só com DB
  }

  const dbItems: HistoryEntry[] = dbCycles.map((c) => ({
    fonte: "db",
    etapa: String(c.etapa || ""),
    timestamp: (c.timestamp instanceof Date ? c.timestamp.toISOString() : String(c.timestamp)),
    responsavel: c.responsavel ?? null,
    loteId: c.loteId ?? null,
    materialId: c.materialId,
  }));

  // merge + filtros opcionais
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
    material: { id: material.id, name: material.nome, code: material.codigo },
    timeline,
  };
}
