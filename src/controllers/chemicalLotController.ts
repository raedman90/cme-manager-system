import { PrismaClient } from "@prisma/client";
import { Disinfectant } from "@prisma/client";
import { Request, Response, NextFunction } from "express";
import { z } from "zod";

const prisma = new PrismaClient();

const createSchema = z.object({
  type: z.nativeEnum(Disinfectant),
  lotCode: z.string().min(1),
  concentration: z.string().optional(),
  openedAt: z.string().datetime().optional(),
  expiryAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial().extend({ active: z.boolean().optional() });

export async function listChemicalLots(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(parseInt(String(req.query.page ?? "1")), 1);
    const perPage = Math.min(Math.max(parseInt(String(req.query.perPage ?? "20")), 1), 100);
    const type = req.query.type as Disinfectant | undefined;
    const active = req.query.active === undefined ? undefined : req.query.active === "true";
    const q = String(req.query.q ?? "").trim();

    const where: any = {};
    if (type) where.type = type;
    if (active !== undefined) where.active = active;
    if (q) where.OR = [
      { lotCode: { contains: q, mode: "insensitive" } },
      { concentration: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
    ];

    const [data, total] = await Promise.all([
      prisma.chemicalLot.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.chemicalLot.count({ where }),
    ]);

    res.json({ data, total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) });
  } catch (e) { next(e); }
}

export async function getChemicalLot(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const row = await prisma.chemicalLot.findUnique({ where: { id } });
    if (!row) return res.status(404).json({ message: "Lote químico não encontrado" });
    res.json(row);
  } catch (e) { next(e); }
}

export async function createChemicalLot(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createSchema.parse(req.body);
    const data: any = { ...parsed };
    if (data.openedAt) data.openedAt = new Date(data.openedAt);
    if (data.expiryAt) data.expiryAt = new Date(data.expiryAt);

    const row = await prisma.chemicalLot.create({ data });
    res.status(201).json(row);
  } catch (e) { next(e); }
}

export async function updateChemicalLot(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const parsed = updateSchema.parse(req.body);
    const data: any = { ...parsed };
    if (data.openedAt) data.openedAt = new Date(data.openedAt);
    if (data.expiryAt) data.expiryAt = new Date(data.expiryAt);

    const row = await prisma.chemicalLot.update({ where: { id }, data });
    res.json(row);
  } catch (e) { next(e); }
}

export async function deleteChemicalLot(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await prisma.chemicalLot.delete({ where: { id } });
    res.status(204).end();
  } catch (e) { next(e); }
}

export async function closeChemicalLot(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const row = await prisma.chemicalLot.update({ where: { id }, data: { active: false } });
    res.json(row);
  } catch (e) { next(e); }
}