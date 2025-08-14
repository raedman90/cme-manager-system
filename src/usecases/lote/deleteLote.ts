import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export async function deleteLoteUseCase(id: string) {
  return await prisma.lote.delete({ where: { id } })
}
