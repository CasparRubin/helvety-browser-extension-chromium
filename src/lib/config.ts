/**
 * Production client configuration for the Helvety Chromium extension.
 *
 * ## Safe to hardcode and commit
 *
 * Everything in this file is **public client configuration** — the same class of
 * values Helvety web apps expose as `NEXT_PUBLIC_SUPABASE_URL` and
 * `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and the same URLs any user can see in
 * helvety.com page source or network requests. Hardcoding them does **not** weaken
 * E2EE or user privacy:
 *
 * - **Supabase project URL** — not secret; identifies the API host.
 * - **Publishable key** (`sb_publishable_*` or legacy anon JWT) — designed for
 *   browsers and extensions. It only grants what Row Level Security allows for
 *   the signed-in user. It is **not** a service-role / secret key.
 * - **Helvety HTTPS origins** — public app entry points.
 *
 * Supabase documents publishable/anon keys as safe to embed in client apps.
 * Security comes from **RLS policies**, auth sessions, and (for E2EE) ciphertext
 * in the database — not from hiding these strings.
 *
 * ## Never put here
 *
 * Do **not** add `SUPABASE_SECRET_KEY`, `sb_secret_*`, `service_role`, signing
 * secrets, or any credential that must stay server-only. Those would jeopardize
 * security if shipped inside an extension bundle.
 */

/** Default production auth zone (`basePath` /auth on helvety.com). Public URL. */
export const DEFAULT_HELVETY_AUTH_ORIGIN = "https://helvety.com/auth";

/**
 * Resolves auth API base from optional `VITE_HELVETY_AUTH_ORIGIN` (trailing slash stripped).
 */
export function resolveHelvetyAuthOrigin(
  viteOrigin: string | undefined
): string {
  const trimmed = viteOrigin?.trim();
  if (!trimmed) {
    return DEFAULT_HELVETY_AUTH_ORIGIN;
  }
  return trimmed.replace(/\/$/, "");
}

/**
 * Auth API base. Override at build time with `VITE_HELVETY_AUTH_ORIGIN`
 * (only when intentionally targeting a non-production auth host).
 */
export const HELVETY_AUTH_ORIGIN = resolveHelvetyAuthOrigin(
  import.meta.env.VITE_HELVETY_AUTH_ORIGIN as string | undefined
);

/** Production gateway for “Open in web” tab links. Public URL. */
export const HELVETY_GATEWAY = "https://helvety.com";

/**
 * Helvety production Supabase project URL.
 * Public — same as `NEXT_PUBLIC_SUPABASE_URL` on helvety.com.
 */
export const HELVETY_SUPABASE_URL = "https://bkdzeihxzvrkndjvyzye.supabase.co";

/**
 * Helvety production Supabase publishable (anon) key.
 * Public — safe in client bundles; RLS enforces access per authenticated user.
 * Same role as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` on the web apps.
 */
export const HELVETY_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_ka1d0vKVzXnRWFVIMVhVGQ_5nZiseNI";

/**
 * Legacy path constant (documented for auth deploy). PRF params are read via Supabase,
 * not this route — see `extension-passkey-params.ts`.
 */
export const EXTENSION_PASSKEY_PARAMS_PATH =
  "/api/extension/encryption/passkey-params" as const;

/**
 * Bearer JSON routes for WebAuthn unlock on `HELVETY_AUTH_ORIGIN`.
 * Implemented in monorepo `apps/auth`. If these URLs return 404 or HTML instead of
 * JSON `ActionResponse`, the extension shows “Passkey API is not deployed…”.
 * JSON errors (allowlist, auth, server) from a live deploy are sanitized for end users.
 */
export const EXTENSION_PASSKEY_OPTIONS_PATH =
  "/api/extension/passkey/options" as const;
export const EXTENSION_PASSKEY_VERIFY_PATH =
  "/api/extension/passkey/verify" as const;

/** Public JSON routes for extension OTP sign-in (no Bearer). */
export const EXTENSION_OTP_SEND_PATH = "/api/extension/otp/send" as const;
export const EXTENSION_OTP_VERIFY_PATH = "/api/extension/otp/verify" as const;

/** Runtime auth HTTP routes (passkey unlock + OTP sign-in). */
export const EXTENSION_AUTH_API_PATHS = [
  EXTENSION_PASSKEY_OPTIONS_PATH,
  EXTENSION_PASSKEY_VERIFY_PATH,
  EXTENSION_OTP_SEND_PATH,
  EXTENSION_OTP_VERIFY_PATH,
] as const;

/** Current extension origin (`chrome-extension://<id>`). */
export function getExtensionOrigin(): string {
  const id = chrome.runtime.id;
  return `chrome-extension://${id}`;
}

/** Absolute URL for a path under `HELVETY_AUTH_ORIGIN`. */
export function buildHelvetyAuthApiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${HELVETY_AUTH_ORIGIN}${normalized}`;
}
