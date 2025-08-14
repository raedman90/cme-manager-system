import { Router } from "express";
import { autenticarJWT } from "../middlewares/authMiddleware";
import { permitirRoles } from "../middlewares/roleMiddleware";
import { eventBus } from "../events/eventBus";

export const eventsRoutes = Router();

eventsRoutes.use(autenticarJWT);

eventsRoutes.get("/cycles", permitirRoles("ADMIN","TECH","AUDITOR"), (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const onEvt = (payload: any) => {
    res.write(`event: ${payload.type}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };
  eventBus.on("cycle:update", onEvt);

  req.on("close", () => {
    eventBus.off("cycle:update", onEvt);
    res.end();
  });
});
