import { Router } from "express";
import { autenticarJWT } from "../middlewares/authMiddleware";
import { permitirRoles } from "../middlewares/roleMiddleware";
import { resolveByCodeController } from "../controllers/resolveController";

export const resolveRoutes = Router();

resolveRoutes.use(autenticarJWT);
resolveRoutes.get(
  "/resolve",
  permitirRoles("ADMIN", "TECH", "AUDITOR"),
  resolveByCodeController
);
