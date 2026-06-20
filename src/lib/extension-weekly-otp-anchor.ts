import { AUTH_MAX_LIFETIME_MS } from "@helvety/shared/crypto";

const EXTENSION_WEEKLY_OTP_ANCHOR_STORAGE_KEY =
  "helvety_extension_last_email_verified";

/** Client-side weekly OTP re-auth anchor (not a cryptographic proof). */
export type ExtensionWeeklyOtpAnchorRecord = Readonly<{
  userId: string;
  verifiedAt: number;
}>;

/** Returns chrome.storage.local when the extension API is available. */
function chromeStorageLocal(): typeof chrome.storage.local | null {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    return null;
  }
  return chrome.storage.local;
}

/** Persist the weekly OTP anchor after successful OTP verification. */
export async function writeExtensionWeeklyOtpAnchor(
  userId: string,
  verifiedAt = Date.now()
): Promise<void> {
  const storage = chromeStorageLocal();
  if (!storage) {
    return;
  }
  const record: ExtensionWeeklyOtpAnchorRecord = { userId, verifiedAt };
  await storage.set({ [EXTENSION_WEEKLY_OTP_ANCHOR_STORAGE_KEY]: record });
}

/** Clear the weekly OTP anchor (sign-out / account switch). */
export async function clearExtensionWeeklyOtpAnchor(): Promise<void> {
  const storage = chromeStorageLocal();
  if (!storage) {
    return;
  }
  await storage.remove(EXTENSION_WEEKLY_OTP_ANCHOR_STORAGE_KEY);
}

/** Returns true when the OTP anchor is valid for the signed-in user. */
export function isExtensionWeeklyOtpAnchorValid(
  record: ExtensionWeeklyOtpAnchorRecord | null,
  userId: string,
  now = Date.now()
): boolean {
  if (record?.userId !== userId) {
    return false;
  }
  return now - record.verifiedAt <= AUTH_MAX_LIFETIME_MS;
}

/** Read the weekly OTP anchor from extension storage. */
export async function readExtensionWeeklyOtpAnchor(): Promise<ExtensionWeeklyOtpAnchorRecord | null> {
  const storage = chromeStorageLocal();
  if (!storage) {
    return null;
  }
  const result = await storage.get(EXTENSION_WEEKLY_OTP_ANCHOR_STORAGE_KEY);
  const raw = result[EXTENSION_WEEKLY_OTP_ANCHOR_STORAGE_KEY];
  if (
    !raw ||
    typeof raw !== "object" ||
    typeof (raw as ExtensionWeeklyOtpAnchorRecord).userId !== "string" ||
    typeof (raw as ExtensionWeeklyOtpAnchorRecord).verifiedAt !== "number"
  ) {
    return null;
  }
  return raw as ExtensionWeeklyOtpAnchorRecord;
}

/** True when the user completed OTP within the weekly policy window. */
export async function hasValidExtensionWeeklyOtpAnchor(
  userId: string,
  now = Date.now()
): Promise<boolean> {
  const record = await readExtensionWeeklyOtpAnchor();
  return isExtensionWeeklyOtpAnchorValid(record, userId, now);
}

/** Test-only storage key surface. */
export const extensionWeeklyOtpAnchorInternals = {
  EXTENSION_WEEKLY_OTP_ANCHOR_STORAGE_KEY,
  AUTH_MAX_LIFETIME_MS,
};
