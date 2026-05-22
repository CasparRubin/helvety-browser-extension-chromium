/** Logs unlock diagnostics in development builds only (popup DevTools → `[helvety-unlock]`). */
export function logUnlockFailure(
  step: string,
  detail: Record<string, unknown>
): void {
  if (import.meta.env.DEV) {
    console.warn("[helvety-unlock]", { step, ...detail });
  }
}
