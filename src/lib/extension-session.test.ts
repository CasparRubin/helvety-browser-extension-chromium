import { isJwtWithinMaxLifetime } from "@helvety/shared/jwt-session-lifetime";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ensureExtensionAuthReady,
  hasNoAuthenticatedUser,
  resolveVerifiedExtensionSession,
} from "./extension-session";
import { hasValidExtensionWeeklyOtpAnchor } from "./extension-weekly-otp-anchor";

import type { ExtensionSupabaseClient } from "./extension-supabase";

vi.mock("./extension-weekly-otp-anchor", () => ({
  hasValidExtensionWeeklyOtpAnchor: vi.fn(),
}));

vi.mock("@helvety/shared/jwt-session-lifetime", () => ({
  isJwtWithinMaxLifetime: vi.fn(() => true),
}));

type MockAuthOptions = {
  getUser: {
    user: { id: string; email?: string } | null;
    error?: Error | null;
  };
  getSession?: {
    session: { access_token: string; user: { id: string } } | null;
  };
  refreshSession?: {
    session: { user: { id: string } } | null;
    error?: Error | null;
  };
};

function mockSupabase(options: MockAuthOptions): ExtensionSupabaseClient {
  const getUser = vi.fn().mockResolvedValue({
    data: { user: options.getUser.user },
    error: options.getUser.error ?? null,
  });
  const getSession = vi.fn().mockResolvedValue({
    data: {
      session: options.getSession?.session ?? null,
    },
    error: null,
  });
  const refreshSession = vi.fn().mockResolvedValue({
    data: {
      session: options.refreshSession?.session ?? null,
    },
    error: options.refreshSession?.error ?? null,
  });
  const signOut = vi.fn().mockResolvedValue({ error: null });
  return {
    auth: { getUser, getSession, refreshSession, signOut },
  } as unknown as ExtensionSupabaseClient;
}

describe("extension-session", () => {
  afterEach(() => {
    vi.mocked(hasValidExtensionWeeklyOtpAnchor).mockReset();
    vi.mocked(isJwtWithinMaxLifetime).mockReset();
    vi.mocked(isJwtWithinMaxLifetime).mockReturnValue(true);
  });

  it("resolveVerifiedExtensionSession returns session after getUser, JWT check, and OTP anchor", async () => {
    vi.mocked(hasValidExtensionWeeklyOtpAnchor).mockResolvedValue(true);
    const supabase = mockSupabase({
      getUser: { user: { id: "u1", email: "a@b.c" } },
      getSession: {
        session: { access_token: "tok", user: { id: "u1" } },
      },
    });

    const result = await resolveVerifiedExtensionSession(supabase);
    expect(result).toEqual({
      ok: true,
      session: { userId: "u1", email: "a@b.c", accessToken: "tok" },
    });
    expect(supabase.auth.getUser).toHaveBeenCalled();
    expect(isJwtWithinMaxLifetime).toHaveBeenCalledWith(
      "tok",
      expect.any(Number)
    );
  });

  it("resolveVerifiedExtensionSession signs out when JWT exceeds max lifetime", async () => {
    vi.mocked(isJwtWithinMaxLifetime).mockReturnValue(false);
    const supabase = mockSupabase({
      getUser: { user: { id: "u1", email: "a@b.c" } },
      getSession: {
        session: { access_token: "expired-tok", user: { id: "u1" } },
      },
    });

    const result = await resolveVerifiedExtensionSession(supabase);
    expect(result).toEqual({ ok: false, signedOut: true });
    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(hasValidExtensionWeeklyOtpAnchor).not.toHaveBeenCalled();
  });

  it("resolveVerifiedExtensionSession signs out when weekly OTP anchor is missing", async () => {
    vi.mocked(hasValidExtensionWeeklyOtpAnchor).mockResolvedValue(false);
    const supabase = mockSupabase({
      getUser: { user: { id: "u1", email: "a@b.c" } },
      getSession: {
        session: { access_token: "tok", user: { id: "u1" } },
      },
    });

    const result = await resolveVerifiedExtensionSession(supabase);
    expect(result).toEqual({ ok: false, signedOut: true });
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it("ensureExtensionAuthReady rejects expired JWT before PostgREST reads", async () => {
    vi.mocked(isJwtWithinMaxLifetime).mockReturnValue(false);
    const supabase = mockSupabase({
      getUser: { user: { id: "u1" } },
      getSession: {
        session: { access_token: "expired-tok", user: { id: "u1" } },
      },
    });

    const result = await ensureExtensionAuthReady(supabase, "u1");
    expect(result).toEqual({
      ok: false,
      error: "Session expired. Sign out and sign in again.",
    });
  });

  it("hasNoAuthenticatedUser is true when getUser returns no user", async () => {
    const supabase = mockSupabase({
      getUser: { user: null },
    });
    await expect(hasNoAuthenticatedUser(supabase)).resolves.toBe(true);
  });

  it("ensureExtensionAuthReady rejects user id mismatch", async () => {
    const supabase = mockSupabase({
      getUser: { user: { id: "other" } },
    });
    const result = await ensureExtensionAuthReady(supabase, "u1");
    expect(result).toEqual({ ok: false, error: "Sign in again." });
  });
});
