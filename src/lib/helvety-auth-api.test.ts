import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildHelvetyAuthApiUrl,
  EXTENSION_AUTH_API_PATHS,
  HELVETY_AUTH_ORIGIN,
} from "./env";
import { helvetyAuthFetch } from "./helvety-auth-api";

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

    const path = EXTENSION_AUTH_API_PATHS[1];
    const result = await helvetyAuthFetch<{ ok: boolean }>(path, {
      method: "POST",
      accessToken: "test-access-token",
      body: JSON.stringify({
        origin: "chrome-extension://abc",
        isMobile: false,
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
