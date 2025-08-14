import { Request, Response, NextFunction } from 'express'
import { createLoteUseCase } from '../usecases/lote/createLote'
import { listLotesUseCase } from '../usecases/lote/listLotes'
import { updateLoteUseCase } from '../usecases/lote/updateLote'
import { deleteLoteUseCase } from '../usecases/lote/deleteLote'
import { getLoteHistoryUseCase } from '../usecases/lote/getLoteHistory'
import { reconcileLoteUseCase } from '../usecases/lote/reconcileLote'

export async function criarLote(req: Request, res: Response) {
  const lote = await createLoteUseCase(req.body)
  res.status(201).json(lote)
}

export async function listarLotes(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(req.query.perPage ?? 10)));
  const q = (req.query.q as string | undefined)?.trim() || undefined;

  const sort = (req.query.sort as string | undefined) ?? "criadoEm";
  const order = (req.query.order as "asc" | "desc" | undefined) ?? "desc";

  const result = await listLotesUseCase({ q, page, perPage, sort, order });
  res.json(result); // { data, meta: { total, page, perPage } }
}

export async function atualizarLote(req: Request, res: Response) {
  const lote = await updateLoteUseCase(req.params.id, req.body)
  res.json(lote)
}

export async function deletarLote(req: Request, res: Response) {
  await deleteLoteUseCase(req.params.id)
  res.json({ message: 'Lote excluído com sucesso' })
}

export async function obterHistoricoLote(req: Request, res: Response) {
  const { startDate, endDate, etapa } = req.query
  const historico = await getLoteHistoryUseCase(
    req.params.id,
    startDate as string,
    endDate as string,
    etapa as string
  )
  res.json(historico)
}
export async function reconciliarLote(req: Request, res: Response, next: NextFunction) {
  try {
    const out = await reconcileLoteUseCase(req.params.id);
    res.json(out);
  } catch (e:any) {
    if (e?.status) return res.status(e.status).json({ error: e.message });
    next(e);
  }
}