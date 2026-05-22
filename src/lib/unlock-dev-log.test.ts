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

  it("does not log outside development", () => {
    vi.stubEnv("DEV", false);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    logUnlockFailure("passkey_params", { code: "PGRST301" });
    expect(warn).not.toHaveBeenCalled();
  });
});
