import { PrismaClient } from "@prisma/client";
import type { CreateCycleLoteDTO } from "../../dtos/ICycleDTO";
import { randomUUID as _randomUUID } from "crypto";
import { eventBus as __eventBus } from "../../events/eventBus";
import { recordCreateCycle as _recordCreateCycle } from "../../services/traceService";

const prisma = new PrismaClient();

export async function createCycleForLoteUseCase(loteId: string, dto: CreateCycleLoteDTO & { params?: any }) {
  const lote = await prisma.lote.findUnique({ where: { id: loteId } });
  if (!lote) throw { name: "NotFoundError", status: 404, message: "Lote não encontrado" };

  const materiais = await prisma.material.findMany({ where: { loteId } });
  if (materiais.length === 0) {
    return { ok: true, count: 0, results: [], info: "Nenhum material associado a este lote." };
  }

  const stage = String(dto.etapa).toUpperCase();
  const operator = dto.responsavel;

  const results: any[] = [];

  for (const m of materiais) {
    const id = _randomUUID();

    // Cria no Ledger + DB (StageEvent) usando o serviço unificado
    const { txId, source } = await _recordCreateCycle({
      cycleId: id,
      materialId: m.id,
      batchId: lote.id,
      stage,
      operatorId: operator,
      notes: dto.observacoes ?? null,
      params: (dto as any).params ?? undefined,
    });

    // Opcional: leitura do espelho no DB
    const saved = await prisma.cycle.findUnique({ where: { id } });

    // Emite SSE por material
    __eventBus.emit("cycle:update", {
      type: "cycle:update",
      id,
      materialId: m.id,
      stage,
      txId,
      loteId: lote.id,
    });

    results.push({ origem: source?.toLowerCase?.() === "ledger" ? "fabric" : "banco", txId, cache: saved, id, materialId: m.id });
  }

  return { ok: true, count: results.length, results };
}
