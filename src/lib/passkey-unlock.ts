import { verifyKeyCheckValue } from "@helvety/shared/crypto/key-check";
import { storeMasterKey } from "@helvety/shared/crypto/key-storage";
import {
  deriveKeyFromPRF,
  type PRFKeyParams,
} from "@helvety/shared/crypto/prf-key-derivation";
import {
  cachePRFSalt,
  getCachedPRFSalt,
} from "@helvety/shared/crypto/prf-salt-cache";
import { startAuthentication } from "@simplewebauthn/browser";

import {
  EXTENSION_PASSKEY_OPTIONS_PATH,
  EXTENSION_PASSKEY_VERIFY_PATH,
  getExtensionOrigin,
} from "./config";
import { fetchPasskeyParamsForUser } from "./extension-passkey-params";
import { helvetyAuthFetch } from "./helvety-auth-api";
import { logUnlockFailure } from "./unlock-dev-log";

import type { ExtensionSupabaseClient } from "./extension-supabase";
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";

/** Auth options response: WebAuthn JSON plus signed server challenge envelope. */
type ExtensionPasskeyOptionsPayload = {
  options: PublicKeyCredentialRequestOptionsJSON;
  challengeEnvelope: string;
};

/**
 * WebAuthn + PRF unlock: PRF params via Supabase (`fetchPasskeyParamsForUser`);
 * options/verify via Bearer routes on `HELVETY_AUTH_ORIGIN` when deployed.
 * Verify sends `challengeEnvelope` from options (no httpOnly cookie); PRF stays client-side.
 */
export async function unlockEncryptionWithPasskey(input: {
  supabase: ExtensionSupabaseClient;
  accessToken: string;
  userId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, accessToken, userId } = input;
  const origin = getExtensionOrigin();

  const paramsResult = await fetchPasskeyParamsForUser(supabase, userId);
  if (!paramsResult.ok) {
    return { ok: false, error: paramsResult.error };
  }
  const passkeyParams = paramsResult.params;

  const optionsResult = await helvetyAuthFetch<ExtensionPasskeyOptionsPayload>(
    EXTENSION_PASSKEY_OPTIONS_PATH,
    {
      method: "POST",
      accessToken,
      body: JSON.stringify({
        origin,
        isMobile: false,
        expectedUserId: userId,
      }),
    }
  );
  if (!optionsResult.success) {
    logUnlockFailure("passkey_options", {
      error: optionsResult.error,
      path: EXTENSION_PASSKEY_OPTIONS_PATH,
    });
    return { ok: false, error: optionsResult.error };
  }

  const { options: webAuthnOptions, challengeEnvelope } = optionsResult.data;
  if (!webAuthnOptions?.challenge || !challengeEnvelope) {
    logUnlockFailure("passkey_options", {
      reason: "invalid_options_payload",
      path: EXTENSION_PASSKEY_OPTIONS_PATH,
    });
    return {
      ok: false,
      error: "Invalid passkey options from the Helvety auth server.",
    };
  }

  let bootstrapSalt = getCachedPRFSalt();
  let bootstrapSaltFromServer = false;

  if (passkeyParams?.prf_salt) {
    bootstrapSalt = {
      prfSalt: passkeyParams.prf_salt,
      version: passkeyParams.version,
      cachedAt: Date.now(),
    };
    bootstrapSaltFromServer = true;
    cachePRFSalt(passkeyParams.prf_salt, passkeyParams.version);
  }

  const authOptions: PublicKeyCredentialRequestOptionsJSON = {
    ...webAuthnOptions,
  };

  if (bootstrapSalt) {
    const saltBytes = Uint8Array.from(atob(bootstrapSalt.prfSalt), (c) =>
      c.charCodeAt(0)
    );
    Object.assign(authOptions, {
      extensions: {
        ...authOptions.extensions,
        prf: {
          eval: {
            first: saltBytes,
          },
        },
      },
    });
  }

  let authResponse;
  try {
    authResponse = await startAuthentication({
      optionsJSON: authOptions,
    });
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.name === "NotAllowedError"
          ? "Authentication was canceled"
          : err.name === "AbortError"
            ? "Authentication timed out"
            : "Failed to authenticate with passkey"
        : "Failed to authenticate with passkey";
    logUnlockFailure("webauthn", {
      error: msg,
      name: err instanceof Error ? err.name : undefined,
    });
    return { ok: false, error: msg };
  }

  const authResponseForServer = {
    id: authResponse.id,
    rawId: authResponse.rawId,
    type: authResponse.type,
    response: authResponse.response,
  };

  const verifyResult = await helvetyAuthFetch<{ userId: string }>(
    EXTENSION_PASSKEY_VERIFY_PATH,
    {
      method: "POST",
      accessToken,
      body: JSON.stringify({
        origin,
        credential: authResponseForServer,
        challengeEnvelope,
      }),
    }
  );

  if (!verifyResult.success) {
    logUnlockFailure("passkey_verify", {
      error: verifyResult.error,
      path: EXTENSION_PASSKEY_VERIFY_PATH,
    });
    return { ok: false, error: verifyResult.error };
  }

  if (!bootstrapSalt) {
    logUnlockFailure("passkey_params", {
      reason: "no_prf_salt",
      userId,
    });
    return {
      ok: false,
      error: "Encryption is not set up for this account.",
    };
  }

  try {
    const clientExtResults = authResponse.clientExtensionResults as {
      prf?: { results?: { first?: ArrayBuffer } };
    };
    const prfOutput = clientExtResults?.prf?.results?.first;

    if (!prfOutput) {
      logUnlockFailure("prf_derive", { reason: "no_prf_output" });
      return {
        ok: false,
        error:
          "This browser did not return PRF output. Try Chrome with PRF support.",
      };
    }

    const paramsAgain = await fetchPasskeyParamsForUser(supabase, userId);
    const actualSalt =
      paramsAgain.ok && paramsAgain.params?.prf_salt
        ? paramsAgain.params.prf_salt
        : null;

    const saltMatches = actualSalt
      ? actualSalt === bootstrapSalt.prfSalt
      : bootstrapSaltFromServer;

    if (!saltMatches) {
      logUnlockFailure("prf_derive", { reason: "salt_mismatch" });
      return {
        ok: false,
        error: "PRF salt mismatch. Please try again.",
      };
    }

    const prfKeyParams: PRFKeyParams = {
      prfSalt: bootstrapSalt.prfSalt,
      version: bootstrapSalt.version,
    };
    const masterKey = await deriveKeyFromPRF(prfOutput, prfKeyParams);

    const keyCheckValue =
      paramsAgain.ok && paramsAgain.params
        ? paramsAgain.params.key_check_value
        : null;

    if (keyCheckValue) {
      const isValidKey = await verifyKeyCheckValue(masterKey, keyCheckValue);
      if (!isValidKey) {
        logUnlockFailure("prf_derive", { reason: "kcv_mismatch" });
        return {
          ok: false,
          error: "This passkey does not match your encryption key.",
        };
      }
    }

    await storeMasterKey(userId, masterKey);
    return { ok: true };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to derive encryption key.";
    logUnlockFailure("prf_derive", {
      message,
      name: e instanceof Error ? e.name : undefined,
    });
    return {
      ok: false,
      error: message,
    };
  }
}
