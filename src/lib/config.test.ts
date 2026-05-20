import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildHelvetyAuthApiUrl,
  EXTENSION_AUTH_API_PATHS,
  EXTENSION_PASSKEY_OPTIONS_PATH,
  EXTENSION_PASSKEY_PARAMS_PATH,
  EXTENSION_PASSKEY_VERIFY_PATH,
  getExtensionOrigin,
  HELVETY_AUTH_ORIGIN,
  HELVETY_GATEWAY,
  HELVETY_SUPABASE_PUBLISHABLE_KEY,
  HELVETY_SUPABASE_URL,
} from "./config";

describe("production Helvety URLs", () => {
  it("uses helvety.com/auth for passkey API base", () => {
    expect(HELVETY_AUTH_ORIGIN).toBe("https://helvety.com/auth");
  });

  it("uses helvety.com for gateway deep links", () => {
    expect(HELVETY_GATEWAY).toBe("https://helvety.com");
  });
});

describe("production Supabase (public client config, safe to hardcode)", () => {
  it("uses publishable key format (not a secret/service key)", () => {
    expect(HELVETY_SUPABASE_PUBLISHABLE_KEY).toMatch(/^sb_publishable_/);
    expect(HELVETY_SUPABASE_PUBLISHABLE_KEY).not.toMatch(
      /secret|service_role/i
    );
  });

  it("uses the Helvety production project URL and publishable key", () => {
    expect(HELVETY_SUPABASE_URL).toBe(
      "https://bkdzeihxzvrkndjvyzye.supabase.co"
    );
    expect(HELVETY_SUPABASE_PUBLISHABLE_KEY).toBe(
      "sb_publishable_ka1d0vKVzXnRWFVIMVhVGQ_5nZiseNI"
    );
  });
});

describe("extension passkey API paths", () => {
  it("declares the three Bearer routes under /api/extension", () => {
    expect(EXTENSION_PASSKEY_PARAMS_PATH).toBe(
      "/api/extension/encryption/passkey-params"
    );
    expect(EXTENSION_PASSKEY_OPTIONS_PATH).toBe(
      "/api/extension/passkey/options"
    );
    expect(EXTENSION_PASSKEY_VERIFY_PATH).toBe("/api/extension/passkey/verify");
    expect(EXTENSION_AUTH_API_PATHS).toEqual([
      EXTENSION_PASSKEY_PARAMS_PATH,
      EXTENSION_PASSKEY_OPTIONS_PATH,
      EXTENSION_PASSKEY_VERIFY_PATH,
    ]);
  });
});

describe("buildHelvetyAuthApiUrl", () => {
  it("joins auth origin with extension routes used by passkey unlock", () => {
    for (const path of EXTENSION_AUTH_API_PATHS) {
      expect(buildHelvetyAuthApiUrl(path)).toBe(
        `${HELVETY_AUTH_ORIGIN}${path}`
      );
    }
  });

  it("adds a leading slash when path is omitted", () => {
    expect(buildHelvetyAuthApiUrl("api/extension/passkey/options")).toBe(
      `${HELVETY_AUTH_ORIGIN}/api/extension/passkey/options`
    );
  });
});

describe("getExtensionOrigin", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns chrome-extension origin from runtime id", () => {
    vi.stubGlobal("chrome", { runtime: { id: "abcdefghijklmnopqrstuvwxyz" } });
    expect(getExtensionOrigin()).toBe(
      "chrome-extension://abcdefghijklmnopqrstuvwxyz"
    );
  });
});
