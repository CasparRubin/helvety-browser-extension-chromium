import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchPasskeyParamsForUser,
  mapPasskeyParamsError,
  PASSKEY_PARAMS_SELECT,
} from "./extension-passkey-params";

import type { SupabaseClient } from "@supabase/supabase-js";

/** Unsigned JWT with a recent `iat` for session lifetime tests. */
function testAccessToken(iatSeconds = Math.floor(Date.now() / 1000)): string {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({
    iat: iatSeconds,
    sub: "u1",
  })}.sig`;
}

/** PostgREST `.single()` result shape for tests. */
type SingleResult = {
  data: unknown;
  error: { code?: string; message?: string } | null;
};

/** Options for the Supabase client test stub. */
type MockSupabaseOptions = {
  single: SingleResult;
  session?: { user: { id: string } } | null;
  sessionError?: Error | null;
};

/** Minimal Supabase client stub for `from().select().eq().single()` + `auth.getUser()`. */
function mockSupabase(options: MockSupabaseOptions): SupabaseClient {
  const single = vi.fn().mockResolvedValue(options.single);
  const eq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  const sessionUser =
    options.session === undefined
      ? { id: "u1" }
      : options.session
        ? { id: options.session.user.id }
        : null;
  const getSession = vi.fn().mockResolvedValue({
    data: {
      session:
        options.session === undefined
          ? {
              user: { id: "u1" },
              access_token: testAccessToken(),
            }
          : options.session
            ? {
                user: { id: options.session.user.id },
                access_token: testAccessToken(),
              }
            : null,
    },
    error: options.sessionError ?? null,
  });
  const getUser = vi.fn().mockResolvedValue({
    data: { user: sessionUser },
    error: sessionUser ? null : { message: "no user" },
  });
  const refreshSession = vi.fn().mockResolvedValue({
    data: { session: sessionUser ? { user: sessionUser } : null },
    error: null,
  });
  return {
    from,
    auth: { getSession, getUser, refreshSession },
  } as unknown as SupabaseClient;
}

describe("PASSKEY_PARAMS_SELECT", () => {
  it("uses a narrow projection (no star select)", () => {
    expect(PASSKEY_PARAMS_SELECT).not.toMatch(/\*/);
    expect(PASSKEY_PARAMS_SELECT).toContain("prf_salt");
    expect(PASSKEY_PARAMS_SELECT).toContain("key_check_value");
    expect(PASSKEY_PARAMS_SELECT).not.toContain("user_id");
  });
});

describe("mapPasskeyParamsError", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns RLS-friendly error on permission denied", () => {
    expect(
      mapPasskeyParamsError({
        code: "42501",
        message: "permission denied for table",
      })
    ).toContain("not readable for this session");
  });

  it("returns session expired message for JWT errors", () => {
    expect(
      mapPasskeyParamsError({ code: "PGRST301", message: "JWT expired" })
    ).toBe("Session expired. Sign out and sign in again.");
  });

  it("returns generic fallback for unknown codes", () => {
    expect(mapPasskeyParamsError({ code: "XX000", message: "boom" })).toContain(
      "Failed to load encryption params"
    );
  });

  it("returns session expired for 401-style messages", () => {
    expect(mapPasskeyParamsError({ message: "401 Unauthorized" })).toBe(
      "Session expired. Sign out and sign in again."
    );
  });

  it("includes PostgREST code and message in the error text", () => {
    expect(mapPasskeyParamsError({ code: "XX000", message: "boom" })).toBe(
      "Failed to load encryption params (XX000: boom). Check the extension Network tab for user_passkey_params."
    );
  });
});

describe("fetchPasskeyParamsForUser", () => {
  it("returns sign-in message when session is missing", async () => {
    const supabase = mockSupabase({
      single: { data: null, error: null },
      session: null,
    });

    const result = await fetchPasskeyParamsForUser(supabase, "u1");

    expect(result).toEqual({
      ok: false,
      error: "Session expired. Sign out and sign in again.",
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("returns sign-in message when session user id mismatches", async () => {
    const supabase = mockSupabase({
      single: { data: null, error: null },
      session: { user: { id: "other" } },
    });

    const result = await fetchPasskeyParamsForUser(supabase, "u1");

    expect(result).toEqual({ ok: false, error: "Sign in again." });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("calls getUser before querying user_passkey_params", async () => {
    const getSession = vi.fn().mockResolvedValue({
      data: {
        session: {
          user: { id: "u1" },
          access_token: testAccessToken(),
        },
      },
      error: null,
    });
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "not found" },
    });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });
    const refreshSession = vi.fn();
    const supabase = {
      from,
      auth: { getSession, getUser, refreshSession },
    } as unknown as SupabaseClient;

    await fetchPasskeyParamsForUser(supabase, "u1");

    expect(getUser).toHaveBeenCalled();
    expect(getSession).toHaveBeenCalled();
    expect(from).toHaveBeenCalledWith("user_passkey_params");
  });

  it("queries user_passkey_params for the signed-in user", async () => {
    const params = {
      prf_salt: "c2FsdA==",
      version: 1,
      credential_id: "cred",
    };
    const supabase = mockSupabase({ single: { data: params, error: null } });

    await fetchPasskeyParamsForUser(supabase, "u1");

    expect(supabase.from).toHaveBeenCalledWith("user_passkey_params");
    const chain = (supabase.from as ReturnType<typeof vi.fn>).mock.results[0]
      ?.value as { select: ReturnType<typeof vi.fn> };
    expect(chain.select).toHaveBeenCalledWith(PASSKEY_PARAMS_SELECT);
    const eqChain = chain.select.mock.results[0]?.value as {
      eq: ReturnType<typeof vi.fn>;
    };
    expect(eqChain.eq).toHaveBeenCalledWith("user_id", "u1");
  });

  it("returns params row on success (narrow PASSKEY_PARAMS_SELECT shape)", async () => {
    const params = {
      credential_id: "cred",
      prf_salt: "c2FsdA==",
      version: 1,
    };
    const supabase = mockSupabase({ single: { data: params, error: null } });

    const result = await fetchPasskeyParamsForUser(supabase, "u1");

    expect(result).toEqual({ ok: true, params });
  });

  it("returns null params when row is missing (PGRST116)", async () => {
    const supabase = mockSupabase({
      single: {
        data: null,
        error: { code: "PGRST116", message: "not found" },
      },
    });

    const result = await fetchPasskeyParamsForUser(supabase, "u1");

    expect(result).toEqual({ ok: true, params: null });
  });

  it("returns RLS-friendly error on permission denied", async () => {
    const supabase = mockSupabase({
      single: {
        data: null,
        error: { code: "42501", message: "permission denied for table" },
      },
    });

    const result = await fetchPasskeyParamsForUser(supabase, "u1");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("not readable for this session");
    }
  });

  it("returns session expired message for JWT PostgREST errors", async () => {
    const supabase = mockSupabase({
      single: {
        data: null,
        error: { code: "PGRST301", message: "JWT expired" },
      },
    });

    const result = await fetchPasskeyParamsForUser(supabase, "u1");

    expect(result).toEqual({
      ok: false,
      error: "Session expired. Sign out and sign in again.",
    });
  });

  it("returns network blocked message when the query throws Failed to fetch", async () => {
    const single = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const getSession = vi.fn().mockResolvedValue({
      data: {
        session: {
          user: { id: "u1" },
          access_token: testAccessToken(),
        },
      },
      error: null,
    });
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });
    const refreshSession = vi.fn();
    const supabase = {
      from,
      auth: { getSession, getUser, refreshSession },
    } as unknown as SupabaseClient;

    const result = await fetchPasskeyParamsForUser(supabase, "u1");

    expect(result).toEqual({
      ok: false,
      error:
        "Network blocked. Allow *.supabase.co for this extension (check ad blockers).",
    });
  });

  it("returns mapped error for other database failures", async () => {
    const supabase = mockSupabase({
      single: {
        data: null,
        error: { code: "XX000", message: "boom" },
      },
    });

    const result = await fetchPasskeyParamsForUser(supabase, "u1");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("XX000: boom");
    }
  });
});
