import { afterEach, describe, expect, it, vi } from "vitest";

import { hasValidExtensionEmailProof } from "./extension-email-proof";
import {
  ensureExtensionAuthReady,
  hasNoAuthenticatedUser,
  resolveVerifiedExtensionSession,
} from "./extension-session";

import type { ExtensionSupabaseClient } from "./extension-supabase";

vi.mock("./extension-email-proof", () => ({
  hasValidExtensionEmailProof: vi.fn(),
}));

/**
 *
 */
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

/**
 *
 */
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
    vi.mocked(hasValidExtensionEmailProof).mockReset();
  });

  it("resolveVerifiedExtensionSession returns session after getUser and email proof", async () => {
    vi.mocked(hasValidExtensionEmailProof).mockResolvedValue(true);
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
