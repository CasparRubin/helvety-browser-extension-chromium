import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  EXTENSION_PASSKEY_OPTIONS_PATH,
  EXTENSION_PASSKEY_VERIFY_PATH,
} from "./config";
import { unlockEncryptionWithPasskey } from "./passkey-unlock";

import type * as ConfigModule from "./config";

const fetchPasskeyParamsForUser = vi.hoisted(() => vi.fn());
const helvetyAuthFetch = vi.hoisted(() => vi.fn());
const startAuthentication = vi.hoisted(() => vi.fn());
const deriveKeyFromPRF = vi.hoisted(() => vi.fn());
const storeMasterKey = vi.hoisted(() => vi.fn());
const verifyKeyCheckValue = vi.hoisted(() => vi.fn());
const backfillKeyCheckValueIfMissing = vi.hoisted(() => vi.fn());
const getCachedPRFSalt = vi.hoisted(() => vi.fn());
const cachePRFSalt = vi.hoisted(() => vi.fn());

vi.mock("@helvety/shared/crypto/key-check", () => ({
  verifyKeyCheckValue,
  backfillKeyCheckValueIfMissing,
}));

vi.mock("./extension-passkey-params", () => ({
  fetchPasskeyParamsForUser,
}));

vi.mock("./helvety-auth-api", () => ({
  helvetyAuthFetch,
}));

vi.mock("@simplewebauthn/browser", () => ({
  startAuthentication,
}));

vi.mock("@helvety/shared/crypto/prf-key-derivation", () => ({
  deriveKeyFromPRF,
}));

vi.mock("@helvety/shared/crypto/key-storage", () => ({
  storeMasterKey,
}));

vi.mock("@helvety/shared/crypto/prf-salt-cache", () => ({
  getCachedPRFSalt,
  cachePRFSalt,
}));

vi.mock("./config", async (importOriginal) => {
  const actual = await importOriginal<typeof ConfigModule>();
  return {
    ...actual,
    getExtensionOrigin: () => "chrome-extension://test-extension-id",
  };
});

const USER_ID = "00000000-0000-4000-8000-000000000099";
const ACCESS_TOKEN = "test-access-token";

/** Minimal Supabase stub (KCV backfill is delegated to shared helper). */
function createSupabaseMock() {
  const from = vi.fn();
  return { from } as unknown as Parameters<
    typeof unlockEncryptionWithPasskey
  >[0]["supabase"];
}

let supabase: ReturnType<typeof createSupabaseMock>;

const PRF_SALT_B64 = btoa("test-prf-salt-bytes-32chars!!");

const webAuthnOptions = {
  challenge: "challenge",
  allowCredentials: [],
  timeout: 60_000,
  userVerification: "required" as const,
  rpId: "helvety.com",
};

const challengeEnvelope = "signed-challenge-envelope";
const optionsPayload = { options: webAuthnOptions, challengeEnvelope };

/** WebAuthn assertion stub including PRF extension output. */
function prfAuthResponse() {
  return {
    id: "cred-id",
    rawId: "raw-id",
    type: "public-key" as const,
    response: {
      clientDataJSON: "x",
      authenticatorData: "y",
      signature: "z",
    },
    clientExtensionResults: {
      prf: { results: { first: new ArrayBuffer(32) } },
    },
  };
}

