import { PrismaClient } from "@prisma/client";
import { evaluateTransaction } from "../../blockchain/fabricService";

const prisma = new PrismaClient();

export async function getCycleByIdUseCase(cycleId: string) {
  try {
    const fabricData = await evaluateTransaction("getCycle", cycleId);
    if (fabricData) return { origem: "fabric", dados: JSON.parse(fabricData) };
  } catch (err) {
    console.warn("⚠️ Fabric offline ou ciclo não encontrado no blockchain:", err);
  }

  const ciclo = await prisma.cycle.findUnique({ where: { id: cycleId } });
  if (!ciclo) throw { name: "NotFoundError", message: "Ciclo não encontrado" };
  return { origem: "banco", dados: ciclo };
}
