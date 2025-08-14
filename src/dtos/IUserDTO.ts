import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  role: z.enum(["ADMIN", "TECH", "AUDITOR"]),
  badgeCode: z.string().min(6).max(32).regex(/^[A-Z0-9\-]+$/),
  password: z.string().min(8), // ⬅️ agora exigimos no create
});
export type CreateUserDTO = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().min(3).optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "TECH", "AUDITOR"]).optional(),
  badgeCode: z.string().min(6).max(32).regex(/^[A-Z0-9\-]+$/).optional(),
  password: z.string().min(8).optional(), // ⬅️ opcional no update
});
export type UpdateUserDTO = z.infer<typeof updateUserSchema>;
