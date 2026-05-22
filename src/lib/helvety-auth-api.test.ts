import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildHelvetyAuthApiUrl,
  EXTENSION_AUTH_API_PATHS,
  EXTENSION_PASSKEY_OPTIONS_PATH,
  HELVETY_AUTH_ORIGIN,
} from "./config";
import {
  helvetyAuthFetch,
  PASSKEY_API_NOT_DEPLOYED_MESSAGE,
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
    });

    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });
});
