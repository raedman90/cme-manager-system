import { Router } from "express";
import { getAlerts, getAlertsCounts, patchAckAlert, patchResolveAlert, postSweepAlerts  } from "../controllers/alertsController";

const router = Router();
router.get("/", getAlerts);
router.get("/counts", getAlertsCounts);
router.patch("/:id/ack", patchAckAlert);
router.patch("/:id/resolve", patchResolveAlert);
router.post("/sweep", postSweepAlerts);
export default router;
