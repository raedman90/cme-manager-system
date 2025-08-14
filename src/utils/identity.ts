// src/utils/identity.ts
export function x509ToDisplay(id?: string | null): string | null {
  if (!id) return null;
  if (!id.startsWith("x509::")) return id;
  // formato: x509::<SUBJECT>::<ISSUER>
  const parts = id.split("::");
  const subject = parts[1] ?? "";
  const m = subject.match(/CN=([^/]+)/);
  return m?.[1] ?? id;
}
