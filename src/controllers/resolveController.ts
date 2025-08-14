import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function resolveByCodeController(req: Request, res: Response) {
  const code = String(req.query.code || "").trim();
  if (!code) return res.status(400).json({ error: "Parâmetro 'code' é obrigatório" });

  // Tenta material por codigo (etiqueta) ou id direto
  const material = await prisma.material.findFirst({
    where: { OR: [{ codigo: code }, { id: code }] },
    select: { id: true, codigo: true, nome: true },
  });
  if (material) {
    return res.json({
      type: "material",
      id: material.id,
      code: material.codigo,
      label: material.nome,
    });
  }

  // Tenta lote por numero (etiqueta) ou id direto
  const lote = await prisma.lote.findFirst({
    where: { OR: [{ numero: code }, { id: code }] },
    select: { id: true, numero: true, nome: true },
  });
  if (lote) {
    return res.json({
      type: "lote",
      id: lote.id,
      code: lote.numero,
      label: lote.nome,
    });
  }

  return res.status(404).json({ error: "Não encontrado" });
}
