import { Request, Response, NextFunction } from 'express'
import { createMaterialUseCase } from '../usecases/material/createMaterial'
import { updateMaterialUseCase } from '../usecases/material/updateMaterial'
import { deleteMaterialUseCase } from '../usecases/material/deleteMaterial'
import { listMaterialsUseCase } from '../usecases/material/listMaterials'
import { getMaterialByIdUseCase } from '../usecases/material/getMaterialById'
import { getMaterialHistoryUseCase } from '../usecases/material/getMaterialHistory'
import { reconcileMaterialUseCase } from '../usecases/material/reconcileMaterial'
import { applyReconcileMaterialUseCase } from '../usecases/material/applyReconcile'

export async function criarMaterial(req: Request, res: Response) {
  const material = await createMaterialUseCase(req.body)
  res.status(201).json(material)
}

export async function listarMateriais(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(req.query.perPage ?? 10)));
  const q = (req.query.q as string | undefined)?.trim() || undefined;
  const ativo = req.query.ativo === undefined ? undefined : String(req.query.ativo) === "true";
  const sort = (req.query.sort as string | undefined) ?? "criadoEm";
  const order = (req.query.order as "asc" | "desc" | undefined) ?? "desc";

  const result = await listMaterialsUseCase({ q, page, perPage, ativo, sort, order });
  res.json(result);
}

export async function buscarMaterialPorId(req: Request, res: Response) {
  const material = await getMaterialByIdUseCase(req.params.id)
  if (!material) return res.status(404).json({ error: 'Material não encontrado' })
  res.json(material)
}

export async function atualizarMaterial(req: Request, res: Response) {
  const material = await updateMaterialUseCase(req.params.id, req.body)
  res.json(material)
}

export async function deletarMaterial(req: Request, res: Response) {
  await deleteMaterialUseCase(req.params.id)
  res.json({ message: 'Material deletado com sucesso' })
}

export async function obterHistoricoMaterial(req: Request, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate, etapa } = req.query;
    const result = await getMaterialHistoryUseCase(
      req.params.id,
      startDate as string | undefined,
      endDate as string | undefined,
      etapa as string | undefined
    );
    res.json(result);
  } catch (e: any) {
    if (e?.status) return res.status(e.status).json({ error: e.message });
    next(e);
  }
}

export async function reconciliarMaterial(req: Request, res: Response, next: NextFunction) {
  try {
    const out = await reconcileMaterialUseCase(req.params.id);
    res.json(out);
  } catch (e:any) {
    if (e?.status) return res.status(e.status).json({ error: e.message });
    next(e);
  }
}

export async function aplicarReconcileMaterial(req: Request, res: Response, next: NextFunction) {
  try {
    const out = await applyReconcileMaterialUseCase(req.params.id);
    res.json(out);
  } catch (e) { next(e); }
}
