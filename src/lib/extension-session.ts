import { shouldForceHardLogout } from "@helvety/shared/auth-errors";
import { AUTH_MAX_LIFETIME_MS } from "@helvety/shared/crypto";
import { isJwtWithinMaxLifetime } from "@helvety/shared/jwt-session-lifetime";

import { hasValidExtensionWeeklyOtpAnchor } from "./extension-weekly-otp-anchor";

import type { ExtensionSupabaseClient } from "./extension-supabase";

/** Verified extension session after getUser(), JWT lifetime, and weekly OTP anchor. */
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
 *
 * Weekly re-auth is enforced by:
 * 1. Supabase JWT `iat` vs {@link AUTH_MAX_LIFETIME_MS} (server-issued token age)
 * 2. Client OTP anchor timestamp (UX; tampering cannot extend JWT validity)
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

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken || sessionData.session?.user.id !== user.id) {
    await supabase.auth.signOut();
    return { ok: false, signedOut: true };
  }

  if (!isJwtWithinMaxLifetime(accessToken, AUTH_MAX_LIFETIME_MS)) {
    await supabase.auth.signOut();
    return { ok: false, signedOut: true };
  }

  const otpAnchorValid = await hasValidExtensionWeeklyOtpAnchor(user.id);
  if (!otpAnchorValid) {
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

  const accessToken = (await supabase.auth.getSession()).data.session
    ?.access_token;
  if (
    !accessToken ||
    !isJwtWithinMaxLifetime(accessToken, AUTH_MAX_LIFETIME_MS)
  ) {
    return {
      ok: false,
      error: "Session expired. Sign out and sign in again.",
    };
  }

  return { ok: true };
}
