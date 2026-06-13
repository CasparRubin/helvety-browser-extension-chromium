import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildHelvetyAuthApiUrl,
  DEFAULT_HELVETY_AUTH_ORIGIN,
  EXTENSION_AUTH_API_PATHS,
  EXTENSION_OTP_SEND_PATH,
  EXTENSION_OTP_VERIFY_PATH,
  EXTENSION_PASSKEY_OPTIONS_PATH,
  EXTENSION_PASSKEY_PARAMS_PATH,
  EXTENSION_PASSKEY_VERIFY_PATH,
  getExtensionOrigin,
  HELVETY_AUTH_ORIGIN,
  HELVETY_GATEWAY,
  HELVETY_SUPABASE_PUBLISHABLE_KEY,
  HELVETY_SUPABASE_URL,
  resolveHelvetyAuthOrigin,
} from "./config";

describe("production Helvety URLs", () => {
  it("defaults auth API base to helvety.com/auth when env override is unset", () => {
    expect(HELVETY_AUTH_ORIGIN).toBe("https://helvety.com/auth");
  });

  it("uses helvety.com for gateway deep links", () => {
    expect(HELVETY_GATEWAY).toBe("https://helvety.com");
  });
});

describe("resolveHelvetyAuthOrigin", () => {
  it("defaults to production when override is empty", () => {
    expect(resolveHelvetyAuthOrigin(undefined)).toBe(
      DEFAULT_HELVETY_AUTH_ORIGIN
    );
    expect(resolveHelvetyAuthOrigin("")).toBe(DEFAULT_HELVETY_AUTH_ORIGIN);
    expect(resolveHelvetyAuthOrigin("   ")).toBe(DEFAULT_HELVETY_AUTH_ORIGIN);
  });

  it("strips trailing slash from VITE_HELVETY_AUTH_ORIGIN", () => {
    expect(resolveHelvetyAuthOrigin("http://localhost:3001/auth/")).toBe(
      "http://localhost:3001/auth"
    );
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

describe("extension auth API paths", () => {
  it("documents legacy params path and runtime passkey + OTP routes", () => {
    expect(EXTENSION_PASSKEY_PARAMS_PATH).toBe(
      "/api/extension/encryption/passkey-params"
    );
    expect(EXTENSION_PASSKEY_OPTIONS_PATH).toBe(
      "/api/extension/passkey/options"
    );
    expect(EXTENSION_PASSKEY_VERIFY_PATH).toBe("/api/extension/passkey/verify");
    expect(EXTENSION_OTP_SEND_PATH).toBe("/api/extension/otp/send");
    expect(EXTENSION_OTP_VERIFY_PATH).toBe("/api/extension/otp/verify");
    expect(EXTENSION_AUTH_API_PATHS).toEqual([
      EXTENSION_PASSKEY_OPTIONS_PATH,
      EXTENSION_PASSKEY_VERIFY_PATH,
      EXTENSION_OTP_SEND_PATH,
      EXTENSION_OTP_VERIFY_PATH,
    ]);
    expect(EXTENSION_AUTH_API_PATHS).not.toContain(
      EXTENSION_PASSKEY_PARAMS_PATH
    );
  });
});

describe("buildHelvetyAuthApiUrl", () => {
  it("joins auth origin with runtime extension routes", () => {
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
