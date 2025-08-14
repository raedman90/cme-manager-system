// src/controllers/materialHistoryController.ts
import type { Request, Response, NextFunction } from "express";
import { PrismaClient, EventSource } from "@prisma/client";
import { backfillMaterialFromLedger } from "../services/reconcileService";

const prisma = new PrismaClient();

// normaliza para "LEDGER" | "DB"
function normSource(x: any): "LEDGER" | "DB" {
  const v = String(x ?? "").toUpperCase();
  return v === "LEDGER" ? "LEDGER" : "DB";
}

/** Extrai CN de uma identidade x509::...; cai para o valor bruto se não bater */
function x509ToDisplay(id?: string | null): string | null {
  if (!id) return null;
  if (!id.startsWith("x509::")) return id;
  const subject = id.split("::")[1] ?? "";
  const m = subject.match(/CN=([^/]+)/);
  return m?.[1] ?? id;
}

export async function obterHistoricoMaterial(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: materialId } = req.params;

    // ---- filtros opcionais ----
    const etapa = (req.query.etapa as string | undefined)?.toUpperCase();
    const sourceRaw = (req.query.source as string | undefined)?.toUpperCase(); // "LEDGER" | "DB"
    const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : undefined;
    const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : undefined;

    // Cabeçalho (opcional)
    const mat = await prisma.material.findUnique({
      where: { id: materialId },
      select: { id: true, nome: true, codigo: true },
    });

    // Monta o "where" com filtros
    const where: any = { materialId };
    if (etapa) where.stage = etapa;
    if (sourceRaw === "LEDGER" || sourceRaw === "DB") {
      where.source = sourceRaw as EventSource;
    }
    if (startDate || endDate) {
      where.occurredAt = {};
      if (startDate) where.occurredAt.gte = startDate;
      if (endDate) where.occurredAt.lte = endDate;
    }

    // 1) Busca eventos
    let rows = await prisma.stageEvent.findMany({
      where,
      orderBy: { occurredAt: "asc" },
      select: {
        occurredAt: true,
        stage: true,
        operatorId: true,
        source: true,
        ledgerTxId: true,
        cycleId: true,
        batchId: true,
      },
    });

    // 2) Se vazio, tenta backfill do ledger e lê de novo (sem filtros de tempo/etapa para não mascarar)
    if (rows.length === 0) {
      await backfillMaterialFromLedger(materialId);
      rows = await prisma.stageEvent.findMany({
        where: { materialId },
        orderBy: { occurredAt: "asc" },
        select: {
          occurredAt: true,
          stage: true,
          operatorId: true,
          source: true,
          ledgerTxId: true,
          cycleId: true,
          batchId: true,
        },
      });
      // aplica filtros em memória (caso o cliente tenha enviado)
      rows = rows.filter((e) => {
        const okEtapa = etapa ? e.stage === etapa : true;
        const okSource =
          sourceRaw === "LEDGER" ? e.source === "LEDGER" :
          sourceRaw === "DB" ? e.source === "DB" : true;
        const t = e.occurredAt.getTime();
        const okStart = startDate ? t >= startDate.getTime() : true;
        const okEnd = endDate ? t <= endDate.getTime() : true;
        return okEtapa && okSource && okStart && okEnd;
      });
    }

    // 3) Mapeia para formato novo (EN) consumido pelo front
    const events = rows.map((e) => ({
      timestamp: e.occurredAt.toISOString(),
      stage: e.stage,                                 // "RECEBIMENTO" | ...
      operator: x509ToDisplay(e.operatorId) ?? null,  // crachá/nome amigável
      source: normSource(e.source),                   // "LEDGER" | "DB"
      txId: e.ledgerTxId ?? null,
      cycleId: e.cycleId,
      batchId: e.batchId ?? null,
    }));

    // 4) Compat (PT) para telas antigas
    const timeline = rows.map((e) => ({
      fonte: String(e.source).toLowerCase(),          // "ledger" | "db"
      etapa: e.stage,
      timestamp: e.occurredAt.toISOString(),
      responsavel: x509ToDisplay(e.operatorId) ?? null,
      loteId: e.batchId ?? null,
      materialId,
      cicloId: e.cycleId,
      txId: e.ledgerTxId ?? null,
    }));

    // (Opcional) pequeno resumo útil para páginas novas
    const last = rows[rows.length - 1];
    const summary = last
      ? {
          lastStage: last.stage,
          lastAt: last.occurredAt.toISOString(),
          counts: {
            total: rows.length,
            ledger: rows.filter((r) => r.source === "LEDGER").length,
            db: rows.filter((r) => r.source === "DB").length,
          },
        }
      : {
          lastStage: null,
          lastAt: null,
          counts: { total: 0, ledger: 0, db: 0 },
        };

    res.json({
      material: mat
        ? { id: mat.id, name: mat.nome, code: mat.codigo }
        : { id: materialId, name: null, code: null },
      materialId,
      events,      // 👈 usar isto no front novo
      timeline,    // 👈 compat
      summary,     // 👈 extra útil (não quebra clientes)
    });
  } catch (e) {
    next(e);
  }
}