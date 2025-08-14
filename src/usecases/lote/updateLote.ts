import { PrismaClient } from '@prisma/client'
import { UpdateLoteDTO } from '../../dtos/ILoteDTO'

const prisma = new PrismaClient()

export async function updateLoteUseCase(id: string, data: UpdateLoteDTO) {
  return prisma.lote.update({
    where: { id },
    data: {
      numero: data.numero,
      nome: data.nome, // <- NOVO
      materiais: data.materiais ? { set: [], connect: data.materiais.map(mid => ({ id: mid })) } : undefined,
    },
    include: { materiais: true },
  });
}
