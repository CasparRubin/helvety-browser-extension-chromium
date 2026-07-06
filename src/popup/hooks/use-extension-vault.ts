import {
  clearAllKeys,
  deleteMasterKey,
  getCachedMasterKey,
  getMasterKey,
  onKeyEvent,
  touchVaultSessionInStorage,
} from "@helvety/shared/crypto/key-storage";
import { clearCachedPRFSalt } from "@helvety/shared/crypto/prf-salt-cache";
import { useVaultIdleLock } from "@helvety/shared/crypto/use-vault-idle-lock";
import { useCallback, useEffect, useState } from "react";

import { fetchPasskeyParamsForUser } from "../../lib/extension-passkey-params";
import { hasValidExtensionWeeklyProof } from "../../lib/extension-weekly-proof-storage";
import { unlockEncryptionWithPasskey } from "../../lib/passkey-unlock";

import type { ExtensionSupabaseClient } from "../../lib/extension-supabase";
import type { ParamsPreflight } from "../views/UnlockView";

/**
 *
 */
export interface UseExtensionVaultOptions {
  supabase: ExtensionSupabaseClient;
  userId: string | null;
  accessToken: string | null;
  weeklyProof: string | null;
  onLocked: () => void;
  onSessionExpired: () => Promise<void>;
}

/**
 *
 */
export interface UseExtensionVaultResult {
  masterKey: CryptoKey | null;
  vaultUnlockedAt: number | null;
  cryptoBusy: boolean;
  cryptoError: string | null;
  paramsPreflight: ParamsPreflight | null;
  setCryptoError: (value: string | null) => void;
  touchVaultActivity: () => Promise<void>;
  handleVaultLock: (activeUserId: string) => Promise<void>;
  handleUnlock: () => Promise<void>;
  clearVaultForSignOut: () => Promise<void>;
}

/** Owns extension vault key state, unlock preflight, and auto-lock effects. */
export function useExtensionVault({
  supabase,
  userId,
  accessToken,
  weeklyProof,
  onLocked,
  onSessionExpired,
}: UseExtensionVaultOptions): UseExtensionVaultResult {
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [vaultUnlockedAt, setVaultUnlockedAt] = useState<number | null>(null);
  const [cryptoBusy, setCryptoBusy] = useState(false);
  const [cryptoError, setCryptoError] = useState<string | null>(null);
  const [paramsPreflight, setParamsPreflight] =
    useState<ParamsPreflight | null>(null);

  const clearVaultState = useCallback(() => {
    onLocked();
    setMasterKey(null);
    setVaultUnlockedAt(null);
    setParamsPreflight(null);
  }, [onLocked]);

  const touchVaultActivity = useCallback(async () => {
    if (!userId || !masterKey) {
      return;
    }
    await touchVaultSessionInStorage(userId);
  }, [masterKey, userId]);

  const handleVaultLock = useCallback(
    async (activeUserId: string) => {
      await deleteMasterKey(activeUserId);
      await clearAllKeys();
      clearVaultState();
    },
    [clearVaultState]
  );

  const clearVaultForSignOut = useCallback(async () => {
    try {
      await clearAllKeys();
    } catch {
      // Continue logout even if local key cleanup fails.
    }
    clearCachedPRFSalt();
    clearVaultState();
  }, [clearVaultState]);

  useVaultIdleLock({
    userId,
    isUnlocked: masterKey !== null,
    vaultUnlockedAt,
    onLock: handleVaultLock,
  });

  useEffect(() => {
    if (!userId) {
      return;
    }
    return onKeyEvent((msg) => {
      if (msg.type === "keys-cleared") {
        void handleVaultLock(userId);
      }
      if (msg.type === "master-key-deleted" && msg.userId === userId) {
        void handleVaultLock(userId);
      }
    });
  }, [handleVaultLock, userId]);

  useEffect(() => {
    clearVaultState();
    if (!userId) {
      return;
    }
    void (async () => {
      const cached = await getCachedMasterKey(userId);
      setMasterKey(cached?.key ?? null);
      setVaultUnlockedAt(cached?.unlockedAt ?? null);
    })();
  }, [clearVaultState, userId]);

  useEffect(() => {
    if (!userId || !accessToken || masterKey) {
      setParamsPreflight(null);
      return;
    }
    let cancelled = false;
    setParamsPreflight({ status: "loading" });
    void (async () => {
      const result = await fetchPasskeyParamsForUser(supabase, userId);
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setParamsPreflight({ status: "error", message: result.error });
        return;
      }
      if (!result.params) {
        setParamsPreflight({ status: "not_setup" });
        return;
      }
      setParamsPreflight({ status: "ready" });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, accessToken, masterKey, supabase]);

  const handleUnlock = useCallback(async () => {
    if (!accessToken || !userId || !weeklyProof) {
      setCryptoError("Not signed in.");
      return;
    }
    const weeklyProofValid = await hasValidExtensionWeeklyProof(userId);
    if (!weeklyProofValid) {
      await clearVaultForSignOut();
      await onSessionExpired();
      return;
    }
    setCryptoError(null);
    setCryptoBusy(true);
    setParamsPreflight({ status: "loading" });
    try {
      const preflight = await fetchPasskeyParamsForUser(supabase, userId);
      if (!preflight.ok) {
        setParamsPreflight({ status: "error", message: preflight.error });
        setCryptoError(preflight.error);
        return;
      }
      if (!preflight.params) {
        setParamsPreflight({ status: "not_setup" });
        setCryptoError("Encryption is not set up for this account.");
        return;
      }
      setParamsPreflight({ status: "ready" });

      const result = await unlockEncryptionWithPasskey({
        supabase,
        accessToken,
        weeklyProof,
        userId,
      });
      if (!result.ok) {
        setCryptoError(result.error);
        return;
      }
      const key = await getMasterKey(userId);
      const cached = await getCachedMasterKey(userId);
      setMasterKey(key);
      setVaultUnlockedAt(cached?.unlockedAt ?? null);
      onLocked();
    } finally {
      setCryptoBusy(false);
    }
  }, [
    accessToken,
    clearVaultForSignOut,
    onLocked,
    onSessionExpired,
    supabase,
    userId,
    weeklyProof,
  ]);

  return {
    masterKey,
    vaultUnlockedAt,
    cryptoBusy,
    cryptoError,
    paramsPreflight,
    setCryptoError,
    touchVaultActivity,
    handleVaultLock,
    handleUnlock,
    clearVaultForSignOut,
  };
}
