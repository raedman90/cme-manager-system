import { Router } from "express";
import { evaluateTransaction } from "../blockchain/fabricService";
import { autenticarJWT } from "../middlewares/authMiddleware";
import { permitirRoles } from "../middlewares/roleMiddleware";

export const cycleDebugRoutes = Router();
cycleDebugRoutes.use(autenticarJWT, permitirRoles("ADMIN","TECH","AUDITOR"));

cycleDebugRoutes.get("/:id/ledger", async (req, res, next) => {
  try {
    const out = await evaluateTransaction("getCycle", req.params.id);
    res.json({ ok: true, raw: out ? JSON.parse(out) : null });
  } catch (e) { next(e); }
});
