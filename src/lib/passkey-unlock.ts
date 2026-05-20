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
  EXTENSION_PASSKEY_PARAMS_PATH,
  EXTENSION_PASSKEY_VERIFY_PATH,
  getExtensionOrigin,
} from "./config";
import { helvetyAuthFetch } from "./helvety-auth-api";

import type { UserPasskeyParams } from "@helvety/shared/types/entities";
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";

/**
 *
 */
type OptionsPayload = {
  optionsJSON: PublicKeyCredentialRequestOptionsJSON;
  challengeEnvelope: string;
};

/**
 * WebAuthn + PRF unlock via `EXTENSION_*_PATH` on `HELVETY_AUTH_ORIGIN`.
 * Fails if those routes are not deployed (404 on production today).
 * Verify omits `clientExtensionResults`; PRF derives the master key locally (KCV when present).
 */
export async function unlockEncryptionWithPasskey(input: {
  accessToken: string;
  userId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { accessToken, userId } = input;
  const origin = getExtensionOrigin();

  const paramsResult = await helvetyAuthFetch<UserPasskeyParams | null>(
    EXTENSION_PASSKEY_PARAMS_PATH,
    { method: "GET", accessToken }
  );
  if (!paramsResult.success) {
    return { ok: false, error: paramsResult.error };
  }
  const passkeyParams = paramsResult.data;

  const optionsResult = await helvetyAuthFetch<OptionsPayload>(
    EXTENSION_PASSKEY_OPTIONS_PATH,
    {
      method: "POST",
      accessToken,
      body: JSON.stringify({
        origin,
        isMobile: false,
      }),
    }
  );
  if (!optionsResult.success) {
    return { ok: false, error: optionsResult.error };
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
    ...optionsResult.data.optionsJSON,
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
        challengeEnvelope: optionsResult.data.challengeEnvelope,
        credential: authResponseForServer,
      }),
    }
  );

  if (!verifyResult.success) {
    return { ok: false, error: verifyResult.error };
  }

  if (!bootstrapSalt) {
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
      return {
        ok: false,
        error:
          "This browser did not return PRF output. Try Chrome with PRF support.",
      };
    }

    const paramsAgain = await helvetyAuthFetch<UserPasskeyParams | null>(
      EXTENSION_PASSKEY_PARAMS_PATH,
      { method: "GET", accessToken }
    );
    const actualSalt =
      paramsAgain.success && paramsAgain.data?.prf_salt
        ? paramsAgain.data.prf_salt
        : null;

    const saltMatches = actualSalt
      ? actualSalt === bootstrapSalt.prfSalt
      : bootstrapSaltFromServer;

    if (!saltMatches) {
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
      paramsAgain.success && paramsAgain.data
        ? paramsAgain.data.key_check_value
        : null;

    if (keyCheckValue) {
      const isValidKey = await verifyKeyCheckValue(masterKey, keyCheckValue);
      if (!isValidKey) {
        return {
          ok: false,
          error: "This passkey does not match your encryption key.",
        };
      }
    }

    await storeMasterKey(userId, masterKey);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "Failed to derive encryption key.",
    };
  }
}
