import { Router } from "express";
import { autenticarJWT } from "../middlewares/authMiddleware";
import { permitirRoles } from "../middlewares/roleMiddleware";
import { getMetricsOverview } from "../controllers/metricsController";

const router = Router();

router.use(autenticarJWT, permitirRoles("ADMIN", "TECH", "AUDITOR"));

router.get("/overview", getMetricsOverview);

export default router;
