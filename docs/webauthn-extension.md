# WebAuthn from the Helvety Chromium extension

Developer notes for passkey unlock. For encryption boundaries and what is (not) plaintext on servers, see [SECURITY-E2EE.md](./SECURITY-E2EE.md).

Monorepo references point at [CasparRubin/helvety on GitHub](https://github.com/CasparRubin/helvety) (`main`). With a sibling checkout (`../helvety`), the same paths apply locally.

## Production status

| Step                               | Status                                                                                                                                                                                                                                       |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PRF params (`user_passkey_params`) | **Works** when signed in — extension reads via Supabase JWT ([`extension-passkey-params.ts`](../src/lib/extension-passkey-params.ts)). Preflight: `ready` / `not set up` / `cannot load: …`.                                                 |
| WebAuthn options / verify          | **Implemented** in monorepo (`apps/auth/app/api/extension/passkey/*`). **Production** unlock works after redeploying auth; until then the UI shows “Passkey API is not deployed on the Helvety auth server yet.” (404 or HTML from Next.js). |

This repo ships the **extension client**. Full unlock needs the live auth app at `HELVETY_AUTH_ORIGIN` to include those routes (same contract as `main`).

## Relying party (RP ID)

Credentials use RP ID **`helvety.com`**, matching the web apps. The extension passes `getExtensionOrigin()` (`chrome-extension://<runtime-id>`) as the WebAuthn client origin on options/verify requests.

Whether a passkey registered on **helvety.com** can be asserted from **`chrome-extension://…`** also depends on **browser policy** — plan device QA when packaging or auth config changes.

## Auth server contract (monorepo `main`)

Extension unlock mirrors web passkey semantics; do not reinvent verification rules.

| Extension client step | Monorepo reference                                                                                                                             | Notes                                                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Sign-in               | Supabase Auth OTP ([`extension-supabase.ts`](../src/lib/extension-supabase.ts))                                                                | Session in `chrome.storage.local`                                                                                                |
| PRF params            | [`fetchUserPasskeyParamsForUser`](https://github.com/CasparRubin/helvety/blob/main/packages/shared/src/user-passkey-params-db.ts)              | PostgREST under RLS — **no** `GET …/encryption/passkey-params` at runtime                                                        |
| WebAuthn options      | [`POST /api/extension/passkey/options`](https://github.com/CasparRubin/helvety/blob/main/apps/auth/app/api/extension/passkey/options/route.ts) | Bearer + `{ origin, isMobile, expectedUserId }` → `data: { options, challengeEnvelope }` (HMAC-signed challenge, 3 min TTL)      |
| WebAuthn verify       | [`POST /api/extension/passkey/verify`](https://github.com/CasparRubin/helvety/blob/main/apps/auth/app/api/extension/passkey/verify/route.ts)   | Bearer + `{ origin, credential, challengeEnvelope }`; envelope must match assertion challenge; **does not** replace OTP session  |
| PRF derive + KCV      | [`use-login-flow.ts`](https://github.com/CasparRubin/helvety/blob/main/apps/auth/hooks/use-login-flow.ts) (PRF section)                        | Extension: [`passkey-unlock.ts`](../src/lib/passkey-unlock.ts) + `@helvety/shared` crypto — PRF output never in verify JSON body |

### Deploy checklist (production auth)

After merging/redeploying `apps/auth`:

1. `POST /api/extension/passkey/options` returns JSON `ActionResponse` with `data.options` (WebAuthn) and `data.challengeEnvelope` (not flat options at the top level).
2. `POST /api/extension/passkey/verify` accepts `challengeEnvelope` from step 1; uses [`extension-passkey-challenge.ts`](https://github.com/CasparRubin/helvety/blob/main/apps/auth/lib/extension-passkey-challenge.ts) (same signing secret as web challenge cookies), not httpOnly cookies.
3. `getExpectedOrigins(rpId, origin)` includes caller `chrome-extension://<id>` ([`auth-rp-config.ts`](https://github.com/CasparRubin/helvety/blob/main/apps/auth/app/actions/auth-rp-config.ts)); unpacked vs store extension IDs differ.
4. Desktop extension: `hints: ["hybrid"]` when `isMobile: false`.
5. Local extension build: `VITE_HELVETY_AUTH_ORIGIN=http://localhost:3001/auth pnpm build`.

## Ceremony flow (client)

Auth base: **`HELVETY_AUTH_ORIGIN`** (default `https://helvety.com/auth`; override with `VITE_HELVETY_AUTH_ORIGIN` at build time).

1. Email OTP sign-in — session in `chrome.storage.local` ([`extension-supabase.ts`](../src/lib/extension-supabase.ts)).
2. **Supabase** — `user_passkey_params` via `PASSKEY_PARAMS_SELECT` ([`extension-passkey-params.ts`](../src/lib/extension-passkey-params.ts)); `auth.getSession()` before the query.
3. `POST …/passkey/options` — receive `options` + `challengeEnvelope`; run `startAuthentication` with PRF extensions when params exist.
4. `POST …/passkey/verify` — send assertion + `challengeEnvelope`; server verifies WebAuthn and updates counter only (no new Supabase session).
5. Derive master key from PRF locally; verify KCV when present; cache via `@helvety/shared/crypto/key-storage` (IndexedDB in the extension origin).

Bearer tokens go only to auth passkey routes over HTTPS. Entity **reads** and encrypted **writes** use Supabase under RLS; reads use narrow ciphertext projections (`e2ee-data-select.ts`), never plaintext content columns.

Dev builds may log sanitized unlock steps as `[helvety-unlock]` and auth HTTP status as `[helvety-auth]` (no tokens or entity content); production builds do not.

## Troubleshooting: params errors or no QR

Unlock stops before the passkey UI (QR, phone, security key) when an earlier step fails. Preflight shows `Encryption params: ready | not set up | cannot load: …`.

### Causal chain

1. **Supabase** — `user_passkey_params` with the signed-in JWT.
2. **Auth** — `POST …/api/extension/passkey/options` → JSON with `data.options` and `data.challengeEnvelope` (desktop: `hints: ["hybrid"]` when supported).
3. **WebAuthn** — `startAuthentication` → OS/browser passkey UI.

Step 1 failure → params error, no QR. Step 2 **404/HTML** or missing envelope → “Passkey API is not deployed…” or “Invalid passkey options…”, no QR. MSN/scorecard `ERR_BLOCKED_BY_CLIENT` on Edge new-tab pages is unrelated.

### Manual check (popup DevTools → Network)

On **Unlock with passkey**:

- `…supabase.co/rest/v1/user_passkey_params` — 200 + row or empty (not set up).
- `…helvety.com/auth/api/extension/passkey/options` — 200 JSON with `options` + `challengeEnvelope` after auth redeploy.

| Symptom                                        | Likely cause                       | What to do                                                                 |
| ---------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------- |
| `cannot load:` + blocked network               | Ad blocker / privacy extension     | Allow `*.supabase.co`                                                      |
| Session / JWT errors                           | Stale session                      | Sign out and sign in again                                                 |
| `not readable for this session`                | RLS                                | Confirm `auth.uid() = user_id` (web works → data exists)                   |
| `ready` + API not deployed                     | Auth not redeployed                | Redeploy `apps/auth` from `main`                                           |
| `Invalid passkey options from the auth server` | Old auth build or wrong JSON shape | Redeploy auth; response must be `{ options, challengeEnvelope }`, not flat |
| Params `ready`, options OK, still no QR        | WebAuthn / hybrid unsupported      | Check `hints`; dev console `[helvety-unlock]`                              |

**Note:** E2EE on [helvety.com](https://helvety.com) does **not** unlock this extension — master keys are per origin (`https://helvety.com` vs `chrome-extension://…`).
