import { afterEach, describe, expect, it, vi } from "vitest";

import {
  HELVETY_SUPABASE_PUBLISHABLE_KEY,
  HELVETY_SUPABASE_URL,
} from "./config";
import { createExtensionSupabaseClient } from "./extension-supabase";

const createClientMock = vi.hoisted(() => vi.fn(() => ({ auth: {} })));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

vi.mock("@helvety/shared/supabase/fetch-with-timeout", () => ({
  browserFetchWithTimeout: vi.fn(),
}));

describe("createExtensionSupabaseClient", () => {
  afterEach(() => {
    createClientMock.mockClear();
    vi.unstubAllGlobals();
  });

  it("uses hardcoded production Supabase URL and publishable key", () => {
    vi.stubGlobal("chrome", {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({}),
          set: vi.fn().mockResolvedValue(undefined),
          remove: vi.fn().mockResolvedValue(undefined),
        },
      },
    });

    createExtensionSupabaseClient();

    expect(createClientMock).toHaveBeenCalledWith(
      HELVETY_SUPABASE_URL,
      HELVETY_SUPABASE_PUBLISHABLE_KEY,
      expect.objectContaining({
        global: expect.objectContaining({
          fetch: expect.any(Function),
        }),
        auth: expect.objectContaining({
          storageKey: "helvety-extension-supabase-auth",
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        }),
      })
    );
  });

  it("persists auth via chrome.storage.local adapter", async () => {
    const get = vi
      .fn()
      .mockResolvedValue({ "helvety-extension-supabase-auth": "x" });
    const set = vi.fn().mockResolvedValue(undefined);
    const remove = vi.fn().mockResolvedValue(undefined);
    const sessionSet = vi.fn().mockResolvedValue(undefined);
    const sessionRemove = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("chrome", {
      storage: {
        local: { get, set, remove },
        session: { set: sessionSet, remove: sessionRemove },
      },
    });

    createExtensionSupabaseClient();

    expect(createClientMock).toHaveBeenCalled();
    const call = createClientMock.mock.calls[0] as unknown as [
      string,
      string,
      {
        auth: {
          storage: {
            getItem: (key: string) => Promise<string | null>;
            setItem: (key: string, value: string) => Promise<void>;
            removeItem: (key: string) => Promise<void>;
          };
        };
      },
    ];
    const storage = call[2].auth.storage;

    await storage.getItem("helvety-extension-supabase-auth");
    expect(get).toHaveBeenCalledWith("helvety-extension-supabase-auth");

    await storage.setItem("k", "v");
    expect(set).toHaveBeenCalledWith({ k: "v" });

    await storage.setItem(
      "helvety-extension-supabase-auth",
      JSON.stringify({ access_token: "access-1" })
    );
    expect(sessionSet).toHaveBeenCalledWith({
      "helvety-extension-supabase-auth:access": "access-1",
    });

    await storage.removeItem("k");
    expect(remove).toHaveBeenCalledWith("k");
    expect(sessionRemove).toHaveBeenCalledWith(
      "helvety-extension-supabase-auth:access"
    );
  });
});
