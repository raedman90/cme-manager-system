import { z } from 'zod'

export const CreateMaterialSchema = z.object({
  nome: z.string().min(3),
  categoria: z.string().min(3),
  tipo: z.enum(['crítico', 'semicrítico', 'não crítico']),
  validade: z.string().datetime().or(z.date())
})

export const UpdateMaterialSchema = CreateMaterialSchema.partial()

export type CreateMaterialDTO = z.infer<typeof CreateMaterialSchema>
export type UpdateMaterialDTO = z.infer<typeof UpdateMaterialSchema>
