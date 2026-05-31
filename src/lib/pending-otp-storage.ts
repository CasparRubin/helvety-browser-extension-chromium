/** `chrome.storage.local` key for in-progress email OTP (panel closed mid-flow). */
export const STORAGE_KEY_PENDING_OTP = "helvetyExtensionPendingOtp" as const;

/** Align with Supabase Auth email OTP expiry (1 hour). */
export const PENDING_OTP_TTL_MS = 60 * 60 * 1000;

/** Pending email OTP saved when the side panel closes before verification. */
export type PendingOtpRecord = {
  email: string;
  sentAt: number;
};

/** Returns pending OTP if still within TTL; clears expired entries. */
export async function readPendingOtp(): Promise<PendingOtpRecord | null> {
  const result = await chrome.storage.local.get(STORAGE_KEY_PENDING_OTP);
  const raw = result[STORAGE_KEY_PENDING_OTP];
  if (
    !raw ||
    typeof raw !== "object" ||
    typeof (raw as PendingOtpRecord).email !== "string" ||
    (raw as PendingOtpRecord).email.length === 0 ||
    typeof (raw as PendingOtpRecord).sentAt !== "number"
  ) {
    return null;
  }
  const record = raw as PendingOtpRecord;
  if (Date.now() - record.sentAt > PENDING_OTP_TTL_MS) {
    await clearPendingOtp();
    return null;
  }
  return record;
}

/** Persists email OTP progress when the side panel closes mid-flow. */
export async function writePendingOtp(email: string): Promise<void> {
  const record: PendingOtpRecord = { email, sentAt: Date.now() };
  await chrome.storage.local.set({ [STORAGE_KEY_PENDING_OTP]: record });
}

/** Removes in-progress OTP state after verify or sign-out. */
export async function clearPendingOtp(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY_PENDING_OTP);
}
