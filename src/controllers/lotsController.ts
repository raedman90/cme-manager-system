import type { Request, Response, NextFunction } from "express";
import { listSolutionLots, createSolutionLot, getSolutionLot, listTestStripLots, createTestStripLot, getTestStripLot } from "../services/lotsService";

export async function getSolutionLotsCtrl(req: Request, res: Response, next: NextFunction) {
  try {
    const { agent, q, includeExpired, limit } = req.query;
    const data = await listSolutionLots({
      agent: agent as any,
      q: q as string | undefined,
      includeExpired: includeExpired === "1",
      limit: limit ? Number(limit) : undefined,
    });
    res.json({ data });
  } catch (e) { next(e); }
}
export async function postSolutionLotCtrl(req: Request, res: Response, next: NextFunction) {
  try {
    const saved = await createSolutionLot(req.body);
    res.status(201).json(saved);
  } catch (e) { next(e); }
}
export async function getSolutionLotCtrl(req: Request, res: Response, next: NextFunction) {
  try {
    const one = await getSolutionLot(req.params.id);
    if (!one) return res.status(404).json({ message: "SolutionLot não encontrado" });
    res.json(one);
  } catch (e) { next(e); }
}

export async function getTestStripLotsCtrl(req: Request, res: Response, next: NextFunction) {
  try {
    const { agent, q, includeExpired, limit } = req.query;
    const data = await listTestStripLots({
      agent: agent as any,
      q: q as string | undefined,
      includeExpired: includeExpired === "1",
      limit: limit ? Number(limit) : undefined,
    });
    res.json({ data });
  } catch (e) { next(e); }
}
export async function postTestStripLotCtrl(req: Request, res: Response, next: NextFunction) {
  try {
    const saved = await createTestStripLot(req.body);
    res.status(201).json(saved);
  } catch (e) { next(e); }
}
export async function getTestStripLotCtrl(req: Request, res: Response, next: NextFunction) {
  try {
    const one = await getTestStripLot(req.params.id);
    if (!one) return res.status(404).json({ message: "TestStripLot não encontrado" });
    res.json(one);
  } catch (e) { next(e); }
}
