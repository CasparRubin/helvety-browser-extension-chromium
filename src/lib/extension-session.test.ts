import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  resolveVerifiedExtensionSession,
  ensureExtensionAuthReady,
} from "./extension-session";

import type { ExtensionSupabaseClient } from "./extension-supabase";

const hasValidExtensionWeeklyProof = vi.hoisted(() => vi.fn());
const readExtensionWeeklyProof = vi.hoisted(() => vi.fn());

vi.mock("./extension-weekly-proof-storage", () => ({
  hasValidExtensionWeeklyProof,
  readExtensionWeeklyProof,
}));

function mockSupabase(input: {
  user: { id: string; email?: string | null } | null;
  userError?: { message: string } | null;
  accessToken?: string | null;
  refreshSession?: { user: { id: string } } | null;
  refreshError?: { message: string } | null;
}): ExtensionSupabaseClient {
  const getUser = vi.fn(async () => {
    if (input.userError) {
      return { data: { user: null }, error: input.userError };
    }
    return { data: { user: input.user }, error: null };
  });

  const refreshSession = vi.fn(async () => {
    if (input.refreshError) {
      return { data: { session: null }, error: input.refreshError };
    }
    if (input.refreshSession) {
      return {
        data: {
          session: {
            user: input.refreshSession.user,
            access_token: "refreshed",
          },
        },
        error: null,
      };
    }
    return { data: { session: null }, error: { message: "no session" } };
  });

  const getSession = vi.fn(async () => ({
    data: {
      session: input.accessToken
        ? {
            access_token: input.accessToken,
            user: input.user ?? { id: "unknown" },
          }
        : null,
    },
    error: null,
  }));

  const signOut = vi.fn(async () => ({ error: null }));

  return {
    auth: { getUser, refreshSession, getSession, signOut },
  } as unknown as ExtensionSupabaseClient;
}

describe("resolveVerifiedExtensionSession", () => {
  beforeEach(() => {
    vi.mocked(hasValidExtensionWeeklyProof).mockReset();
    vi.mocked(readExtensionWeeklyProof).mockReset();
    vi.mocked(hasValidExtensionWeeklyProof).mockResolvedValue(true);
    vi.mocked(readExtensionWeeklyProof).mockResolvedValue("signed-proof");
  });

  it("returns session when getUser, weekly proof, and access token are valid", async () => {
    const supabase = mockSupabase({
      user: { id: "u1", email: "a@b.c" },
      accessToken: "tok",
    });

    const result = await resolveVerifiedExtensionSession(supabase);
    expect(result).toEqual({
      ok: true,
      session: {
        userId: "u1",
        email: "a@b.c",
        accessToken: "tok",
        weeklyProof: "signed-proof",
      },
    });
    expect(hasValidExtensionWeeklyProof).toHaveBeenCalledWith("u1");
  });

  it("signs out when weekly proof is missing or expired", async () => {
    vi.mocked(hasValidExtensionWeeklyProof).mockResolvedValue(false);
    const supabase = mockSupabase({
      user: { id: "u1", email: "a@b.c" },
      accessToken: "tok",
    });

    const result = await resolveVerifiedExtensionSession(supabase);
    expect(result).toEqual({ ok: false, signedOut: true });
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it("refreshes when getUser fails then resolves session", async () => {
    let userCalls = 0;
    const supabase = mockSupabase({
      user: { id: "u1", email: null },
      accessToken: "tok",
      refreshSession: { user: { id: "u1" } },
    });
    supabase.auth.getUser = vi.fn(async () => {
      userCalls += 1;
      if (userCalls === 1) {
        return { data: { user: null }, error: { message: "expired" } };
      }
      return { data: { user: { id: "u1", email: null } }, error: null };
    }) as unknown as ExtensionSupabaseClient["auth"]["getUser"];

    const result = await resolveVerifiedExtensionSession(supabase);
    expect(result.ok).toBe(true);
    expect(supabase.auth.refreshSession).toHaveBeenCalled();
  });

  it("signs out when access token is missing after getUser succeeds", async () => {
    const supabase = mockSupabase({
      user: { id: "u1", email: "a@b.c" },
      accessToken: null,
    });

    const result = await resolveVerifiedExtensionSession(supabase);
    expect(result).toEqual({ ok: false, signedOut: true });
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it("signs out when weekly proof read returns empty despite validity check", async () => {
    vi.mocked(hasValidExtensionWeeklyProof).mockResolvedValue(true);
    vi.mocked(readExtensionWeeklyProof).mockResolvedValue(null);
    const supabase = mockSupabase({
      user: { id: "u1", email: "a@b.c" },
      accessToken: "tok",
    });

    const result = await resolveVerifiedExtensionSession(supabase);
    expect(result).toEqual({ ok: false, signedOut: true });
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});

describe("ensureExtensionAuthReady", () => {
  beforeEach(() => {
    vi.mocked(hasValidExtensionWeeklyProof).mockReset();
    vi.mocked(readExtensionWeeklyProof).mockReset();
    vi.mocked(hasValidExtensionWeeklyProof).mockResolvedValue(true);
  });

  it("returns ok when getUser, access token, and weekly proof are valid", async () => {
    const supabase = mockSupabase({
      user: { id: "u1", email: "a@b.c" },
      accessToken: "tok",
    });

    const result = await ensureExtensionAuthReady(supabase, "u1");
    expect(result).toEqual({ ok: true });
    expect(hasValidExtensionWeeklyProof).toHaveBeenCalledWith("u1");
  });

  it("rejects when signed-in user does not match expected userId", async () => {
    const supabase = mockSupabase({
      user: { id: "other-user", email: "a@b.c" },
      accessToken: "tok",
    });

    const result = await ensureExtensionAuthReady(supabase, "u1");
    expect(result).toEqual({ ok: false, error: "Sign in again." });
  });

  it("rejects when access token is missing", async () => {
    const supabase = mockSupabase({
      user: { id: "u1", email: "a@b.c" },
      accessToken: null,
    });

    const result = await ensureExtensionAuthReady(supabase, "u1");
    expect(result).toEqual({
      ok: false,
      error: "Session expired. Sign out and sign in again.",
    });
  });

  it("rejects when weekly proof is missing or expired", async () => {
    vi.mocked(hasValidExtensionWeeklyProof).mockResolvedValue(false);
    const supabase = mockSupabase({
      user: { id: "u1", email: "a@b.c" },
      accessToken: "tok",
    });

    const result = await ensureExtensionAuthReady(supabase, "u1");
    expect(result).toEqual({
      ok: false,
      error: "Weekly email verification expired. Sign out and sign in again.",
    });
  });

  it("refreshes session when getUser fails then succeeds", async () => {
    let userCalls = 0;
    const supabase = mockSupabase({
      user: { id: "u1", email: "a@b.c" },
      accessToken: "tok",
      refreshSession: { user: { id: "u1" } },
    });
    supabase.auth.getUser = vi.fn(async () => {
      userCalls += 1;
      if (userCalls === 1) {
        return { data: { user: null }, error: { message: "expired" } };
      }
      return { data: { user: { id: "u1", email: "a@b.c" } }, error: null };
    }) as unknown as ExtensionSupabaseClient["auth"]["getUser"];

    const result = await ensureExtensionAuthReady(supabase, "u1");
    expect(result).toEqual({ ok: true });
    expect(supabase.auth.refreshSession).toHaveBeenCalled();
  });
});
