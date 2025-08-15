import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export type Readiness = { ok: boolean; reasons: string[]; details?: any };

async function latestStageEventId(cycleId: string, stage: string) {
  const evt = await prisma.stageEvent.findFirst({
    where: { cycleId, stage },
    orderBy: { occurredAt: "desc" },
    select: { id: true },
  });
  return evt?.id || null;
}

export async function checkReadyTo(
  cycleId: string,
  target: "ESTERILIZACAO" | "ARMAZENAMENTO"
): Promise<Readiness> {
  const reasons: string[] = [];

  if (target === "ESTERILIZACAO") {
    const sid = await latestStageEventId(cycleId, "DESINFECCAO");
    if (!sid) return { ok: false, reasons: ["Sem StageEvent de DESINFECCAO para este ciclo."] };
    const d = await prisma.disinfectionEvent.findUnique({ where: { stageEventId: sid } });
    if (!d) reasons.push("Metadados de DESINFECCAO não preenchidos.");
    if (d?.testStripResult === "FAIL") reasons.push("Fita teste REPROVADA na desinfecção.");
    if (d?.activationLevel === "INATIVO" || d?.activationLevel === "NAO_REALIZADO") {
      reasons.push("Solução desinfetante inativa ou teste não realizado.");
    }
    return { ok: reasons.length === 0, reasons, details: { disinfection: d } };
  }

  if (target === "ARMAZENAMENTO") {
    const sid = await latestStageEventId(cycleId, "ESTERILIZACAO");
    if (!sid) return { ok: false, reasons: ["Sem StageEvent de ESTERILIZACAO para este ciclo."] };
    const s = await prisma.sterilizationEvent.findUnique({ where: { stageEventId: sid } });
    if (!s) reasons.push("Metadados de ESTERILIZACAO não preenchidos.");
    if (s?.ci === "FAIL") reasons.push("Indicador químico (CI) reprovado.");
    if (s?.bi === "FAIL") reasons.push("Indicador biológico (BI) reprovado.");
    return { ok: reasons.length === 0, reasons, details: { sterilization: s } };
  }

  return { ok: true, reasons: [] };
}
