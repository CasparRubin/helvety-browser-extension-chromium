import { describe, expect, it } from "vitest";

import {
  extensionEmailProofInternals,
  isExtensionEmailProofValid,
} from "./extension-email-proof";

describe("extension-email-proof", () => {
  it("accepts proof within the weekly policy window", () => {
    const now = Date.now();
    expect(
      isExtensionEmailProofValid(
        { userId: "user-1", verifiedAt: now - 60_000 },
        "user-1",
        now
      )
    ).toBe(true);
  });

  it("rejects proof for a different user", () => {
    const now = Date.now();
    expect(
      isExtensionEmailProofValid(
        { userId: "user-1", verifiedAt: now - 60_000 },
        "user-2",
        now
      )
    ).toBe(false);
  });

  it("rejects proof older than the weekly cap", () => {
    const now = Date.now();
    expect(
      isExtensionEmailProofValid(
        {
          userId: "user-1",
          verifiedAt:
            now - extensionEmailProofInternals.AUTH_MAX_LIFETIME_MS - 1,
        },
        "user-1",
        now
      )
    ).toBe(false);
  });
});
