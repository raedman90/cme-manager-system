import { Request, Response, NextFunction } from 'express'
import { createCycleUseCase } from '../usecases/cycle/createCycle'
import { listCyclesUseCase } from '../usecases/cycle/listCycles'
import { deleteCycleUseCase } from '../usecases/cycle/deleteCycle'
import { createCycleForLoteUseCase } from '../usecases/cycle/createCycleForLote'
import { getCycleByIdUseCase } from '../usecases/cycle/getCycleById'
import { updateCycleStageUseCase } from '../usecases/cycle/updateCycleStage';
import { checkReadyTo } from '../services/stageReadinessService'

export async function criarCiclo(req: Request, res: Response) {
  const ciclo = await createCycleUseCase(req.body)
  res.status(201).json(ciclo)
}

export async function listarCiclos(req: Request, res: Response) {
  const { loteId, batchId, materialId, etapa, q } = req.query;
  // paginação + ordenação (com defaults seguros)
  const page = Math.max(1, Number(req.query.page ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(req.query.perPage ?? 10)));
  const sort = (["timestamp", "etapa", "responsavel"] as const).includes(String(req.query.sort) as any)
    ? (req.query.sort as "timestamp" | "etapa" | "responsavel")
    : "timestamp";
  const order = String(req.query.order ?? "desc").toLowerCase() === "asc" ? "asc" : "desc";

  const result = await listCyclesUseCase({
    loteId: (loteId || batchId) as string | undefined,
    materialId: materialId as string | undefined,
    etapa: etapa as string | undefined,
    q: q as string | undefined,
    page,
    perPage,
    sort,
    order,
  });
  res.json(result); // { data, total, page, perPage }
}

export async function deletarCiclo(req: Request, res: Response) {
  await deleteCycleUseCase(req.params.id)
  res.json({ message: 'Ciclo deletado com sucesso' })
}

export async function criarCicloParaLote(req: Request, res: Response) {
  const result = await createCycleForLoteUseCase(req.params.loteId, req.body)
  res.status(201).json(result)
}

export async function obterCiclo(req: Request, res: Response) {
  const result = await getCycleByIdUseCase(req.params.id)
  res.json(result)
}

export async function atualizarEtapa(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await updateCycleStageUseCase(req.params.id, req.body);
    res.json(result);
  } catch (e:any) {
    const m = (e?.message || "").toLowerCase();
    if (e?.status === 422) {
      return next({
        name: "UnprocessableEntity",
        status: 422,
        message: e?.message || "Regras de progresso não atendidas",
        reasons: e?.reasons || [],
      });
    }
    if (m.includes("not found") || m.includes("does not exist")) {
      return next({ name: "NotFoundError", status: 404, message: "Ciclo não encontrado" });
    }
    if (m.includes("mvcc") || m.includes("conflict")) {
      return next({ name: "ConflictError", status: 409, message: "Conflito de versão no ledger" });
    }
    if (e?.name === "AlertBlockError" || e?.status === 412) {
      return next({ name: "PreconditionFailed", status: 412, message: "Há alertas críticos abertos para este ciclo." });
    }
    next(e);
  }
}
export async function getReadiness(req: Request, res: Response, next: NextFunction) {
  try {
    const { cycleId } = req.params;
    const to = String(req.query.to || "").toUpperCase();
    if (!["ESTERILIZACAO", "ARMAZENAMENTO"].includes(to)) {
      return res.status(400).json({ error: "Parâmetro 'to' inválido." });
    }
    const r = await checkReadyTo(cycleId, to as any);
    res.json(r);
  } catch (e) { next(e); }
}