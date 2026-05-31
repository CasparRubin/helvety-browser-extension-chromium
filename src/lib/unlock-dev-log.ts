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
 * Logs unlock diagnostics to the side panel console (`[helvety-unlock]`).
 * Passkey auth fetch failures are logged in production too (URL/status only, no secrets).
 */
export function logUnlockFailure(
  step: string,
  detail: Record<string, unknown>
): void {
  const logInProduction = step === "passkey_auth_fetch";
  if (!import.meta.env.DEV && !logInProduction) {
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
