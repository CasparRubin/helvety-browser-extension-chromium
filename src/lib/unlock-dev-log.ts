/** Keys safe to log in dev (no user ids, tokens, PRF material, or entity plaintext). */
const SAFE_UNLOCK_LOG_KEYS = new Set([
  "code",
  "error",
  "hint",
  "message",
  "name",
  "path",
  "reason",
]);

/**
 * Logs unlock diagnostics in development builds only (side panel DevTools → `[helvety-unlock]`).
 * Production builds omit all console output from this helper.
 */
export function logUnlockFailure(
  step: string,
  detail: Record<string, unknown>
): void {
  if (!import.meta.env.DEV) {
    return;
  }
  const safe: Record<string, unknown> = { step };
  for (const [key, value] of Object.entries(detail)) {
    if (!SAFE_UNLOCK_LOG_KEYS.has(key)) {
      continue;
    }
    if (typeof value === "string" || typeof value === "number") {
      safe[key] = value;
    }
  }
  console.warn("[helvety-unlock]", safe);
}
