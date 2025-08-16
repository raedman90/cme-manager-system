import { Router } from "express";
import {
  getAlerts,
  getAlertsCounts,
  getAlertsStream,
  patchAckAlert,
  patchResolveAlert,
  postSweepAlerts,
  getAlertComments,
  postAlertComment,
  getAlertsStatsCtrl
} from "../controllers/alertsController";
import { autenticarJWT } from "../middlewares/authMiddleware";
import { permitirRoles } from "../middlewares/roleMiddleware";
import { authNormalizeQueryToHeader } from "../middlewares/authNormalizeQueryToHeader";

const router = Router();
router.use(authNormalizeQueryToHeader);
router.use(autenticarJWT);

// Listagem e contadores
router.get("/", permitirRoles("ADMIN", "TECH", "AUDITOR"), getAlerts);
router.get("/counts", permitirRoles("ADMIN", "TECH", "AUDITOR"), getAlertsCounts);
router.get("/stats", permitirRoles("ADMIN", "TECH", "AUDITOR"), getAlertsStatsCtrl);
// SSE (stream) — mesmas roles de leitura
router.get("/stream", permitirRoles("ADMIN", "TECH", "AUDITOR"), getAlertsStream);
// Ações
router.patch("/:id/ack", permitirRoles("ADMIN", "TECH"), patchAckAlert);
router.patch("/:id/resolve", permitirRoles("ADMIN", "TECH"), patchResolveAlert);
// Comentários
router.get("/:id/comments", permitirRoles("ADMIN", "TECH", "AUDITOR"), getAlertComments);
router.post("/:id/comments", permitirRoles("ADMIN", "TECH", "AUDITOR"), postAlertComment);
// Varredura (restrito)
router.post("/sweep", permitirRoles("ADMIN"), postSweepAlerts);
export default router;
