import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function getMaterialByIdUseCase(id: string) {
  return await prisma.material.findUnique({ where: { id } })
}
