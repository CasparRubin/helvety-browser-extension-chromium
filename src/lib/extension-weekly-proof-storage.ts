import {
  EXTENSION_WEEKLY_PROOF_STORAGE_KEY,
  isWeeklyProofTokenPlausibleForUser,
} from "@helvety/shared/weekly-proof-token";

/** Returns chrome.storage.local when the extension API is available. */
function chromeStorageLocal(): typeof chrome.storage.local | null {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    return null;
  }
  return chrome.storage.local;
}

/** Persist the server-minted weekly proof after OTP verification. */
export async function writeExtensionWeeklyProof(
  weeklyProof: string
): Promise<void> {
  const storage = chromeStorageLocal();
  if (!storage) {
    return;
  }
  await storage.set({ [EXTENSION_WEEKLY_PROOF_STORAGE_KEY]: weeklyProof });
}

/** Clear the weekly proof (sign-out / account switch). */
export async function clearExtensionWeeklyProof(): Promise<void> {
  const storage = chromeStorageLocal();
  if (!storage) {
    return;
  }
  await storage.remove(EXTENSION_WEEKLY_PROOF_STORAGE_KEY);
}

/** Read the stored weekly proof token. */
export async function readExtensionWeeklyProof(): Promise<string | null> {
  const storage = chromeStorageLocal();
  if (!storage) {
    return null;
  }
  const result = await storage.get(EXTENSION_WEEKLY_PROOF_STORAGE_KEY);
  const raw = result[EXTENSION_WEEKLY_PROOF_STORAGE_KEY];
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

/** True when a stored weekly proof is structurally valid for the user. */
export async function hasValidExtensionWeeklyProof(
  userId: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): Promise<boolean> {
  const token = await readExtensionWeeklyProof();
  if (!token) {
    return false;
  }
  return isWeeklyProofTokenPlausibleForUser(token, userId, nowSeconds);
}
