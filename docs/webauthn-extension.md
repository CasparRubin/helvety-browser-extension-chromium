# WebAuthn from the Helvety Chromium extension

Developer notes for passkey unlock. For encryption boundaries, see [SECURITY-E2EE.md](./SECURITY-E2EE.md).

## Production status

The extension calls three JSON routes under **`https://helvety.com/auth`** (see `EXTENSION_*_PATH` in `src/lib/config.ts`). **Those URLs currently return 404** on production auth. Passkey unlock in the popup will fail until the **deployed** Helvety auth service implements them.

This repository does **not** ship or deploy server routes. Enabling unlock is an **auth deployment** change, not an extension-only change.

## Relying party (RP ID)

Credentials are scoped to RP ID **`helvety.com`**, matching the production web apps. The extension uses `@simplewebauthn/browser` with `getExtensionOrigin()` (`chrome-extension://<runtime-id>`) as the WebAuthn client origin.

Whether a credential created in the **browser on helvety.com** can be asserted from **`chrome-extension://…`** depends on **browser policy and allowlists**, not only on client code here. Plan device QA when you change packaging or auth configuration.

## Server requirements (when enabling unlock)

1. **HTTP routes** on the auth app (same path constants as `config.ts`):
   - `GET /api/extension/encryption/passkey-params`
   - `POST /api/extension/passkey/options`
   - `POST /api/extension/passkey/verify`
   - Bearer-authenticated JSON (`ActionResponse` shape — parsed by `parse-helvety-action-json.ts`).

2. **WebAuthn origin allowlist** on verify: production auth must treat `chrome-extension://<your-extension-id>` as an expected origin alongside `https://helvety.com`. Unpacked dev builds and store builds usually have **different** extension IDs—allowlist each one you support.

3. **No monorepo checkout required** for extension users; operators configure the **running** auth deployment.

## Ceremony flow (client)

Auth base: **`HELVETY_AUTH_ORIGIN`** (`https://helvety.com/auth`).

1. User signs in with **Supabase Auth** (email OTP); session is stored in `chrome.storage.local` (`extension-supabase.ts`).
2. `GET …/encryption/passkey-params` — PRF-related parameters for the user.
3. `POST …/passkey/options` — WebAuthn request options and signed challenge envelope.
4. Extension runs `startAuthentication` (PRF inputs merged like the web login flow when params exist).
5. `POST …/passkey/verify` — assertion verification and counter update. Does **not** create a new Supabase session.
6. Extension derives the master key from PRF output, checks KCV when present, caches via `@helvety/shared/crypto/key-storage` (IndexedDB in the extension context).

Bearer tokens are sent only to these auth routes over HTTPS.
