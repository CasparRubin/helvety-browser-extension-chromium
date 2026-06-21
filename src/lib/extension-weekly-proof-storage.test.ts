import { EXTENSION_WEEKLY_PROOF_STORAGE_KEY } from "@helvety/shared/weekly-proof-token";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearExtensionWeeklyProof,
  hasValidExtensionWeeklyProof,
  readExtensionWeeklyProof,
  writeExtensionWeeklyProof,
} from "./extension-weekly-proof-storage";

describe("extension-weekly-proof-storage", () => {
  beforeEach(() => {
    vi.stubGlobal("chrome", {
      storage: {
        local: {
          set: vi.fn(async () => undefined),
          get: vi.fn(async () => ({})),
          remove: vi.fn(async () => undefined),
        },
      },
    });
  });

  it("writes and reads weekly proof from chrome.storage.local", async () => {
    const token = "payload.sig";
    await writeExtensionWeeklyProof(token);
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      [EXTENSION_WEEKLY_PROOF_STORAGE_KEY]: token,
    });

    vi.mocked(chrome.storage.local.get).mockReturnValueOnce(
      Promise.resolve({
        [EXTENSION_WEEKLY_PROOF_STORAGE_KEY]: token,
      }) as never
    );
    await expect(readExtensionWeeklyProof()).resolves.toBe(token);
  });

  it("clears weekly proof on sign-out", async () => {
    await clearExtensionWeeklyProof();
    expect(chrome.storage.local.remove).toHaveBeenCalledWith(
      EXTENSION_WEEKLY_PROOF_STORAGE_KEY
    );
  });

  it("delegates validity check to shared weekly-proof-token", async () => {
    const userId = "11111111-1111-4111-8111-111111111111";
    const nowSeconds = 1_700_000_000;
    const payload = {
      v: 1 as const,
      userId,
      iat: nowSeconds,
      exp: nowSeconds + 604_800,
    };
    const payloadPart = Buffer.from(JSON.stringify(payload)).toString(
      "base64url"
    );
    const token = `${payloadPart}.sig`;
    vi.mocked(chrome.storage.local.get).mockReturnValueOnce(
      Promise.resolve({
        [EXTENSION_WEEKLY_PROOF_STORAGE_KEY]: token,
      }) as never
    );
    await expect(
      hasValidExtensionWeeklyProof(userId, nowSeconds)
    ).resolves.toBe(true);
  });
});
