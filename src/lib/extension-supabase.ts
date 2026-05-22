import { createClient } from "@supabase/supabase-js";

import {
  HELVETY_SUPABASE_PUBLISHABLE_KEY,
  HELVETY_SUPABASE_URL,
} from "./config";

const STORAGE_KEY = "helvety-extension-supabase-auth";

const chromeLocalStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const result = await chrome.storage.local.get(key);
    const value = result[key];
    return typeof value === "string" ? value : null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await chrome.storage.local.set({ [key]: value });
  },
  removeItem: async (key: string): Promise<void> => {
    await chrome.storage.local.remove(key);
  },
};

/**
 * Supabase browser client for the extension: session persisted in
 * `chrome.storage.local` (not the website cookie jar).
 *
 * Uses public URL + publishable key from `config.ts` (safe to ship — see file header).
 */
export function createExtensionSupabaseClient() {
  return createClient(HELVETY_SUPABASE_URL, HELVETY_SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: chromeLocalStorageAdapter,
      storageKey: STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}

/** Supabase client type used by the popup and unlock flow. */
export type ExtensionSupabaseClient = ReturnType<
  typeof createExtensionSupabaseClient
>;
