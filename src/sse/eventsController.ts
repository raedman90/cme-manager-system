import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function streamEvents(req: Request, res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (type: string, data: any) => {
    res.write(`event: ${type}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // ping
  const ping = setInterval(() => send("ping", { t: Date.now() }), 25000);

  // poll simples de ciclos recentes (últimos 30s)
  let stop = false;
  const loop = async () => {
    let last = new Date(Date.now() - 30 * 1000);
    while (!stop) {
      const rows = await prisma.cycle.findMany({
        where: { timestamp: { gte: last } },
        orderBy: { timestamp: "asc" },
        take: 50,
      });
      if (rows.length) {
        last = rows[rows.length - 1].timestamp as Date;
        rows.forEach((r) => send("cycle", { id: r.id, etapa: r.etapa, materialId: r.materialId, timestamp: r.timestamp }));
      }
      await new Promise(r => setTimeout(r, 3000));
    }
  };
  loop();

  req.on("close", () => { stop = true; clearInterval(ping); res.end(); });
}