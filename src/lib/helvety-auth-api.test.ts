import { afterEach, describe, expect, it, vi } from "vitest";

import * as config from "./config";
import {
  buildHelvetyAuthApiUrl,
  EXTENSION_AUTH_API_PATHS,
  EXTENSION_OTP_SEND_PATH,
  EXTENSION_OTP_VERIFY_PATH,
  EXTENSION_PASSKEY_OPTIONS_PATH,
  getExtensionOrigin,
  HELVETY_AUTH_ORIGIN,
} from "./config";
import {
  EXTENSION_ORIGIN_NOT_ALLOWLISTED_USER_ERROR,
  helvetyAuthFetch,
  helvetyPublicAuthFetch,
  PASSKEY_API_NOT_DEPLOYED_MESSAGE,
  sanitizeExtensionAuthError,
  sendExtensionOtp,
  verifyExtensionOtp,
} from "./helvety-auth-api";

describe("helvetyAuthFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("builds URL with leading slash, Bearer auth, and JSON content-type for POST bodies", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { ok: true } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const path = EXTENSION_PASSKEY_OPTIONS_PATH;
    const result = await helvetyAuthFetch<{ ok: boolean }>(path, {
      method: "POST",
      accessToken: "test-access-token",
      weeklyProof: "test-weekly-proof",
      body: JSON.stringify({
        origin: "chrome-extension://abc",
        isMobile: false,
        expectedUserId: "00000000-0000-4000-8000-000000000001",
      }),
    });

    expect(result).toEqual({ success: true, data: { ok: true } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(buildHelvetyAuthApiUrl(path));
    expect(url).toBe(`${HELVETY_AUTH_ORIGIN}${path}`);
    expect(init.method).toBe("POST");
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer test-access-token");
    expect(headers.get("X-Helvety-Weekly-Proof")).toBe("test-weekly-proof");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("prefixes path when missing leading slash", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: null }), {
        status: 200,
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await helvetyAuthFetch("api/x", {
      method: "GET",
      accessToken: "t",
      weeklyProof: "test-weekly-proof",
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(buildHelvetyAuthApiUrl("api/x"));
  });

  it("preserves server error message on 401", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ success: false, error: "Not authenticated" }),
        {
          status: 401,
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await helvetyAuthFetch("/api/x", {
      method: "GET",
      accessToken: "bad",
      weeklyProof: "test-weekly-proof",
    });

    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("normalizes vague 401 errors from invalid envelopes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: "Unexpected server response",
        }),
        { status: 401 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await helvetyAuthFetch("/api/x", {
      method: "GET",
      accessToken: "bad",
      weeklyProof: "test-weekly-proof",
    });

    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("normalizes Invalid server response on 401 to Not authenticated", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: "Invalid server response",
        }),
        { status: 401 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await helvetyAuthFetch("/api/x", {
      method: "GET",
      accessToken: "bad",
      weeklyProof: "test-weekly-proof",
    });

    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("normalizes parseActionResponse default 401 message to Not authenticated", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("<html>401</html>", {
        status: 401,
        headers: { "Content-Type": "text/html" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await helvetyAuthFetch("/api/x", {
      method: "GET",
      accessToken: "bad",
      weeklyProof: "test-weekly-proof",
    });

    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("maps 200 HTML Page not found on extension options to not deployed message", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("<!DOCTYPE html><html>Page not found</html>", {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await helvetyAuthFetch(EXTENSION_PASSKEY_OPTIONS_PATH, {
      method: "POST",
      accessToken: "token",
      weeklyProof: "test-weekly-proof",
      body: JSON.stringify({ origin: "chrome-extension://x" }),
    });

    expect(result).toEqual({
      success: false,
      error: PASSKEY_API_NOT_DEPLOYED_MESSAGE,
    });
  });

  it("maps 404 HTML to passkey API not deployed message", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("<!DOCTYPE html><html>404</html>", {
        status: 404,
        headers: { "Content-Type": "text/html" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await helvetyAuthFetch(EXTENSION_PASSKEY_OPTIONS_PATH, {
      method: "POST",
      accessToken: "token",
      weeklyProof: "test-weekly-proof",
      body: JSON.stringify({ origin: "chrome-extension://x" }),
    });

    expect(result).toEqual({
      success: false,
      error: PASSKEY_API_NOT_DEPLOYED_MESSAGE,
    });
  });

  it("passes through JSON 500 errors on passkey routes (not not-deployed)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: "Request to Helvety auth failed",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await helvetyAuthFetch(EXTENSION_PASSKEY_OPTIONS_PATH, {
      method: "POST",
      accessToken: "token",
      weeklyProof: "test-weekly-proof",
      body: JSON.stringify({ origin: "chrome-extension://x" }),
    });

    expect(result).toEqual({
      success: false,
      error: "Request to Helvety auth failed",
    });
  });

  it("sanitizes legacy allowlist errors from the auth server on passkey routes", async () => {
    const allowlistError =
      "Extension id is not allowlisted on helvety-auth (HELVETY_CHROME_EXTENSION_ORIGINS). Add the id from About → Extension ID on Vercel, then redeploy.";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: allowlistError }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await helvetyAuthFetch(EXTENSION_PASSKEY_OPTIONS_PATH, {
      method: "POST",
      accessToken: "token",
      weeklyProof: "test-weekly-proof",
      body: JSON.stringify({ origin: "chrome-extension://x" }),
    });

    expect(result).toEqual({
      success: false,
      error: EXTENSION_ORIGIN_NOT_ALLOWLISTED_USER_ERROR,
    });
  });

  it("sanitizeExtensionAuthError maps server allowlist copy", () => {
    expect(
      sanitizeExtensionAuthError(
        "Extension id is not allowlisted on helvety-auth (HELVETY_CHROME_EXTENSION_ORIGINS)."
      )
    ).toBe(EXTENSION_ORIGIN_NOT_ALLOWLISTED_USER_ERROR);
    expect(
      sanitizeExtensionAuthError(
        "Passkey API URL is misconfigured (auth origin must include /auth). Check About → Auth origin."
      )
    ).toBe(
      "Passkey API URL is misconfigured. Sign in at helvety.com or reinstall the extension."
    );
    expect(
      sanitizeExtensionAuthError(
        "Auth API URL is misconfigured (auth origin must include /auth). Check About → Auth origin."
      )
    ).toBe(
      "Auth API URL is misconfigured. Sign in at helvety.com or reinstall the extension."
    );
  });

  it("maps passkey HTML without /auth base path to misconfigured user error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("<!DOCTYPE html><html>gateway</html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(config, "buildHelvetyAuthApiUrl").mockReturnValue(
      `https://helvety.com${EXTENSION_PASSKEY_OPTIONS_PATH}`
    );

    const result = await helvetyAuthFetch(EXTENSION_PASSKEY_OPTIONS_PATH, {
      method: "POST",
      accessToken: "token",
      weeklyProof: "test-weekly-proof",
      body: JSON.stringify({ origin: "chrome-extension://x" }),
    });

    expect(result).toEqual({
      success: false,
      error:
        "Passkey API URL is misconfigured. Sign in at helvety.com or reinstall the extension.",
    });
  });

  it("maps 401 HTML on passkey routes to not deployed (gateway HTML)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("<!DOCTYPE html><html>401</html>", {
        status: 401,
        headers: { "Content-Type": "text/html" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await helvetyAuthFetch(EXTENSION_PASSKEY_OPTIONS_PATH, {
      method: "POST",
      accessToken: "token",
      weeklyProof: "test-weekly-proof",
      body: JSON.stringify({ origin: "chrome-extension://x" }),
    });

    expect(result).toEqual({
      success: false,
      error: PASSKEY_API_NOT_DEPLOYED_MESSAGE,
    });
  });

  it("includes status in non-401 failure when body has no ActionResponse error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("{}", {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await helvetyAuthFetch("/api/x", {
      method: "GET",
      accessToken: "token",
      weeklyProof: "test-weekly-proof",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("500");
    }
  });

  it("passes through POST body unchanged (including challengeEnvelope when caller provides it)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { userId: "u1" } }), {
        status: 200,
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const requestBody = {
      origin: "chrome-extension://abc",
      challengeEnvelope: "signed-envelope",
      credential: {
        id: "id",
        rawId: "raw",
        type: "public-key",
        response: {
          clientDataJSON: "a",
          authenticatorData: "b",
          signature: "c",
        },
      },
    };

    await helvetyAuthFetch("/api/extension/passkey/verify", {
      method: "POST",
      accessToken: "token",
      weeklyProof: "test-weekly-proof",
      body: JSON.stringify(requestBody),
    });

    const body = JSON.parse(
      String((fetchMock.mock.calls[0]?.[1] as RequestInit).body)
    ) as Record<string, unknown>;
    expect(body).toEqual(requestBody);
    expect(body).not.toHaveProperty("clientExtensionResults");
  });

  it("parses extension options ActionResponse with options and challengeEnvelope", async () => {
    const payload = {
      options: { challenge: "c", timeout: 60_000 },
      challengeEnvelope: "envelope",
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: payload }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await helvetyAuthFetch<typeof payload>(
      EXTENSION_PASSKEY_OPTIONS_PATH,
      {
        method: "POST",
        accessToken: "token",
        weeklyProof: "test-weekly-proof",
        body: JSON.stringify({
          origin: "chrome-extension://abc",
          isMobile: false,
          expectedUserId: "00000000-0000-4000-8000-000000000001",
        }),
      }
    );

    expect(result).toEqual({ success: true, data: payload });
  });

  it("omits Content-Type on GET without body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: null }), {
        status: 200,
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await helvetyAuthFetch(EXTENSION_AUTH_API_PATHS[0], {
      method: "GET",
      accessToken: "t",
      weeklyProof: "test-weekly-proof",
    });

    const headers = new Headers(
      (fetchMock.mock.calls[0]?.[1] as RequestInit).headers
    );
    expect(headers.get("Content-Type")).toBeNull();
    expect(headers.get("Authorization")).toBe("Bearer t");
  });

  it("falls back when 401 body omits error string", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ success: false }), { status: 401 })
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await helvetyAuthFetch("/api/x", {
      method: "GET",
      accessToken: "bad",
      weeklyProof: "test-weekly-proof",
    });

    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });
});

