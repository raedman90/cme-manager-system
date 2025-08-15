import type { UpdateStageDTO } from "../../dtos/ICycleDTO";
import { eventBus as _eventBus } from "../../events/eventBus";
import { checkReadyTo } from "../../services/stageReadinessService";
import { recordUpdateStage } from "../../services/traceService";

export async function updateCycleStageUseCase(id: string, dto: UpdateStageDTO & { params?: any }) {
  const next = String(dto.etapa).toUpperCase();

  if (next === "ESTERILIZACAO" || next === "ARMAZENAMENTO") {
    const r = await checkReadyTo(id, next as any);
    if (!r.ok) {
      const err: any = new Error("Regras de progresso não atendidas.");
      err.status = 422;
      err.reasons = r.reasons;
      throw err;
    }
  }
  const { txId } = await recordUpdateStage({
    cycleId: id,
    nextStage: dto.etapa,
    operatorId: dto.responsavel, // crachá/nome
    notes: dto.observacoes ?? null,
    params: (dto as any).params ?? undefined,
  });

  _eventBus.emit("cycle:update", {
    type: "cycle:update",
    id,
    stage: next,
    txId,
  });

  return { ok: true, id, txId };
}