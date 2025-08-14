import { Request, Response, NextFunction } from 'express'
import { createCycleUseCase } from '../usecases/cycle/createCycle'
import { listCyclesUseCase } from '../usecases/cycle/listCycles'
import { deleteCycleUseCase } from '../usecases/cycle/deleteCycle'
import { createCycleForLoteUseCase } from '../usecases/cycle/createCycleForLote'
import { getCycleByIdUseCase } from '../usecases/cycle/getCycleById'
import { updateCycleStageUseCase } from '../usecases/cycle/updateCycleStage';

export async function criarCiclo(req: Request, res: Response) {
  const ciclo = await createCycleUseCase(req.body)
  res.status(201).json(ciclo)
}

export async function listarCiclos(req: Request, res: Response) {
  const { loteId, batchId, materialId, etapa, q } = req.query;
  const ciclos = await listCyclesUseCase({
    loteId: (loteId || batchId) as string | undefined,
    materialId: materialId as string | undefined,
    etapa: etapa as string | undefined,
    q: q as string | undefined,
  });
  res.json(ciclos);
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
    if (m.includes("not found") || m.includes("does not exist")) {
      return next({ name: "NotFoundError", status: 404, message: "Ciclo não encontrado" });
    }
    if (m.includes("mvcc") || m.includes("conflict")) {
      return next({ name: "ConflictError", status: 409, message: "Conflito de versão no ledger" });
    }
    next(e);
  }
}
