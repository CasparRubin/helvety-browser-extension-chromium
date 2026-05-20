/**
 * Build-time public config (Vite `import.meta.env`).
 *
 * The extension does not read `.env` at runtime; values are inlined when you run
 * `vite build` / `vite dev`. Only Supabase client settings use `VITE_*` (same
 * idea as `NEXT_PUBLIC_*` on the web).
 */

/**
 *
 */
type SupabaseViteKey = "VITE_SUPABASE_URL" | "VITE_SUPABASE_PUBLISHABLE_KEY";

/**
 *
 */
function trimEnv(key: SupabaseViteKey): string | undefined {
  const value = import.meta.env[key];
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** Production auth zone (`basePath` /auth on helvety.com). */
export const HELVETY_AUTH_ORIGIN = "https://helvety.com/auth";

/** Production gateway for “Open in web” tab links. */
export const HELVETY_GATEWAY = "https://helvety.com";

/** Bearer JSON routes on the auth app (see `helvety/apps/auth/app/api/extension/`). */
export const EXTENSION_PASSKEY_PARAMS_PATH =
  "/api/extension/encryption/passkey-params" as const;
export const EXTENSION_PASSKEY_OPTIONS_PATH =
  "/api/extension/passkey/options" as const;
export const EXTENSION_PASSKEY_VERIFY_PATH =
  "/api/extension/passkey/verify" as const;

export const EXTENSION_AUTH_API_PATHS = [
  EXTENSION_PASSKEY_PARAMS_PATH,
  EXTENSION_PASSKEY_OPTIONS_PATH,
  EXTENSION_PASSKEY_VERIFY_PATH,
] as const;

/**
 *
 */
export function getSupabaseUrl(): string {
  const value = trimEnv("VITE_SUPABASE_URL");
  if (!value) {
    throw new Error(
      "Missing VITE_SUPABASE_URL. Set it in .env.local (or the shell environment for CI) to the same value as NEXT_PUBLIC_SUPABASE_URL in the Helvety apps."
    );
  }
  return value;
}

/**
 *
 */
export function getSupabasePublishableKey(): string {
  const value = trimEnv("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!value) {
    throw new Error(
      "Missing VITE_SUPABASE_PUBLISHABLE_KEY. Set it in .env.local (or CI) to the same value as NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in the Helvety apps."
    );
  }
  return value;
}

/**
 *
 */
export function getHelvetyAuthOrigin(): string {
  return HELVETY_AUTH_ORIGIN;
}

/**
 *
 */
export function getExtensionOrigin(): string {
  const id = chrome.runtime.id;
  return `chrome-extension://${id}`;
}

/**
 *
 */
export function buildHelvetyAuthApiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${HELVETY_AUTH_ORIGIN}${normalized}`;
}
