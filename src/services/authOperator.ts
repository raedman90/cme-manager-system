import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

/** Valida operador TECH por id + senha. Retorna o usuário (TECH) se ok. */
export async function verifyOperatorOrThrow(operatorUserId?: string, senha?: string) {
  if (!operatorUserId || !senha) {
    const e: any = new Error("Responsável e senha são obrigatórios.");
    e.status = 400;
    throw e;
  }

  const user = await prisma.user.findUnique({ where: { id: operatorUserId } });
  if (!user || user.role !== Role.TECH) {
    const e: any = new Error("Responsável inválido (somente TECH).");
    e.status = 403;
    throw e;
  }

  const ok = await bcrypt.compare(senha, user.password);
  if (!ok) {
    const e: any = new Error("Senha do responsável incorreta.");
    e.status = 401;
    throw e;
  }

  return user; // use.user.badgeCode como 'responsavel'
}
