import { PrismaClient } from '@prisma/client'
import { UpdateMaterialDTO } from '../../dtos/IMaterialDTO'

const prisma = new PrismaClient()

export async function updateMaterialUseCase(id: string, data: UpdateMaterialDTO) {
  return await prisma.material.update({
    where: { id },
    data: {
      ...data,
      validade: data.validade ? new Date(data.validade) : undefined,
    },
  })
}
