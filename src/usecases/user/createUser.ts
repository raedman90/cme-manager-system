import { PrismaClient } from '@prisma/client'
import { CreateUserDTO } from '../../dtos/IUserDTO'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

export async function createUserUseCase(data: CreateUserDTO) {
  const userExist = await prisma.user.findUnique({ where: { email: data.email } })
  if (userExist) {
    throw { name: 'ConflictError', message: 'E-mail já cadastrado' }
  }

  const hashedPassword = await bcrypt.hash(data.password, 10)

  const user = await prisma.user.create({
    data: {
      ...data,
      password: hashedPassword
    }
  })

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  }
}
