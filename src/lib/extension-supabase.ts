import { createClient } from "@supabase/supabase-js";

import { getSupabasePublishableKey, getSupabaseUrl } from "./env";

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
 */
export function createExtensionSupabaseClient() {
  return createClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    auth: {
      storage: chromeLocalStorageAdapter,
      storageKey: STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}

/**
 *
 */
export type ExtensionSupabaseClient = ReturnType<
  typeof createExtensionSupabaseClient
>;
