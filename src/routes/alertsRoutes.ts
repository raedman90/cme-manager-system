import { Router } from "express";
import { getAlerts, getAlertsCounts, patchAckAlert, patchResolveAlert } from "../controllers/alertsController";

const router = Router();
router.get("/", getAlerts);
router.get("/counts", getAlertsCounts);
router.patch("/:id/ack", patchAckAlert);
router.patch("/:id/resolve", patchResolveAlert);
export default router;
