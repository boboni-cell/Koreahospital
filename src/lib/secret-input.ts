export const MASKED_SECRET = "***已配置***";

export function resolveSecretInput(input: unknown, current = ""): string {
  const next = typeof input === "string" ? input.trim() : "";
  return next && next !== MASKED_SECRET ? next : current;
}
