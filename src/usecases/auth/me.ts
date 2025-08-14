import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function meUseCase(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
    }
  })

  if (!user) {
    throw { name: 'NotFoundError', message: 'Usuário não encontrado' }
  }

  return user
}
