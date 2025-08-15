import { EventEmitter } from "events";
import type { Alert, AlertComment } from "@prisma/client";
import { getAlertCounts } from "../services/alertsService";

export const alertsBus = new EventEmitter();

export type AlertsStreamEvent =
  | { type: "open"; alert: Alert }
  | { type: "ack"; alert: Alert }
  | { type: "resolve"; alert: Alert }
  | { type: "counts"; counts: { open: number; critical: number } }
  | { type: "comment"; comment: AlertComment };

export function emitAlertOpen(alert: Alert) {
  alertsBus.emit("alert", { type: "open", alert } as AlertsStreamEvent);
  emitCounts(); // mantém contadores em dia
}
export function emitAlertAck(alert: Alert) {
  alertsBus.emit("alert", { type: "ack", alert } as AlertsStreamEvent);
  emitCounts();
}
export function emitAlertResolve(alert: Alert) {
  alertsBus.emit("alert", { type: "resolve", alert } as AlertsStreamEvent);
  emitCounts();
}
export async function emitCounts() {
  const counts = await getAlertCounts();
  alertsBus.emit("alert", { type: "counts", counts } as AlertsStreamEvent);
}
export function emitAlertComment(comment: AlertComment) {
  alertsBus.emit("alert", { type: "comment", comment } as AlertsStreamEvent);
}