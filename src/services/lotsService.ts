import { PrismaClient, DisinfectionAgent, ConcentrationUnit } from "@prisma/client";
const prisma = new PrismaClient();

export async function listSolutionLots(params: { agent?: DisinfectionAgent; q?: string; includeExpired?: boolean; limit?: number } = {}) {
  const where: any = { active: true };
  if (params.agent) where.agent = params.agent;
  if (!params.includeExpired) where.expiryAt = { gte: new Date() };
  if (params.q) {
    where.OR = [
      { lotNumber: { contains: params.q, mode: "insensitive" } },
      { brand: { contains: params.q, mode: "insensitive" } },
      { supplier: { contains: params.q, mode: "insensitive" } },
    ];
  }
  const data = await prisma.solutionLot.findMany({
    where,
    orderBy: [{ expiryAt: "asc" }, { createdAt: "desc" }],
    take: params.limit ?? 50,
  });
  return data;
}

export async function createSolutionLot(payload: {
  lotNumber: string;
  agent: DisinfectionAgent;
  expiryAt: string | Date;
  concentrationLabel?: string;
  unit?: ConcentrationUnit | null;
  minValue?: number | null;
  maxValue?: number | null;
  brand?: string | null;
  supplier?: string | null;
  notes?: string | null;
}) {
  return prisma.solutionLot.create({
    data: {
      lotNumber: payload.lotNumber,
      agent: payload.agent,
      expiryAt: new Date(payload.expiryAt),
      concentrationLabel: payload.concentrationLabel ?? null,
      unit: payload.unit ?? null,
      minValue: payload.minValue ?? null,
      maxValue: payload.maxValue ?? null,
      brand: payload.brand ?? null,
      supplier: payload.supplier ?? null,
      notes: payload.notes ?? null,
    },
  });
}

export async function getSolutionLot(id: string) {
  return prisma.solutionLot.findUnique({ where: { id } });
}

export async function listTestStripLots(params: { agent?: DisinfectionAgent; q?: string; includeExpired?: boolean; limit?: number } = {}) {
  const where: any = { active: true };
  if (params.agent) where.agent = params.agent;
  if (!params.includeExpired) where.expiryAt = { gte: new Date() };
  if (params.q) {
    where.OR = [
      { lotNumber: { contains: params.q, mode: "insensitive" } },
      { brand: { contains: params.q, mode: "insensitive" } },
      { notes: { contains: params.q, mode: "insensitive" } },
    ];
  }
  const data = await prisma.testStripLot.findMany({
    where,
    orderBy: [{ expiryAt: "asc" }, { createdAt: "desc" }],
    take: params.limit ?? 50,
  });
  return data;
}

export async function createTestStripLot(payload: {
  lotNumber: string;
  agent: DisinfectionAgent;
  expiryAt: string | Date;
  brand?: string | null;
  notes?: string | null;
}) {
  return prisma.testStripLot.create({
    data: {
      lotNumber: payload.lotNumber,
      agent: payload.agent,
      expiryAt: new Date(payload.expiryAt),
      brand: payload.brand ?? null,
      notes: payload.notes ?? null,
    },
  });
}

export async function getTestStripLot(id: string) {
  return prisma.testStripLot.findUnique({ where: { id } });
}
