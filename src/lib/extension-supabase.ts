import { browserFetchWithTimeout } from "@helvety/shared/supabase/fetch-with-timeout";
import { createClient } from "@supabase/supabase-js";

import {
  HELVETY_SUPABASE_PUBLISHABLE_KEY,
  HELVETY_SUPABASE_URL,
} from "./config";

const STORAGE_KEY = "helvety-extension-supabase-auth";
const ACCESS_TOKEN_SESSION_KEY = `${STORAGE_KEY}:access`;

/**
 * Supabase auth storage for MV3:
 * - Refresh token + full session JSON in `chrome.storage.local` (survives restarts)
 * - Access token mirrored in `chrome.storage.session` (cleared when browser session ends)
 *
 * Threat model: local disk persistence of refresh tokens is standard for extensions;
 * RLS + JWT validation remain the server-side boundary. See extension README.
 */
const chromeSplitStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const result = await chrome.storage.local.get(key);
    const value = result[key];
    return typeof value === "string" ? value : null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await chrome.storage.local.set({ [key]: value });
    try {
      const parsed = JSON.parse(value) as { access_token?: unknown };
      if (typeof parsed.access_token === "string" && chrome.storage.session) {
        await chrome.storage.session.set({
          [ACCESS_TOKEN_SESSION_KEY]: parsed.access_token,
        });
      }
    } catch {
      // Ignore malformed session payloads; local store remains source of truth.
    }
  },
  removeItem: async (key: string): Promise<void> => {
    await chrome.storage.local.remove(key);
    await chrome.storage.session?.remove(ACCESS_TOKEN_SESSION_KEY);
  },
};

/**
 * Supabase browser client for the extension: session persisted in
 * `chrome.storage.local` (not the website cookie jar).
 *
 * Uses public URL + publishable key from `config.ts` (safe to ship — see file header).
 *
 * Resilience: shares the web browser client's fetch timeout so auth requests do
 * not hang indefinitely on flaky networks or after extension UI suspend/resume
 * cycles (mirrors `@helvety/shared/supabase/client`).
 */
export function createExtensionSupabaseClient() {
  return createClient(HELVETY_SUPABASE_URL, HELVETY_SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: browserFetchWithTimeout,
    },
    auth: {
      storage: chromeSplitStorageAdapter,
      storageKey: STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}

/** Supabase client type used by the side panel and unlock flow. */
export type ExtensionSupabaseClient = ReturnType<
  typeof createExtensionSupabaseClient
>;

/** @internal Test-only storage keys. */
export const extensionSupabaseStorageInternals = {
  STORAGE_KEY,
  ACCESS_TOKEN_SESSION_KEY,
};
