import { describe, expect, it } from "vitest";

import {
  extensionWeeklyOtpAnchorInternals,
  isExtensionWeeklyOtpAnchorValid,
} from "./extension-weekly-otp-anchor";

describe("extension-weekly-otp-anchor", () => {
  it("accepts anchor within the weekly policy window", () => {
    const now = Date.now();
    expect(
      isExtensionWeeklyOtpAnchorValid(
        { userId: "user-1", verifiedAt: now - 60_000 },
        "user-1",
        now
      )
    ).toBe(true);
  });

  it("rejects anchor for a different user", () => {
    const now = Date.now();
    expect(
      isExtensionWeeklyOtpAnchorValid(
        { userId: "user-1", verifiedAt: now - 60_000 },
        "user-2",
        now
      )
    ).toBe(false);
  });

  it("rejects anchor older than the weekly cap", () => {
    const now = Date.now();
    expect(
      isExtensionWeeklyOtpAnchorValid(
        {
          userId: "user-1",
          verifiedAt:
            now - extensionWeeklyOtpAnchorInternals.AUTH_MAX_LIFETIME_MS - 1,
        },
        "user-1",
        now
      )
    ).toBe(false);
  });
});
