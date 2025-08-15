import { Router } from "express";
import { getAlerts, getAlertsCounts, getAlertsStream, patchAckAlert, patchResolveAlert, postSweepAlerts, getAlertComments, postAlertComment  } from "../controllers/alertsController";

const router = Router();
router.get("/", getAlerts);
router.get("/counts", getAlertsCounts);
router.get("/stream", getAlertsStream);
router.patch("/:id/ack", patchAckAlert);
router.patch("/:id/resolve", patchResolveAlert);
router.get("/:id/comments", getAlertComments);
router.post("/:id/comments", postAlertComment);
router.post("/sweep", postSweepAlerts);
export default router;
