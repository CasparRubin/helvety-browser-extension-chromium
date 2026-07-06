import { resolveRateLimitedAuthError } from "@helvety/shared/auth-flow-errors";
import { useCallback, useEffect, useState } from "react";

import {
  hasNoAuthenticatedUser,
  resolveVerifiedExtensionSession,
} from "../../lib/extension-session";
import {
  clearExtensionWeeklyProof,
  writeExtensionWeeklyProof,
} from "../../lib/extension-weekly-proof-storage";
import {
  sendExtensionOtp,
  verifyExtensionOtp,
} from "../../lib/helvety-auth-api";
import {
  clearPendingOtp,
  readPendingOtp,
  writePendingOtp,
} from "../../lib/pending-otp-storage";

import type { ExtensionSupabaseClient } from "../../lib/extension-supabase";

/**
 *
 */
export interface UseExtensionAuthResult {
  sessionEmail: string | null;
  userId: string | null;
  accessToken: string | null;
  weeklyProof: string | null;
  authBusy: boolean;
  emailInput: string;
  otpInput: string;
  otpSent: boolean;
  nonEUEEAConfirmed: boolean;
  authError: string | null;
  setEmailInput: (value: string) => void;
  setOtpInput: (value: string) => void;
  setNonEUEEAConfirmed: (value: boolean) => void;
  setAuthError: (value: string | null) => void;
  refreshSession: () => Promise<void>;
  handleSendOtp: () => Promise<void>;
  handleVerifyOtp: () => Promise<void>;
  handleUseDifferentEmail: () => Promise<void>;
  signOut: (beforeSignOut?: () => void | Promise<void>) => Promise<void>;
}

/**
 *
 */
function clearResolvedSession(
  setSessionEmail: (value: string | null) => void,
  setUserId: (value: string | null) => void,
  setAccessToken: (value: string | null) => void,
  setWeeklyProof: (value: string | null) => void
): void {
  setSessionEmail(null);
  setUserId(null);
  setAccessToken(null);
  setWeeklyProof(null);
}

/** Owns extension OTP state and verified Supabase session wiring. */
export function useExtensionAuth(
  supabase: ExtensionSupabaseClient
): UseExtensionAuthResult {
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [weeklyProof, setWeeklyProof] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [nonEUEEAConfirmed, setNonEUEEAConfirmed] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    const result = await resolveVerifiedExtensionSession(supabase);
    if (!result.ok) {
      clearResolvedSession(
        setSessionEmail,
        setUserId,
        setAccessToken,
        setWeeklyProof
      );
      return;
    }
    setSessionEmail(result.session.email);
    setUserId(result.session.userId);
    setAccessToken(result.session.accessToken);
    setWeeklyProof(result.session.weeklyProof);
  }, [supabase]);

  useEffect(() => {
    void refreshSession();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshSession();
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [refreshSession, supabase]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const noUser = await hasNoAuthenticatedUser(supabase);
      if (cancelled || !noUser) {
        return;
      }
      const record = await readPendingOtp();
      if (cancelled || !record) {
        return;
      }
      setEmailInput(record.email);
      setOtpSent(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const handleSendOtp = useCallback(async () => {
    setAuthError(null);
    setAuthBusy(true);
    try {
      if (!nonEUEEAConfirmed) {
        setAuthError(
          "Please confirm that you are not located in the EU/EEA to continue."
        );
        return;
      }
      const email = emailInput.trim();
      const result = await sendExtensionOtp({
        email,
        nonEUEEAConfirmed: true,
      });
      if (!result.success) {
        setAuthError(resolveRateLimitedAuthError(result.error));
        return;
      }
      setOtpSent(true);
      await writePendingOtp(email);
    } finally {
      setAuthBusy(false);
    }
  }, [emailInput, nonEUEEAConfirmed]);

  const handleVerifyOtp = useCallback(async () => {
    setAuthError(null);
    setAuthBusy(true);
    try {
      const result = await verifyExtensionOtp({
        email: emailInput.trim(),
        code: otpInput.trim(),
      });
      if (!result.success) {
        setAuthError(resolveRateLimitedAuthError(result.error));
        return;
      }
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.data.access_token,
        refresh_token: result.data.refresh_token,
      });
      if (sessionError) {
        setAuthError(sessionError.message);
        return;
      }
      setOtpInput("");
      setOtpSent(false);
      setNonEUEEAConfirmed(false);
      await clearPendingOtp();
      await writeExtensionWeeklyProof(result.data.weekly_proof);
      await refreshSession();
    } finally {
      setAuthBusy(false);
    }
  }, [emailInput, otpInput, refreshSession, supabase]);

  const handleUseDifferentEmail = useCallback(async () => {
    setOtpSent(false);
    setOtpInput("");
    setNonEUEEAConfirmed(false);
    await clearPendingOtp();
  }, []);

  const signOut = useCallback(
    async (beforeSignOut?: () => void | Promise<void>) => {
      await beforeSignOut?.();
      setEmailInput("");
      setOtpInput("");
      setOtpSent(false);
      setNonEUEEAConfirmed(false);
      setAuthError(null);
      await clearPendingOtp();
      await clearExtensionWeeklyProof();
      await supabase.auth.signOut();
      await refreshSession();
    },
    [refreshSession, supabase]
  );

  return {
    sessionEmail,
    userId,
    accessToken,
    weeklyProof,
    authBusy,
    emailInput,
    otpInput,
    otpSent,
    nonEUEEAConfirmed,
    authError,
    setEmailInput,
    setOtpInput,
    setNonEUEEAConfirmed,
    setAuthError,
    refreshSession,
    handleSendOtp,
    handleVerifyOtp,
    handleUseDifferentEmail,
    signOut,
  };
}
