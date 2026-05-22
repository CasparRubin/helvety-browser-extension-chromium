# Extension E2EE boundary (network and trust model)

What this extension is **designed** to do and what it **does not** guarantee. Same **client-side decrypt** model as Helvety web apps for tasks, notes, contacts, and links: **ciphertext** in Postgres (Supabase), **plaintext** only in the client after unlock.

Not a formal threat model or audit. Your Supabase RLS, extension packaging, browser updates, and host integrity still matter.

URLs and API path constants: **`src/lib/config.ts`**.

## Plaintext on servers (your policy)

**Entity content** (task/note/contact/link titles and names) is **not** sent to Helvety or Supabase as plaintext by this extension. List reads use **ciphertext columns only**; decryption runs in the popup.

**Allowed on infrastructure** (same as helvety.com web apps):

| Data                                                                         | Where                          | Plaintext user content?                                         |
| ---------------------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------- |
| Email, OTP                                                                   | Supabase Auth                  | Email only (identity)                                           |
| `created_at` and row ids                                                     | Supabase                       | Timestamps / identifiers — not titles or bodies                 |
| `encrypted_*` columns                                                        | Supabase                       | No — AES-GCM ciphertext                                         |
| `prf_salt`, `credential_id`, `version` (and `key_check_value` when deployed) | Supabase `user_passkey_params` | No — crypto/unlock **metadata** (see below), not task/note text |
| WebAuthn assertion                                                           | Helvety auth (when deployed)   | No — signatures and authenticator bytes, not decrypted fields   |
| Access token (Bearer)                                                        | Auth passkey routes            | Session material, not entity plaintext                          |

**PRF salt** is a public HKDF parameter (documented in `@helvety/shared`); security comes from the passkey private key, not hiding the salt. **Key check value (KCV)** is an encrypted blob used to detect a wrong derived key — not human-readable content.

## Hardcoded “public” config (not a leak)

`config.ts` embeds the Supabase project URL and **publishable** key (and Helvety HTTPS origins). That matches how the web apps ship `NEXT_PUBLIC_SUPABASE_*`: these values are **meant for client code** and appear in every user’s browser anyway.

- **Fine to commit** in this repository and ship in the extension bundle.
- **Does not** decrypt user data or bypass E2EE — ciphertext stays ciphertext without the passkey-derived master key.
- **Does not** replace RLS — the publishable key only allows what your Supabase policies grant the authenticated user.
- **Never** add server-only secrets to the extension (`SUPABASE_SECRET_KEY`, `sb_secret_*`, cookie-signing secrets, etc.). Those would be a real compromise.

User **access tokens** after OTP sign-in live in `chrome.storage.local` and are sensitive at runtime, but they are session material — not the constants in `config.ts`.

## Entity content (tasks, notes, contacts, links)

### Fetch

List queries use **ciphertext-only** projections (`src/lib/e2ee-data-select.ts`). Avoid `select('*')` on entity tables so new columns are not pulled accidentally.

Passkey unlock params use a **narrow** projection (`PASSKEY_PARAMS_SELECT` in `extension-passkey-params.ts`) — crypto metadata only, not entity fields.

### Decrypt

`decrypt*` in `src/lib/decrypt-entities.ts` use Web Crypto via `@helvety/shared/crypto/encryption`. Plaintext lives in extension memory and React state while unlocked; sign-out clears the cached master key via `@helvety/shared/crypto/key-storage`.

**Limitation:** malware, a tampered build, or a debugger can read memory. “Client-side only” means **not sent as plaintext to Helvety app APIs or PostgREST by this code**, not “unextractable on a hostile machine.”

### Master key

Derived in the extension from WebAuthn **PRF** (`unlockEncryptionWithPasskey` in `passkey-unlock.ts`), then cached in **IndexedDB** through shared key-storage (extension origin only). PRF output and the raw `CryptoKey` are **not** sent in the passkey verify JSON body.

A master key unlocked on **helvety.com** in a normal tab is **not** available to this extension (`chrome-extension://…` is a separate storage context). Sign-in via OTP is shared (Supabase session); E2EE unlock is not.

### Writes (this release)

**Read-only** MVP. No path posts decrypted titles or bodies to Helvety server actions or Supabase as plaintext. Future writes must use ciphertext or a reviewed API.

## What is sent where (by design)

| Data                                                             | Where                     | Notes                                                                              |
| ---------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------- |
| Email + OTP                                                      | **Supabase Auth**         | Identity for the project in `config.ts`; separate from E2EE field encryption.      |
| `Authorization: Bearer`                                          | **`HELVETY_AUTH_ORIGIN`** | Passkey **options/verify** only (after auth redeploy with extension routes).       |
| WebAuthn assertion + `challengeEnvelope` (no PRF in verify body) | **Helvety auth**          | Assertion bytes + signed challenge binding — not entity plaintext.                 |
| `prf_salt`, `version`, `credential_id`                           | **Supabase** (read)       | `user_passkey_params` under RLS (`PASSKEY_PARAMS_SELECT`; KCV when column exists). |
| Ciphertext columns                                               | **Supabase**              | Under RLS; operators/backups can see ciphertext/metadata like any hosted DB.       |

Auth responses are parsed with `@helvety/shared/parse-action-response` in `helvety-auth-api.ts`.

## PRF output in verify requests

`clientExtensionResults` is **not** in the JSON body to `EXTENSION_PASSKEY_VERIFY_PATH`. PRF output stays in the extension to derive the master key after verify succeeds.

## Passkey unlock and production

1. **Supabase** — PRF params (`extension-passkey-params.ts`).
2. **Auth HTTP** — `POST` options returns `data: { options, challengeEnvelope }`; verify sends `credential` + `challengeEnvelope` (see `passkey-unlock.ts`). Routes live on monorepo `main`; undeployed production auth returns 404/HTML → “Passkey API is not deployed…”.

`EXTENSION_PASSKEY_PARAMS_PATH` is a **doc-only** constant; runtime params use Supabase (`extension-passkey-params.ts`), not that URL.

## Helvety vs infrastructure

- **Helvety auth** (when extension routes are deployed) should verify WebAuthn without requiring decrypted entity plaintext on the server.
- **Supabase** provides Auth and Postgres. TLS protects transit; at-rest depends on your project and provider.

If this document disagrees with the code, **the code wins**.
