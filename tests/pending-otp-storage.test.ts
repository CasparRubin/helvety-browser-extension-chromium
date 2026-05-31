import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearPendingOtp,
  PENDING_OTP_TTL_MS,
  readPendingOtp,
  STORAGE_KEY_PENDING_OTP,
  writePendingOtp,
} from "../src/lib/pending-otp-storage";

describe("pending-otp-storage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("writes and reads pending OTP within TTL", async () => {
    const get = vi.fn().mockResolvedValue({
      [STORAGE_KEY_PENDING_OTP]: {
        email: "user@example.com",
        sentAt: Date.now(),
      },
    });
    const set = vi.fn().mockResolvedValue(undefined);
    const remove = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("chrome", {
      storage: { local: { get, set, remove } },
    });

    await writePendingOtp("user@example.com");

    expect(set).toHaveBeenCalledWith({
      [STORAGE_KEY_PENDING_OTP]: expect.objectContaining({
        email: "user@example.com",
        sentAt: expect.any(Number),
      }),
    });

    const record = await readPendingOtp();
    expect(record).toEqual(
      expect.objectContaining({ email: "user@example.com" })
    );
  });

  it("clears expired pending OTP on read", async () => {
    const get = vi.fn().mockResolvedValue({
      [STORAGE_KEY_PENDING_OTP]: {
        email: "user@example.com",
        sentAt: Date.now() - PENDING_OTP_TTL_MS - 1,
      },
    });
    const remove = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("chrome", {
      storage: {
        local: {
          get,
          set: vi.fn(),
          remove,
        },
      },
    });

    const record = await readPendingOtp();
    expect(record).toBeNull();
    expect(remove).toHaveBeenCalledWith(STORAGE_KEY_PENDING_OTP);
  });

  it("rejects malformed pending OTP records", async () => {
    const get = vi.fn().mockResolvedValue({
      [STORAGE_KEY_PENDING_OTP]: { email: "", sentAt: "not-a-number" },
    });
    vi.stubGlobal("chrome", {
      storage: {
        local: {
          get,
          set: vi.fn(),
          remove: vi.fn(),
        },
      },
    });

    const record = await readPendingOtp();
    expect(record).toBeNull();
  });

  it("clears pending OTP storage key", async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("chrome", {
      storage: {
        local: {
          get: vi.fn(),
          set: vi.fn(),
          remove,
        },
      },
    });

    await clearPendingOtp();
    expect(remove).toHaveBeenCalledWith(STORAGE_KEY_PENDING_OTP);
  });
});
