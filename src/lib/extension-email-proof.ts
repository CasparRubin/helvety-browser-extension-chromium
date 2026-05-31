import { AUTH_MAX_LIFETIME_MS } from "@helvety/shared/crypto";

const EXTENSION_EMAIL_PROOF_STORAGE_KEY =
  "helvety_extension_last_email_verified";

/** Weekly email-proof anchor stored in chrome.storage.local. */
export type ExtensionEmailProofRecord = Readonly<{
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

/** Persist weekly email proof after successful OTP verification. */
export async function writeExtensionEmailProof(
  userId: string,
  verifiedAt = Date.now()
): Promise<void> {
  const storage = chromeStorageLocal();
  if (!storage) {
    return;
  }
  const record: ExtensionEmailProofRecord = { userId, verifiedAt };
  await storage.set({ [EXTENSION_EMAIL_PROOF_STORAGE_KEY]: record });
}

/** Clear weekly email proof (sign-out / account switch). */
export async function clearExtensionEmailProof(): Promise<void> {
  const storage = chromeStorageLocal();
  if (!storage) {
    return;
  }
  await storage.remove(EXTENSION_EMAIL_PROOF_STORAGE_KEY);
}

/** Returns true when email proof is valid for the signed-in user. */
export function isExtensionEmailProofValid(
  record: ExtensionEmailProofRecord | null,
  userId: string,
  now = Date.now()
): boolean {
  if (record?.userId !== userId) {
    return false;
  }
  return now - record.verifiedAt <= AUTH_MAX_LIFETIME_MS;
}

/** Read weekly email proof from extension storage. */
export async function readExtensionEmailProof(): Promise<ExtensionEmailProofRecord | null> {
  const storage = chromeStorageLocal();
  if (!storage) {
    return null;
  }
  const result = await storage.get(EXTENSION_EMAIL_PROOF_STORAGE_KEY);
  const raw = result[EXTENSION_EMAIL_PROOF_STORAGE_KEY];
  if (
    !raw ||
    typeof raw !== "object" ||
    typeof (raw as ExtensionEmailProofRecord).userId !== "string" ||
    typeof (raw as ExtensionEmailProofRecord).verifiedAt !== "number"
  ) {
    return null;
  }
  return raw as ExtensionEmailProofRecord;
}

/** True when the user has verified email within the weekly policy window. */
export async function hasValidExtensionEmailProof(
  userId: string,
  now = Date.now()
): Promise<boolean> {
  const record = await readExtensionEmailProof();
  return isExtensionEmailProofValid(record, userId, now);
}

/** Test-only storage key surface. */
export const extensionEmailProofInternals = {
  EXTENSION_EMAIL_PROOF_STORAGE_KEY,
  AUTH_MAX_LIFETIME_MS,
};
