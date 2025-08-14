import { PrismaClient } from '@prisma/client'
import { AuthLoginDTO } from '../../dtos/IAuthDTO'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const secret = process.env.JWT_SECRET as string

export async function loginUseCase(data: AuthLoginDTO) {
  const user = await prisma.user.findUnique({ where: { email: data.email } })
  if (!user || !(await bcrypt.compare(data.password, user.password))) {
    throw { name: 'UnauthorizedError', message: 'Credenciais inválidas' }
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    secret,
    { expiresIn: '1d' }
  )

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      role: user.role
    }
  }
}
