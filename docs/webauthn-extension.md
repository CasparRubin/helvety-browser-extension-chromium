# WebAuthn from the Helvety Chromium extension

Operational notes for developers. For the end-to-end encryption story, see [SECURITY-E2EE.md](./SECURITY-E2EE.md).

## Relying party (RP ID)

WebAuthn **RP ID** for credentials used with this extension is **`helvety.com`** (see `apps/auth/app/actions/auth-rp-config.ts` in the Helvety monorepo). All passkey HTTP calls from this extension use the production auth zone:

**`https://helvety.com/auth`** (`HELVETY_AUTH_ORIGIN` in `src/lib/env.ts`).

The goal is for credentials created on the production web app to remain usable where the platform allows the **same RP ID** from an extension origin.

## Client origin allowlist

WebAuthn includes `clientDataJSON.origin` (for the extension, typically `chrome-extension://<id>`). `@simplewebauthn/server` verification compares that origin to an allowlist from `getExpectedOrigins()` on the auth deployment:

- `https://helvety.com` plus any origins in **`HELVETY_WEBAUTHN_EXTENSION_ORIGINS`** (comma-separated).

Set `HELVETY_WEBAUTHN_EXTENSION_ORIGINS` on the **production auth** deployment to match each extension ID you ship (unpacked dev ID vs store ID may differ).

## Browser and RP policy

Whether a **credential created on the web** can be asserted from **`chrome-extension://…`** depends on **browser behavior and policy**, not only server allowlists. Treat **device QA** as mandatory when you change RP ID, related origins, or extension packaging.

If you hit interoperability issues, review current guidance for **WebAuthn related origins** and your browser vendor’s extension + WebAuthn documentation (behavior changes over time).

## Extension ceremony flow (high level)

Auth base: **`https://helvety.com/auth`**. Paths below are the constants in `src/lib/env.ts`.

1. User signs in with **Supabase Auth** (email OTP in this MVP); session material is stored in `chrome.storage.local` by the extension.
2. `GET …/api/extension/encryption/passkey-params` with `Authorization: Bearer <access_token>` loads PRF-related parameters.
3. `POST …/api/extension/passkey/options` returns WebAuthn request options and a **signed challenge envelope** (no WebAuthn cookie challenge in this API).
4. The extension runs `startAuthentication` and, when configured, merges **PRF** inputs similarly to the web `use-login-flow` hook.
5. `POST …/api/extension/passkey/verify` verifies the assertion and updates the credential counter. It does **not** mint a new Supabase session (the extension keeps the session from step 1).
6. The extension derives the **master key** from PRF output, checks **KCV** when present, and caches the key via `@helvety/shared/crypto/key-storage`.

Bearer tokens are sent over **HTTPS** to **`https://helvety.com/auth`** only for these routes.
