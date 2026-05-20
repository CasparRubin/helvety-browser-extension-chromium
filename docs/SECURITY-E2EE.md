# Extension E2EE boundary (network and trust model)

What this extension is **designed** to do and what it **does not** guarantee. Same **client-side decrypt** model as Helvety web apps for tasks, notes, contacts, and links: **ciphertext** in Postgres (Supabase), **plaintext** only in the client after unlock.

Not a formal threat model or audit. Your Supabase RLS, extension packaging, browser updates, and host integrity still matter.

URLs and API path constants: **`src/lib/config.ts`**.

## Hardcoded “public” config (not a leak)

`config.ts` embeds the Supabase project URL and **publishable** key (and Helvety HTTPS origins). That matches how the web apps ship `NEXT_PUBLIC_SUPABASE_*`: these values are **meant for client code** and appear in every user’s browser anyway.

- **Fine to commit** in this repository and ship in the extension bundle.
- **Does not** decrypt user data or bypass E2EE — ciphertext stays ciphertext without the passkey-derived master key.
- **Does not** replace RLS — the publishable key only allows what your Supabase policies grant the authenticated user.
- **Never** add server-only secrets to the extension (`SUPABASE_SECRET_KEY`, `sb_secret_*`, cookie-signing secrets, etc.). Those would be a real compromise.

User **access tokens** after OTP sign-in live in `chrome.storage.local` and are sensitive at runtime, but they are session material — not the constants in `config.ts`.

## Entity content (tasks, notes, contacts, links)

### Fetch

List queries use **ciphertext-only** projections (`src/lib/e2ee-data-select.ts`). Avoid `select('*')` so new columns are not pulled accidentally.

### Decrypt

`decrypt*` in `src/lib/decrypt-entities.ts` use Web Crypto via `@helvety/shared/crypto/encryption`. Plaintext lives in extension memory and React state while unlocked; sign-out clears the cached master key via `@helvety/shared/crypto/key-storage`.

**Limitation:** malware, a tampered build, or a debugger can read memory. “Client-side only” means **not sent as plaintext to Helvety app APIs by this code**, not “unextractable on a hostile machine.”

### Master key

Derived in the extension from WebAuthn **PRF** (`unlockEncryptionWithPasskey` in `passkey-unlock.ts`), then cached in **IndexedDB** through shared key-storage. PRF output and the raw `CryptoKey` are **not** sent in the passkey verify JSON body.

### Writes (this release)

**Read-only** MVP. No path posts decrypted titles or bodies to Helvety server actions. Future writes must use ciphertext or a reviewed API.

## What is sent where (by design)

| Data                                       | Where                          | Notes                                                                                   |
| ------------------------------------------ | ------------------------------ | --------------------------------------------------------------------------------------- |
| Email + OTP                                | **Supabase Auth**              | Identity for the project in `config.ts`; separate from E2EE field encryption.           |
| `Authorization: Bearer`                    | **`https://helvety.com/auth`** | Only for `EXTENSION_*_PATH` passkey routes when those routes exist on the deployment.   |
| WebAuthn assertion (no PRF in verify body) | **Helvety auth**               | Standard assertion fields — not decrypted entity text.                                  |
| `prf_salt`, `version`, `key_check_value`   | **Auth + DB**                  | Same passkey-E2EE parameter model as the web app; not a substitute for content secrecy. |
| Ciphertext columns                         | **Supabase**                   | Under RLS; operators/backups can see ciphertext/metadata like any hosted DB.            |

## PRF output in verify requests

`clientExtensionResults` is **not** in the JSON body to `EXTENSION_PASSKEY_VERIFY_PATH`. PRF output stays in the extension to derive the master key after verify succeeds.

## Passkey routes and production

The extension is built against the path constants in `config.ts`. If production auth does not implement them (e.g. HTTP 404), unlock never runs and encrypted lists cannot be decrypted—OTP sign-in alone is not enough.

## Helvety vs infrastructure

- **Helvety auth** (when extension routes are deployed) should verify WebAuthn without requiring decrypted entity plaintext on the server.
- **Supabase** provides Auth and Postgres. TLS protects transit; at-rest depends on your project and provider.

If this document disagrees with the code, **the code wins**.
