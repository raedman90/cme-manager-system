// src/dtos/ICycleDTO.ts
import { z } from 'zod';

export const CreateCycleSchema = z.object({
  materialId: z.string().uuid(),
  etapa: z.string().min(3),
  responsavel: z.string().min(3),
  observacoes: z.string().optional(),
  loteId: z.string().uuid().optional(), // << NOVO
});


export const CreateCycleLoteSchema = z.object({
  etapa: z.string().min(3),
  responsavel: z.string().min(3),
  observacoes: z.string().optional()
});

// NOVO:
export const UpdateStageSchema = z.object({
  etapa: z.string().min(3),
  responsavel: z.string().min(3),
  observacoes: z.string().optional(),
  force: z.boolean().optional()
});

export type CreateCycleDTO = z.infer<typeof CreateCycleSchema>;
export type CreateCycleLoteDTO = z.infer<typeof CreateCycleLoteSchema>;
export type UpdateStageDTO = z.infer<typeof UpdateStageSchema>;