describe("unlockEncryptionWithPasskey", () => {
  beforeEach(() => {
    supabase = createSupabaseMock();
    getCachedPRFSalt.mockReturnValue(null);
    fetchPasskeyParamsForUser.mockResolvedValue({
      ok: true,
      params: {
        credential_id: "cred",
        prf_salt: PRF_SALT_B64,
        version: 1,
        key_check_value: null,
      },
    });
    helvetyAuthFetch.mockImplementation(async (path: string) => {
      if (path === EXTENSION_PASSKEY_OPTIONS_PATH) {
        return { success: true, data: optionsPayload };
      }
      if (path === EXTENSION_PASSKEY_VERIFY_PATH) {
        return { success: true, data: { userId: USER_ID } };
      }
      return { success: false, error: "unexpected path" };
    });
    startAuthentication.mockResolvedValue(prfAuthResponse());
    deriveKeyFromPRF.mockResolvedValue({});
    storeMasterKey.mockResolvedValue(undefined);
    verifyKeyCheckValue.mockResolvedValue(true);
    backfillKeyCheckValueIfMissing.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("loads PRF params from Supabase before calling auth options", async () => {
    await unlockEncryptionWithPasskey({
      supabase,
      accessToken: ACCESS_TOKEN,
      weeklyProof: "weekly-proof-token",
      userId: USER_ID,
    });

    expect(fetchPasskeyParamsForUser).toHaveBeenCalledWith(supabase, USER_ID);
    expect(helvetyAuthFetch).toHaveBeenCalled();
    const firstAuthCall = helvetyAuthFetch.mock.calls[0]?.[0];
    expect(firstAuthCall).toBe(EXTENSION_PASSKEY_OPTIONS_PATH);
  });

  it("posts account-bound options request (response carries options + challengeEnvelope)", async () => {
    await unlockEncryptionWithPasskey({
      supabase,
      accessToken: ACCESS_TOKEN,
      weeklyProof: "weekly-proof-token",
      userId: USER_ID,
    });

    const optionsCall = helvetyAuthFetch.mock.calls.find(
      ([path]) => path === EXTENSION_PASSKEY_OPTIONS_PATH
    );
    expect(optionsCall).toBeDefined();
    const init = optionsCall?.[1] as RequestInit;
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body).toEqual({
      origin: "chrome-extension://test-extension-id",
      isMobile: false,
      expectedUserId: USER_ID,
    });
    expect(body).not.toHaveProperty("optionsJSON");
  });

  it("uses options data directly for startAuthentication", async () => {
    await unlockEncryptionWithPasskey({
      supabase,
      accessToken: ACCESS_TOKEN,
      weeklyProof: "weekly-proof-token",
      userId: USER_ID,
    });

    expect(startAuthentication).toHaveBeenCalledWith(
      expect.objectContaining({
        optionsJSON: expect.objectContaining({
          challenge: webAuthnOptions.challenge,
          extensions: expect.objectContaining({
            prf: expect.objectContaining({
              eval: expect.objectContaining({ first: expect.any(Uint8Array) }),
            }),
          }),
        }),
      })
    );
  });

  it("verify POST sends credential and challengeEnvelope (no PRF in body)", async () => {
    await unlockEncryptionWithPasskey({
      supabase,
      accessToken: ACCESS_TOKEN,
      weeklyProof: "weekly-proof-token",
      userId: USER_ID,
    });

    const verifyCall = helvetyAuthFetch.mock.calls.find(
      ([path]) => path === EXTENSION_PASSKEY_VERIFY_PATH
    );
    expect(verifyCall).toBeDefined();
    const init = verifyCall?.[1] as RequestInit;
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.origin).toBe("chrome-extension://test-extension-id");
    expect(body.credential).toEqual({
      id: "cred-id",
      rawId: "raw-id",
      type: "public-key",
      response: prfAuthResponse().response,
    });
    expect(body.challengeEnvelope).toBe(challengeEnvelope);
    expect(body).not.toHaveProperty("clientExtensionResults");
  });

  it("returns Supabase params error without calling auth", async () => {
    fetchPasskeyParamsForUser.mockResolvedValue({
      ok: false,
      error: "Encryption params are not readable for this session.",
    });

    const result = await unlockEncryptionWithPasskey({
      supabase,
      accessToken: ACCESS_TOKEN,
      weeklyProof: "weekly-proof-token",
      userId: USER_ID,
    });

    expect(result).toEqual({
      ok: false,
      error: "Encryption params are not readable for this session.",
    });
    expect(helvetyAuthFetch).not.toHaveBeenCalled();
  });

  it("returns sign-in error from Supabase session check without calling auth", async () => {
    fetchPasskeyParamsForUser.mockResolvedValue({
      ok: false,
      error: "Sign in again.",
    });

    const result = await unlockEncryptionWithPasskey({
      supabase,
      accessToken: ACCESS_TOKEN,
      weeklyProof: "weekly-proof-token",
      userId: USER_ID,
    });

    expect(result).toEqual({ ok: false, error: "Sign in again." });
    expect(helvetyAuthFetch).not.toHaveBeenCalled();
  });

  it("returns network-blocked params error without calling auth", async () => {
    fetchPasskeyParamsForUser.mockResolvedValue({
      ok: false,
      error:
        "Network blocked. Allow *.supabase.co for this extension (check ad blockers).",
    });

    const result = await unlockEncryptionWithPasskey({
      supabase,
      accessToken: ACCESS_TOKEN,
      weeklyProof: "weekly-proof-token",
      userId: USER_ID,
    });

    expect(result).toEqual({
      ok: false,
      error:
        "Network blocked. Allow *.supabase.co for this extension (check ad blockers).",
    });
    expect(helvetyAuthFetch).not.toHaveBeenCalled();
  });

  it("rejects legacy flat WebAuthn options without challengeEnvelope", async () => {
    helvetyAuthFetch.mockResolvedValueOnce({
      success: true,
      data: webAuthnOptions,
    });

    const result = await unlockEncryptionWithPasskey({
      supabase,
      accessToken: ACCESS_TOKEN,
      weeklyProof: "weekly-proof-token",
      userId: USER_ID,
    });

    expect(result).toEqual({
      ok: false,
      error: "Invalid passkey options from the Helvety auth server.",
    });
    expect(startAuthentication).not.toHaveBeenCalled();
  });

  it("returns auth error when options route fails", async () => {
    helvetyAuthFetch.mockResolvedValueOnce({
      success: false,
      error: "Passkey API is not deployed on the Helvety auth server yet.",
    });

    const result = await unlockEncryptionWithPasskey({
      supabase,
      accessToken: ACCESS_TOKEN,
      weeklyProof: "weekly-proof-token",
      userId: USER_ID,
    });

    expect(result).toEqual({
      ok: false,
      error: "Passkey API is not deployed on the Helvety auth server yet.",
    });
    expect(startAuthentication).not.toHaveBeenCalled();
  });

  it("returns sanitized allowlist errors from the auth server", async () => {
    helvetyAuthFetch.mockResolvedValueOnce({
      success: false,
      error:
        "This extension is not authorized to sign in yet. Sign in at helvety.com or contact support if this persists.",
    });

    const result = await unlockEncryptionWithPasskey({
      supabase,
      accessToken: ACCESS_TOKEN,
      weeklyProof: "weekly-proof-token",
      userId: USER_ID,
    });

    expect(result).toEqual({
      ok: false,
      error:
        "This extension is not authorized to sign in yet. Sign in at helvety.com or contact support if this persists.",
    });
    expect(startAuthentication).not.toHaveBeenCalled();
  });

  it("maps canceled WebAuthn to a friendly error", async () => {
    startAuthentication.mockRejectedValue(
      Object.assign(new Error("cancelled"), { name: "NotAllowedError" })
    );

    const result = await unlockEncryptionWithPasskey({
      supabase,
      accessToken: ACCESS_TOKEN,
      weeklyProof: "weekly-proof-token",
      userId: USER_ID,
    });

    expect(result).toEqual({
      ok: false,
      error: "Authentication was canceled",
    });
  });

  it("maps WebAuthn timeout to a friendly error", async () => {
    startAuthentication.mockRejectedValue(
      Object.assign(new Error("timeout"), { name: "AbortError" })
    );

    const result = await unlockEncryptionWithPasskey({
      supabase,
      accessToken: ACCESS_TOKEN,
      weeklyProof: "weekly-proof-token",
      userId: USER_ID,
    });

    expect(result).toEqual({
      ok: false,
      error: "Authentication timed out",
    });
  });

  it("returns verify error without storing master key", async () => {
    helvetyAuthFetch.mockImplementation(async (path: string) => {
      if (path === EXTENSION_PASSKEY_OPTIONS_PATH) {
        return { success: true, data: optionsPayload };
      }
      return { success: false, error: "Not authenticated" };
    });

    const result = await unlockEncryptionWithPasskey({
      supabase,
      accessToken: ACCESS_TOKEN,
      weeklyProof: "weekly-proof-token",
      userId: USER_ID,
    });

    expect(result).toEqual({ ok: false, error: "Not authenticated" });
    expect(storeMasterKey).not.toHaveBeenCalled();
  });

  it("fails when the browser returns no PRF output", async () => {
    startAuthentication.mockResolvedValue({
      ...prfAuthResponse(),
      clientExtensionResults: {},
    });

    const result = await unlockEncryptionWithPasskey({
      supabase,
      accessToken: ACCESS_TOKEN,
      weeklyProof: "weekly-proof-token",
      userId: USER_ID,
    });

    expect(result).toEqual({
      ok: false,
      error:
        "This browser did not return PRF output. Try Chrome with PRF support.",
    });
    expect(storeMasterKey).not.toHaveBeenCalled();
  });

  it("fails KCV check when passkey does not match encryption key", async () => {
    fetchPasskeyParamsForUser.mockResolvedValue({
      ok: true,
      params: {
        credential_id: "cred",
        prf_salt: PRF_SALT_B64,
        version: 1,
        key_check_value: "bad-kcv",
      },
    });
    verifyKeyCheckValue.mockResolvedValue(false);

    const result = await unlockEncryptionWithPasskey({
      supabase,
      accessToken: ACCESS_TOKEN,
      weeklyProof: "weekly-proof-token",
      userId: USER_ID,
    });

    expect(result).toEqual({
      ok: false,
      error: "This passkey does not match your encryption key.",
    });
    expect(storeMasterKey).not.toHaveBeenCalled();
  });

  it("requires encryption setup when no PRF salt exists", async () => {
    fetchPasskeyParamsForUser.mockResolvedValue({ ok: true, params: null });
    getCachedPRFSalt.mockReturnValue(null);
    startAuthentication.mockResolvedValue(prfAuthResponse());

    const result = await unlockEncryptionWithPasskey({
      supabase,
      accessToken: ACCESS_TOKEN,
      weeklyProof: "weekly-proof-token",
      userId: USER_ID,
    });

    expect(result).toEqual({
      ok: false,
      error: "Encryption is not set up for this account.",
    });
    expect(storeMasterKey).not.toHaveBeenCalled();
  });

  it("stores master key after successful PRF derivation", async () => {
    const masterKey = {} as CryptoKey;
    deriveKeyFromPRF.mockResolvedValue(masterKey);

    const result = await unlockEncryptionWithPasskey({
      supabase,
      accessToken: ACCESS_TOKEN,
      weeklyProof: "weekly-proof-token",
      userId: USER_ID,
    });

    expect(result).toEqual({ ok: true });
    expect(deriveKeyFromPRF).toHaveBeenCalled();
    expect(storeMasterKey).toHaveBeenCalledWith(USER_ID, masterKey);
  });

  it("re-fetches passkey params after verify for salt and KCV checks", async () => {
    await unlockEncryptionWithPasskey({
      supabase,
      accessToken: ACCESS_TOKEN,
      weeklyProof: "weekly-proof-token",
      userId: USER_ID,
    });

    expect(fetchPasskeyParamsForUser).toHaveBeenCalledTimes(2);
  });

  it("backfills key_check_value via shared helper when missing after successful unlock", async () => {
    const masterKey = {} as CryptoKey;
    deriveKeyFromPRF.mockResolvedValue(masterKey);

    const result = await unlockEncryptionWithPasskey({
      supabase,
      accessToken: ACCESS_TOKEN,
      weeklyProof: "weekly-proof-token",
      userId: USER_ID,
    });

    expect(result).toEqual({ ok: true });
    expect(backfillKeyCheckValueIfMissing).toHaveBeenCalledWith(
      supabase,
      USER_ID,
      masterKey
    );
    expect(verifyKeyCheckValue).not.toHaveBeenCalled();
  });
});
