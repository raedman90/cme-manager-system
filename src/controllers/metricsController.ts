import type { Request, Response, NextFunction } from "express";
import { PrismaClient, EventSource } from "@prisma/client";

const prisma = new PrismaClient();

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export async function getMetricsOverview(req: Request, res: Response, next: NextFunction) {
  try {
    const days = clamp(Number(req.query.days ?? 7), 1, 31);
    const now = new Date();
    const since = startOfDay(new Date(now.getTime() - (days - 1) * 86400000));
    const since24h = new Date(now.getTime() - 24 * 3600 * 1000);
    const today = startOfDay(now);

    // Mapeia crachás (badgeCode) → nome do usuário para melhorar os "recentes"
    const users = await prisma.user.findMany({ select: { badgeCode: true, name: true } });
    const badgeToName = new Map(users.map(u => [u.badgeCode, u.name]));

    // Totais simples
    const [materials, materialsActive, lotes, reprocSumAgg] = await Promise.all([
      prisma.material.count(),
      prisma.material.count({ where: { ativo: true } }),
      prisma.lote.count(),
      prisma.material.aggregate({ _sum: { reprocessamentos: true } }),
    ]);
    const reprocessTotal = Number(reprocSumAgg._sum.reprocessamentos ?? 0);

    // Eventos (StageEvent) dentro da janela
    const events = await prisma.stageEvent.findMany({
      where: { occurredAt: { gte: since } },
      select: {
        occurredAt: true,
        stage: true,
        source: true,
        operatorId: true,
        materialId: true,
        batchId: true,
      },
      orderBy: { occurredAt: "asc" },
    });

    // Fatiamento 24h (para cards/pizza)
    let db24h = 0, ledger24h = 0, events24h = 0, reprocess24h = 0;
    for (const e of events) {
      if (e.occurredAt >= since24h) {
        events24h++;
        if (e.source === "LEDGER") ledger24h++; else db24h++;
        if (e.stage === "ESTERILIZACAO") reprocess24h++;
      }
    }
    const ledgerShare24h = events24h ? ledger24h / events24h : 0;

    // Último evento vindo do Ledger
    const lastLedgerAgg = await prisma.stageEvent.aggregate({
      where: { source: EventSource.LEDGER },
      _max: { occurredAt: true },
    });
    const lastLedgerAt = lastLedgerAgg._max.occurredAt ?? null;

    // Contagem por etapa HOJE
    const stagesTodayAgg = await prisma.stageEvent.groupBy({
      by: ["stage"],
      where: { occurredAt: { gte: today } },
      _count: { stage: true },
    });
    const stagesToday: Record<string, number> = {};
    for (const r of stagesTodayAgg) stagesToday[r.stage] = r._count.stage;

    // Série por dia/etapa (empilhado): RECEBIMENTO/LAVAGEM/DESINFECCAO/ESTERILIZACAO/ARMAZENAMENTO
    const daysArr: Date[] = Array.from({ length: days }, (_, i) => new Date(startOfDay(new Date(since.getTime() + i * 86400000))));
    const seriesIndex = new Map<string, any>();
    const emptyDay = () => ({
      RECEBIMENTO: 0, LAVAGEM: 0, DESINFECCAO: 0, ESTERILIZACAO: 0, ARMAZENAMENTO: 0,
    });
    for (const d of daysArr) seriesIndex.set(isoDate(d), { date: isoDate(d), ...emptyDay() });
    for (const e of events) {
      const key = isoDate(startOfDay(e.occurredAt));
      const bucket = seriesIndex.get(key);
      if (!bucket) continue;
      if (bucket[e.stage] === undefined) bucket[e.stage] = 0;
      bucket[e.stage] += 1;
    }
    const series7d = daysArr.map(d => seriesIndex.get(isoDate(d)));

    // Top reprocessados (ranking simples pelo campo do Material)
    const topReprocessedDb = await prisma.material.findMany({
      orderBy: { reprocessamentos: "desc" },
      take: 5,
      select: { id: true, nome: true, codigo: true, reprocessamentos: true },
    });
    const topReprocessed = topReprocessedDb.map(m => ({
      materialId: m.id, name: m.nome, code: m.codigo, count: m.reprocessamentos,
    }));

    // Recentes (últimos StageEvent)
    const recentDb = await prisma.stageEvent.findMany({
      take: 12,
      orderBy: { occurredAt: "desc" },
      include: { Material: { select: { id: true, nome: true, codigo: true } } },
    });
    const recentEvents = recentDb.map(r => ({
      id: r.id,
      materialId: r.materialId,
      materialName: r.Material?.nome ?? null,
      materialCode: r.Material?.codigo ?? null,
      stage: r.stage,
      timestamp: r.occurredAt.toISOString(),
      source: r.source,
      operator: (r.operatorId && badgeToName.get(r.operatorId)) || r.operatorId || null,
      batchId: r.batchId ?? null,
    }));

    res.json({
      totals: {
        materials,
        materialsActive,
        lotes,
        reprocessTotal,
        reprocess24h,
        events24h,
        ledgerShare24h, // 0..1
      },
      stagesToday,            // { RECEBIMENTO: n, ... }
      sourceSplit24h: {       // para pizza
        LEDGER: ledger24h,
        DB: db24h,
      },
      series7d,               // [{ date, RECEBIMENTO, ... }]
      topReprocessed,         // [{ materialId, name, code, count }]
      recentEvents,           // últimos StageEvent
      lastLedgerAt,           // ISO | null
      generatedAt: now.toISOString(),
    });
  } catch (e) {
    next(e);
  }
}
