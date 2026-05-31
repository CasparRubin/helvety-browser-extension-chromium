import { afterEach, describe, expect, it, vi } from "vitest";

import { logUnlockFailure } from "./unlock-dev-log";

describe("logUnlockFailure", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("logs a warning in development", () => {
    vi.stubEnv("DEV", true);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    logUnlockFailure("passkey_params", { code: "PGRST301" });
    expect(warn).toHaveBeenCalledWith("[helvety-unlock]", {
      step: "passkey_params",
      code: "PGRST301",
    });
  });

  it("does not log user ids or other sensitive detail keys in development", () => {
    vi.stubEnv("DEV", true);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    logUnlockFailure("passkey_params", {
      userId: "secret-user",
      expectedUserId: "a",
      sessionUserId: "b",
      reason: "no_prf_salt",
    });
    expect(warn).toHaveBeenCalledWith("[helvety-unlock]", {
      step: "passkey_params",
      reason: "no_prf_salt",
    });
  });

  it("does not log outside development except passkey auth fetch failures", () => {
    vi.stubEnv("DEV", false);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    logUnlockFailure("passkey_params", { code: "PGRST301" });
    expect(warn).not.toHaveBeenCalled();
    logUnlockFailure("passkey_auth_fetch", {
      path: "https://helvety.com/auth/api/extension/passkey/options",
      error: "Request to Helvety auth failed",
      hint: "status=500",
    });
    expect(warn).toHaveBeenCalledOnce();
  });
});
