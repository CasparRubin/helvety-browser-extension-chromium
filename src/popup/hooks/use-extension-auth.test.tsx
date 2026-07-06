// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useExtensionAuth } from "./use-extension-auth";

import type { ExtensionSupabaseClient } from "../../lib/extension-supabase";

const resolveSession = vi.hoisted(() => vi.fn());
const hasNoUser = vi.hoisted(() => vi.fn());

vi.mock("../../lib/extension-session", () => ({
  resolveVerifiedExtensionSession: (...args: unknown[]) =>
    resolveSession(...args),
  hasNoAuthenticatedUser: (...args: unknown[]) => hasNoUser(...args),
}));

vi.mock("../../lib/extension-weekly-proof-storage", () => ({
  clearExtensionWeeklyProof: vi.fn(),
  writeExtensionWeeklyProof: vi.fn(),
}));

vi.mock("../../lib/helvety-auth-api", () => ({
  sendExtensionOtp: vi.fn(),
  verifyExtensionOtp: vi.fn(),
}));

vi.mock("../../lib/pending-otp-storage", () => ({
  clearPendingOtp: vi.fn(),
  readPendingOtp: vi.fn(),
  writePendingOtp: vi.fn(),
}));

function createSupabaseMock(): ExtensionSupabaseClient {
  return {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      })),
      signOut: vi.fn(),
      setSession: vi.fn(),
    },
  } as unknown as ExtensionSupabaseClient;
}

describe("useExtensionAuth", () => {
  beforeEach(() => {
    resolveSession.mockReset();
    hasNoUser.mockReset();
    hasNoUser.mockResolvedValue(false);
  });

  it("loads the verified extension session on mount", async () => {
    const supabase = createSupabaseMock();
    resolveSession.mockResolvedValue({
      ok: true,
      session: {
        email: "ada@example.com",
        userId: "user-1",
        accessToken: "access-token",
        weeklyProof: "weekly-proof",
      },
    });

    const { result } = renderHook(() => useExtensionAuth(supabase));

    await waitFor(() => expect(result.current.userId).toBe("user-1"));

    expect(result.current.sessionEmail).toBe("ada@example.com");
    expect(result.current.accessToken).toBe("access-token");
    expect(result.current.weeklyProof).toBe("weekly-proof");
    expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
  });
});
