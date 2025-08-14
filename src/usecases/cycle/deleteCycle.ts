import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Remove somente no banco (não apaga no Fabric).
 * Se quiser deletar on-ledger, implemento o DeleteCycle no chaincode.
 */
export async function deleteCycleUseCase(id: string) {
  await prisma.cycle.delete({ where: { id } });
}
