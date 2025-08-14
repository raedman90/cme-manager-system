import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function deleteMaterialUseCase(id: string) {
  return await prisma.material.delete({ where: { id } })
}
