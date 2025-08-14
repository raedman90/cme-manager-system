import { z } from "zod";

export const CreateLoteSchema = z.object({
  numero: z.string().min(3, "Informe o código do lote"),
  nome:   z.string().min(2, "Informe o nome do lote"),
  materiais: z.array(z.string().uuid()).optional(), // ids de materiais para vincular
});
export type CreateLoteDTO = z.infer<typeof CreateLoteSchema>;

export const UpdateLoteSchema = z.object({
  numero: z.string().min(3).optional(),
  nome:   z.string().min(2).optional(),
  materiais: z.array(z.string().uuid()).optional(), // substitui a associação (set + connect)
});
export type UpdateLoteDTO = z.infer<typeof UpdateLoteSchema>;
