import { shouldForceHardLogout } from "@helvety/shared/auth-errors";

import { hasValidExtensionEmailProof } from "./extension-email-proof";

import type { ExtensionSupabaseClient } from "./extension-supabase";

/** Verified extension session after getUser() and weekly email proof. */
export type VerifiedExtensionSession = Readonly<{
  userId: string;
  email: string | null;
  accessToken: string;
}>;

/** Result of resolving the extension auth session (getUser-first). */
export type ResolveExtensionSessionResult =
  | { ok: true; session: VerifiedExtensionSession }
  | { ok: false; signedOut: boolean };

/**
 * Resolves the current extension session using `getUser()` for authorization,
 * then reads the access token from storage via `getSession()` only after the
 * JWT is validated — mirrors the monorepo Supabase auth pattern.
 */
export async function resolveVerifiedExtensionSession(
  supabase: ExtensionSupabaseClient
): Promise<ResolveExtensionSessionResult> {
  let userResult = await supabase.auth.getUser();

  if (userResult.error && shouldForceHardLogout(userResult.error.message)) {
    await supabase.auth.signOut();
    return { ok: false, signedOut: true };
  }

  if (userResult.error || !userResult.data.user) {
    const refresh = await supabase.auth.refreshSession();
    if (refresh.error || !refresh.data.session?.user) {
      return { ok: false, signedOut: false };
    }
    userResult = await supabase.auth.getUser();
    if (userResult.error || !userResult.data.user) {
      return { ok: false, signedOut: false };
    }
  }

  const user = userResult.data.user;
  const emailProofValid = await hasValidExtensionEmailProof(user.id);
  if (!emailProofValid) {
    await supabase.auth.signOut();
    return { ok: false, signedOut: true };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken || sessionData.session?.user.id !== user.id) {
    await supabase.auth.signOut();
    return { ok: false, signedOut: true };
  }

  return {
    ok: true,
    session: {
      userId: user.id,
      email: user.email ?? null,
      accessToken,
    },
  };
}

/** True when no authenticated user is present (getUser-first; no session trust). */
export async function hasNoAuthenticatedUser(
  supabase: ExtensionSupabaseClient
): Promise<boolean> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return true;
  }
  return false;
}

/**
 * Ensures auth session is loaded and JWT is valid before PostgREST reads.
 * Uses `getUser()` only — never trusts unverified session cookie data.
 */
export async function ensureExtensionAuthReady(
  supabase: ExtensionSupabaseClient,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  let userResult = await supabase.auth.getUser();

  if (userResult.error || !userResult.data.user) {
    const refresh = await supabase.auth.refreshSession();
    if (refresh.error || !refresh.data.session) {
      return {
        ok: false,
        error: "Session expired. Sign out and sign in again.",
      };
    }
    userResult = await supabase.auth.getUser();
    if (userResult.error || !userResult.data.user) {
      return { ok: false, error: "Sign in again." };
    }
  }

  if (userResult.data.user.id !== userId) {
    return { ok: false, error: "Sign in again." };
  }

  return { ok: true };
}
