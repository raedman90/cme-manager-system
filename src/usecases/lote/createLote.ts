import { PrismaClient } from '@prisma/client'
import { CreateLoteDTO } from '../../dtos/ILoteDTO'

const prisma = new PrismaClient()

export async function createLoteUseCase(data: CreateLoteDTO) {
  const exists = await prisma.lote.findUnique({ where: { numero: data.numero } });
  if (exists) throw { name: "ConflictError", message: "Número do lote já existe" };

  return prisma.lote.create({
    data: {
      numero: data.numero,
      nome: data.nome, // <- NOVO
      materiais: data.materiais ? { connect: data.materiais.map(id => ({ id })) } : undefined,
    },
    include: { materiais: true },
  });
}
