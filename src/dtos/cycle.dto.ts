import { z } from "zod";

export const StageEnum = z.enum([
  "LIMPEZA",
  "INSPECAO",
  "EMBALAGEM",
  "AUTOCLAVE",
  "ARMAZENAMENTO",
  "DISTRIBUICAO"
]);

export const CreateCycleSchema = z.object({
  id: z.string().min(1),
  batchId: z.string().min(1),
  instrumentId: z.string().min(1),
  stage: StageEnum,
  timestamp: z.string().datetime(), // ISO-8601
  operator: z.string().min(1)
});

export type CreateCycleDTO = z.infer<typeof CreateCycleSchema>;

export const UpdateStageSchema = z.object({
  stage: StageEnum,
  timestamp: z.string().datetime(),
  operator: z.string().min(1)
});

export type UpdateStageDTO = z.infer<typeof UpdateStageSchema>;

export const ListByBatchSchema = z.object({
  batchId: z.string().min(1)
});

export type ListByBatchDTO = z.infer<typeof ListByBatchSchema>;
