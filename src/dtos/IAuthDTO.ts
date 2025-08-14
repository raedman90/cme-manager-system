import { z } from 'zod'

export const AuthLoginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha muito curta')
})

export type AuthLoginDTO = z.infer<typeof AuthLoginSchema>
