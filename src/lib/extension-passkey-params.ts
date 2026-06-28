import { ensureExtensionAuthReady } from "./extension-session";
import { logUnlockFailure } from "./unlock-dev-log";

import type { UserPasskeyParams } from "@helvety/shared/types/entities";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

/**
 * Ciphertext/crypto metadata only — no `select('*')` (see `e2ee-data-select.ts`).
 * Includes `key_check_value` for wrong-passkey detection on unlock.
 */
export const PASSKEY_PARAMS_SELECT =
  "prf_salt, version, credential_id, key_check_value" as const;

/** Result of loading `user_passkey_params` for unlock. */
export type PasskeyParamsResult =
  { ok: true; params: UserPasskeyParams | null } | { ok: false; error: string };

/** PostgREST error fields used for user-facing unlock diagnostics. */
export type PasskeyParamsPostgrestError = Partial<
  Pick<PostgrestError, "code" | "message" | "details">
>;

/**
 * Maps a Supabase/PostgREST error to a user-facing message.
 * `PGRST116` (no row) is handled by the caller as `{ ok: true, params: null }`.
 */
export function mapPasskeyParamsError(
  error: PasskeyParamsPostgrestError
): string {
  const code = error.code ?? "";
  const message = error.message ?? "";

  if (code === "42703" || /does not exist/i.test(message)) {
    return "Encryption params schema mismatch. Update the extension or Supabase migration.";
  }

  if (
    code === "42501" ||
    /permission denied|row-level security/i.test(message)
  ) {
    return "Encryption params are not readable for this session. Check Supabase RLS for user_passkey_params.";
  }

  if (
    code === "PGRST301" ||
    code === "PGRST303" ||
    /\b401\b|unauthorized/i.test(message) ||
    /jwt expired|invalid jwt|not authenticated/i.test(message)
  ) {
    return "Session expired. Sign out and sign in again.";
  }

  const detail =
    code || message
      ? ` (${[code, message].filter(Boolean).join(": ").slice(0, 160)})`
      : "";

  return `Failed to load encryption params${detail}. Check the extension Network tab for user_passkey_params.`;
}

/** Ensures auth session is loaded and JWT is valid before PostgREST reads. */
async function ensureAuthReady(
  supabase: SupabaseClient,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const authReady = await ensureExtensionAuthReady(supabase, userId);
  if (!authReady.ok) {
    logUnlockFailure("passkey_params", {
      code: "jwt_invalid",
      message: authReady.error,
    });
    return authReady;
  }
  return { ok: true };
}

/**
 * Client read of `user_passkey_params` for the signed-in user.
 * Mirrors `fetchUserPasskeyParamsForUser` in the Helvety monorepo
 * (`packages/shared/src/user-passkey-params-db.ts` — server-only, not imported here).
 *
 * Returns crypto/unlock metadata only (PRF salt, KCV, credential id) — not entity
 * plaintext. Same rows the web app reads via `getPasskeyParams`.
 */
export async function fetchPasskeyParamsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<PasskeyParamsResult> {
  const authReady = await ensureAuthReady(supabase, userId);
  if (!authReady.ok) {
    return authReady;
  }

  let data: UserPasskeyParams | null = null;
  let error: PostgrestError | null = null;

  try {
    const result = await supabase
      .from("user_passkey_params")
      .select(PASSKEY_PARAMS_SELECT)
      .eq("user_id", userId)
      .single();
    data = result.data as UserPasskeyParams | null;
    error = result.error;
  } catch (caught) {
    const msg =
      caught instanceof Error ? caught.message : "Network request failed";
    if (/failed to fetch|network|blocked/i.test(msg)) {
      logUnlockFailure("passkey_params", { code: "network", message: msg });
      return {
        ok: false,
        error:
          "Network blocked. Allow *.supabase.co for this extension (check ad blockers).",
      };
    }
    logUnlockFailure("passkey_params", { code: "network", message: msg });
    if (import.meta.env.DEV) {
      return {
        ok: false,
        error: `Failed to load encryption params (network: ${msg}).`,
      };
    }
    return {
      ok: false,
      error:
        "Failed to load encryption params. Check the extension Network tab.",
    };
  }

  if (error) {
    if (error.code === "PGRST116") {
      if (/multiple/i.test(error.message ?? "")) {
        return {
          ok: false,
          error:
            "Multiple encryption param rows for this account. Contact support.",
        };
      }
      return { ok: true, params: null };
    }
    logUnlockFailure("passkey_params", {
      code: error.code,
      message: error.message,
    });
    return { ok: false, error: mapPasskeyParamsError(error) };
  }

  return { ok: true, params: data };
}