describe("helvetyPublicAuthFetch and extension OTP helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sendExtensionOtp posts attestation, email, and extension origin", async () => {
    vi.stubGlobal("chrome", { runtime: { id: "otp-test-extension" } });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, data: { codeSent: true } }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendExtensionOtp({
      email: "user@example.com",
      nonEUEEAConfirmed: true,
    });

    expect(result).toEqual({ success: true, data: { codeSent: true } });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(buildHelvetyAuthApiUrl(EXTENSION_OTP_SEND_PATH));
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBeNull();
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(JSON.parse(String(init.body))).toEqual({
      email: "user@example.com",
      nonEUEEAConfirmed: true,
      origin: getExtensionOrigin(),
    });
  });

  it("verifyExtensionOtp returns session payload for setSession", async () => {
    vi.stubGlobal("chrome", { runtime: { id: "otp-test-extension" } });
    const session = {
      access_token: "access-token",
      refresh_token: "refresh-token",
      expires_at: 1_700_000_000,
      user: { id: "user-id", email: "user@example.com" },
      weekly_proof: "signed-weekly-proof",
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: session }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyExtensionOtp({
      email: "user@example.com",
      code: "123456",
    });

    expect(result).toEqual({ success: true, data: session });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(buildHelvetyAuthApiUrl(EXTENSION_OTP_VERIFY_PATH));
    expect(JSON.parse(String(init.body))).toEqual({
      email: "user@example.com",
      code: "123456",
      origin: getExtensionOrigin(),
    });
  });

  it("maps OTP route HTML responses to auth API not deployed", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("<!DOCTYPE html><html>404</html>", {
        status: 404,
        headers: { "Content-Type": "text/html" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await helvetyPublicAuthFetch(EXTENSION_OTP_SEND_PATH, {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com" }),
    });

    expect(result).toEqual({
      success: false,
      error: "Auth API is not deployed on the Helvety auth server yet.",
    });
  });

  it("detects missing /auth base path for OTP routes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("<!DOCTYPE html><html>gateway</html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(config, "buildHelvetyAuthApiUrl").mockReturnValue(
      `https://helvety.com${EXTENSION_OTP_VERIFY_PATH}`
    );

    const result = await helvetyPublicAuthFetch(EXTENSION_OTP_VERIFY_PATH, {
      method: "POST",
      body: "{}",
    });

    expect(result).toEqual({
      success: false,
      error:
        "Auth API URL is misconfigured. Sign in at helvety.com or reinstall the extension.",
    });
  });

  it("sanitizes legacy allowlist errors from OTP public fetch", async () => {
    const allowlistError =
      "Extension id is not allowlisted on helvety-auth (HELVETY_CHROME_EXTENSION_ORIGINS). Add the id from About → Extension ID on Vercel, then redeploy.";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: allowlistError }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await helvetyPublicAuthFetch(EXTENSION_OTP_SEND_PATH, {
      method: "POST",
      body: JSON.stringify({
        email: "user@example.com",
        nonEUEEAConfirmed: true,
        origin: "chrome-extension://x",
      }),
    });

    expect(result).toEqual({
      success: false,
      error: EXTENSION_ORIGIN_NOT_ALLOWLISTED_USER_ERROR,
    });
  });

  it("passes through JSON OTP errors including rate limits", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ success: false, error: "Request rate limit reached" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await helvetyPublicAuthFetch(EXTENSION_OTP_SEND_PATH, {
      method: "POST",
      body: "{}",
    });

    expect(result).toEqual({
      success: false,
      error: "Request rate limit reached",
    });
  });

  it("does not treat non-passkey paths as passkey-not-deployed in helvetyAuthFetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("{}", {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await helvetyAuthFetch("/api/internal/other", {
      method: "GET",
      accessToken: "token",
      weeklyProof: "test-weekly-proof",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).not.toBe(PASSKEY_API_NOT_DEPLOYED_MESSAGE);
    }
  });
});
