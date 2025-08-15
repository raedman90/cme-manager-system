import { PrismaClient, AlertStatus, AlertSeverity, AlertKind } from "@prisma/client";
import { emitAlertOpen, emitAlertAck, emitAlertResolve, emitCounts } from "../events/alertsBus";
import { emitAlertComment } from "../events/alertsBus";
import { format as fmtTz } from "date-fns-tz";
import { addDays, eachDayOfInterval } from "date-fns";
const prisma = new PrismaClient();

export type OpenAlertInput = {
  key: string;
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  message?: string;
  cycleId?: string;
  materialId?: string;
  stageEventId?: string;
  stage?: string;
  dueAt?: Date | null;
  data?: any;
};

export async function openAlertIfNotExists(input: OpenAlertInput) {
  const found = await prisma.alert.findUnique({ where: { key: input.key } });
  if (found && found.status !== "RESOLVED") return found;
  // if exists but RESOLVED, re-open updating the record
  const alert = await prisma.alert.upsert({
    where: { key: input.key },
    update: {
      kind: input.kind,
      severity: input.severity,
      status: "OPEN",
      title: input.title,
      message: input.message,
      cycleId: input.cycleId,
      materialId: input.materialId,
      stageEventId: input.stageEventId,
      stage: input.stage,
      dueAt: input.dueAt ?? null,
      data: input.data ?? null,
      resolvedAt: null,
      ackedAt: null,
      ackedBy: null,
    },
    create: {
      key: input.key,
      kind: input.kind,
      severity: input.severity,
      status: "OPEN",
      title: input.title,
      message: input.message,
      cycleId: input.cycleId,
      materialId: input.materialId,
      stageEventId: input.stageEventId,
      stage: input.stage,
      dueAt: input.dueAt ?? null,
      data: input.data ?? null,
    },
  });
  emitAlertOpen(alert);
  return alert;
}

export async function resolveAlertsByKey(prefixOrKey: string) {
  // permite prefixo (resolve vários de uma vez) ou key exata
  const res = await prisma.alert.updateMany({
    where: {
      key: { startsWith: prefixOrKey },
      status: { in: ["OPEN", "ACKED"] },
    },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });
  if (res.count > 0) await emitCounts();
}

export async function resolveAlertsByStageEvent(stageEventId: string) {
  await prisma.alert.updateMany({
    where: { stageEventId, status: { in: ["OPEN", "ACKED"] } },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });
}

export async function ackAlert(id: string, userId?: string) {
  const alert = await prisma.alert.update({
    where: { id },
    data: { status: "ACKED", ackedAt: new Date(), ackedBy: userId ?? null },
  });
  emitAlertAck(alert);
  return alert;
}
export async function resolveAlert(id: string) {
  const alert = await prisma.alert.update({
    where: { id },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });
  emitAlertResolve(alert);
  return alert;
}

export async function listAlerts(params: {
  status?: "OPEN" | "ACKED" | "RESOLVED";
  severity?: "INFO" | "WARNING" | "CRITICAL";
  q?: string;
  page?: number;
  perPage?: number;
}) {
  const page = Math.max(1, Number(params.page ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(params.perPage ?? 20)));
  const where: any = {};
  if (params.status) where.status = params.status;
  if (params.severity) where.severity = params.severity;
  if (params.q) {
    where.OR = [
      { title: { contains: params.q, mode: "insensitive" } },
      { message: { contains: params.q, mode: "insensitive" } },
    ];
  }
  const [total, rows] = await Promise.all([
    prisma.alert.count({ where }),
    prisma.alert.findMany({
      where,
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);
  return { data: rows, total, page, perPage };
}

export async function getAlertCounts() {
  const [open, critical] = await Promise.all([
    prisma.alert.count({ where: { status: "OPEN" } }),
    prisma.alert.count({ where: { status: "OPEN", severity: "CRITICAL" } }),
  ]);
  return { open, critical };
}
export async function hasOpenCriticalAlerts(cycleId: string) {
  const n = await prisma.alert.count({
    where: { cycleId, status: { in: ["OPEN", "ACKED"] }, severity: "CRITICAL" },
  });
  return n > 0;
}

// ---------- Comments ----------
export async function addAlertComment(alertId: string, text: string, author?: string | null) {
  if (!text || !text.trim()) {
    const e: any = new Error("Texto do comentário é obrigatório.");
    e.status = 400;
    throw e;
  }
  const comment = await prisma.alertComment.create({
    data: { alertId, text: text.trim(), author: author ?? null },
  });
  emitAlertComment(comment);
  return comment;
}

export async function listAlertComments(alertId: string, page = 1, perPage = 50) {
  const skip = Math.max(0, (page - 1) * perPage);
  const [data, total] = await Promise.all([
    prisma.alertComment.findMany({
      where: { alertId },
      orderBy: { createdAt: "asc" },
      skip,
      take: perPage,
    }),
    prisma.alertComment.count({ where: { alertId } }),
  ]);
  return { data, total, page, perPage };
}

// ---------- KPIs ----------
export async function getAlertsStats(args: { from?: string; to?: string; tz?: string }) {
  const tz = args.tz || "America/Fortaleza";
  const now = new Date();
  const from = args.from ? new Date(args.from) : addDays(now, -29);
  const to = args.to ? new Date(args.to) : now;

  // Busca em intervalo (createdAt)
  const rows = await prisma.alert.findMany({
    where: {
      createdAt: { gte: from, lte: to },
    },
    select: { id: true, kind: true, severity: true, createdAt: true, status: true },
    orderBy: { createdAt: "asc" },
  });

  // Bucket diário no TZ escolhido
  type DayAgg = { day: string; total: number; CRITICAL: number; WARNING: number; INFO: number };
  const byDayMap = new Map<string, DayAgg>();
  const days = eachDayOfInterval({ start: from, end: to });
  for (const d of days) {
    const day = fmtTz(d, "yyyy-MM-dd", { timeZone: tz });
    byDayMap.set(day, { day, total: 0, CRITICAL: 0, WARNING: 0, INFO: 0 });
  }

  const byKindMap = new Map<string, number>();
  let totals = { total: 0, CRITICAL: 0, WARNING: 0, INFO: 0 };

  for (const r of rows) {
    const day = fmtTz(r.createdAt, "yyyy-MM-dd", { timeZone: tz });
    const agg = byDayMap.get(day) || { day, total: 0, CRITICAL: 0, WARNING: 0, INFO: 0 };
    agg.total += 1;
    (agg as any)[r.severity] += 1;
    byDayMap.set(day, agg);
    totals.total += 1;
    (totals as any)[r.severity] += 1;
    byKindMap.set(r.kind, (byKindMap.get(r.kind) || 0) + 1);
  }

  const byDay = Array.from(byDayMap.values()).sort((a, b) => a.day.localeCompare(b.day));
  const byKind = Array.from(byKindMap.entries()).map(([kind, count]) => ({ kind, count }));

  return { tz, from: from.toISOString(), to: to.toISOString(), byDay, byKind, totals };
}