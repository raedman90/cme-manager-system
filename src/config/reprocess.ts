// mapeie conforme sua realidade
export const REPROCESS_LIMITS: Record<string, number> = {
  CRITICO: 10,
  SEMICRITICO: 20,
  "SEMI CRITICO": 20,
  "SEMI-CRITICO": 20,
  "NÃO CRITICO": 30,
  "NAO CRITICO": 30,
  "NAO_CRITICO": 30,
};

export function getReprocessLimit(tipo?: string | null): number | null {
  if (!tipo) return null;
  const key = String(tipo).toUpperCase().trim();
  return REPROCESS_LIMITS[key] ?? null;
}

export function getReprocessPolicyStatus(count: number, limit: number | null) {
  if (limit == null) return { status: "unknown" as const, limit: null };
  if (count > limit) return { status: "exceeded" as const, limit };
  if (count >= Math.max(1, Math.floor(limit * 0.8))) return { status: "near" as const, limit }; // ≥80%
  return { status: "ok" as const, limit };
}
