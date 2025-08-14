import { PrismaClient } from "@prisma/client";
import type { CreateCycleDTO } from "../../dtos/ICycleDTO";
import { randomUUID } from "crypto";
import { eventBus } from "../../events/eventBus";
import { recordCreateCycle } from "../../services/traceService";

const prisma = new PrismaClient();

type CreateCycleWithParams = CreateCycleDTO & { params?: any };

export async function createCycleUseCase(dto: CreateCycleWithParams) {
  const id = randomUUID();
  const stage = String(dto.etapa).toUpperCase();

  // Ledger + DB stageEvent (com metadados técnicos e notas)
  const { txId } = await recordCreateCycle({
    cycleId: id,
    materialId: dto.materialId,
    batchId: dto.loteId ?? null,
    stage: dto.etapa,
    operatorId: dto.responsavel, // crachá/nome do funcionário
    notes: dto.observacoes ?? null,
    params: (dto as any).params ?? undefined,
  });

  // Notifica SSE
  eventBus.emit("cycle:update", {
    type: "cycle:update",
    id,
    materialId: dto.materialId,
    stage: stage,
    txId,
    loteId: dto.loteId ?? null,
  });

  // Espelho do DB (opcional)
  const saved = await prisma.cycle.findUnique({ where: { id } });
  return { ok: true, id, txId, cache: saved };
}
