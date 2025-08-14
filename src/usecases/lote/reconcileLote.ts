import { PrismaClient } from "@prisma/client";
import { reconcileMaterialUseCase } from "../material/reconcileMaterial";

const prisma = new PrismaClient();

export async function reconcileLoteUseCase(loteId: string) {
  const lote = await prisma.lote.findUnique({
    where: { id: loteId },
    include: { materiais: { select: { id: true, nome: true, codigo: true } } },
  });
  if (!lote) throw { status: 404, message: "Lote não encontrado" };

  const results = [];
  for (const m of lote.materiais) {
    results.push(await reconcileMaterialUseCase(m.id));
  }

  const exceeded = results.filter((r) => r.material.policy.exceeded).length;

  return {
    lote: { id: lote.id, name: (lote as any).nome ?? null, code: (lote as any).numero ?? null },
    items: results,
    summary: {
      count: results.length,
      exceeded,
    },
  };
}