import { PrismaClient } from '@prisma/client'
import { CreateMaterialDTO } from '../../dtos/IMaterialDTO'

const prisma = new PrismaClient()

export async function createMaterialUseCase(data: CreateMaterialDTO) {
  return await prisma.material.create({
    data: {
      ...data,
      validade: new Date(data.validade),
    },
  })
}
