import cron from "node-cron";
import { sweepStorageValidity } from "../services/alertsSweepService";

const TZ = process.env.ALERTS_TZ || "America/Fortaleza";
const DAYS_SOON = Number(process.env.STORAGE_SOON_DAYS || 3);

let scheduled = false;
export function initAlertsCron() {
  if (scheduled) return; // evita agendar 2x em hot-reload
  scheduled = true;
  cron.schedule(
    "0 8 * * *",
    async () => {
      try {
        await sweepStorageValidity(DAYS_SOON);
        // console.log(`[alerts] sweep ok (${DAYS_SOON}d)`);
      } catch (e) {
        // console.error("[alerts] sweep failed", e);
      }
    },
    { timezone: TZ }
  );
  // console.log(`[alerts] cron scheduled 08:00 ${TZ} (soon=${DAYS_SOON}d)`);
}