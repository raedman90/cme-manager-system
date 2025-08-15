import { PrismaClient } from "@prisma/client";
import { openAlertIfNotExists, resolveAlertsByKey } from "./alertsService";

const prisma = new PrismaClient();

export async function sweepStorageValidity(daysSoon = 3) {
  const now = new Date();
  const soon = new Date(now.getTime() + daysSoon * 24 * 60 * 60 * 1000);

  const rows = await prisma.storageEvent.findMany({
    where: { expiresAt: { not: null } },
    select: {
      stageEventId: true,
      expiresAt: true,
      stageEvent: { select: { cycleId: true } },
    },
  });

  for (const r of rows) {
    const cycleId = r.stageEvent.cycleId;
    const sid = r.stageEventId;
    const keyExpired = `STORAGE_EXPIRED:${cycleId}:${sid}`;
    const keySoon = `STORAGE_SOON:${cycleId}:${sid}`;

    if (!r.expiresAt) continue;
    if (r.expiresAt.getTime() < now.getTime()) {
      // expirado => abre CRITICAL, fecha "soon"
      await openAlertIfNotExists({
        key: keyExpired,
        kind: "STORAGE_EXPIRED",
        severity: "CRITICAL",
        title: "Validade expirada",
        message: `Pacote expirado em ${r.expiresAt.toISOString()}`,
        cycleId,
        stageEventId: sid,
        stage: "ARMAZENAMENTO",
        dueAt: r.expiresAt,
      });
      await resolveAlertsByKey(keySoon);
    } else if (r.expiresAt.getTime() <= soon.getTime()) {
      // vence em ≤ X dias => abre WARNING, fecha "expired"
      await openAlertIfNotExists({
        key: keySoon,
        kind: "STORAGE_EXPIRES_SOON",
        severity: "WARNING",
        title: "Validade próxima do vencimento",
        message: `Vence em ${r.expiresAt.toISOString()}`,
        cycleId,
        stageEventId: sid,
        stage: "ARMAZENAMENTO",
        dueAt: r.expiresAt,
      });
      await resolveAlertsByKey(keyExpired);
    } else {
      // fora das janelas => limpa ambos
      await resolveAlertsByKey(keySoon);
      await resolveAlertsByKey(keyExpired);
    }
  }
  return { ok: true, checked: rows.length, daysSoon };
}