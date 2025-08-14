import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

type ListCyclesArgs = {
  loteId?: string;
  materialId?: string;
  etapa?: string;
  q?: string;
};

export async function listCyclesUseCase(args: ListCyclesArgs = {}) {
  const { loteId, materialId, etapa, q } = args;

  const where: any = {};
  if (materialId) where.materialId = materialId;
  if (etapa) where.etapa = etapa.toUpperCase();
  if (loteId) where.material = { loteId };

  if (q && q.trim()) {
    where.OR = [
      { responsavel: { contains: q, mode: "insensitive" } },
      { material: { nome: { contains: q, mode: "insensitive" } } },
      { material: { codigo: { contains: q, mode: "insensitive" } } },
      { lote: { numero: { contains: q, mode: "insensitive" } } },
    ];
  }

  const rows = await prisma.cycle.findMany({
    where,
    include: {
      material: { select: { id: true, nome: true, codigo: true } },
      lote: { select: { id: true, numero: true, nome: true } },
    },
    orderBy: { timestamp: "desc" },
  });

  // Mapeia extras que o front lê direto
  return rows.map((r) => ({
    ...r,
    materialName: r.material?.nome ?? null,
    materialCode: r.material?.codigo ?? null,
    loteNumero: r.lote?.numero ?? null,
    loteNome: r.lote?.nome ?? null,
  }));
}
