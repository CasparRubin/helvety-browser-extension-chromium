# Extension E2EE boundary (network and trust model)

This document describes **what this extension is designed to do** and **what it does not guarantee**. It follows the same **client-side decrypt** model as the Helvety web apps for tasks, notes, contacts, and links: **ciphertext** is stored in Postgres (via Supabase) and **plaintext** is intended to exist **only in the extension** after you unlock.

This is **not** a formal threat model or security audit. Operational security still depends on your Supabase project settings, RLS policies, extension packaging, browser updates, and host integrity.

Canonical production URLs and auth API paths live in **`src/lib/env.ts`** (`HELVETY_AUTH_ORIGIN`, `HELVETY_GATEWAY`, `EXTENSION_*_PATH`).

## Entity content (tasks, notes, contacts, links)

### Fetch

For the list UI, the extension requests **only ciphertext columns** (see `src/lib/e2ee-data-select.ts`). That limits what crosses the wire to PostgREST and reduces the chance of accidentally pulling future non-E2EE columns if the schema grows.

**Caveat:** Broader `select('*')` (or server-side tools) could still return other columns if code changes—reviews should keep list projections explicit.

### Decrypt

`decrypt*` helpers in `src/lib/decrypt-entities.ts` run in the extension and use `crypto.subtle` via `@helvety/shared/crypto/encryption`. Plaintext exists in **extension runtime memory** (and in UI state) while unlocked; it is cleared when you sign out or when the shared key-storage layer removes the cached key.

**Caveat:** Malware, a compromised extension build, or a debugger attached to the browser can read process memory. “Client-side only” means **not intentionally sent to Helvety application APIs as plaintext**, not “impossible to extract on a hostile device.”

### Master key

The AES master key is **derived in the extension** from WebAuthn **PRF** output (`unlockEncryptionWithPasskey` in `src/lib/passkey-unlock.ts`), then cached via `@helvety/shared/crypto/key-storage` (IndexedDB in the extension context). **This implementation does not** serialize the `CryptoKey` or PRF output into the JSON bodies sent to Helvety auth routes below.

### Writes (current release)

The MVP is **read-only**. There is **no** implemented path that POSTs decrypted titles or bodies to Helvety Next.js server actions. Future writes must send **ciphertext** (or use a reviewed API contract)—never plaintext entity fields to application servers.

## What is sent where (by design)

| Data                                     | Where                          | Notes                                                                                                                                                                                                                  |
| ---------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Email + OTP                              | **Supabase Auth**              | Identity provider for the project. Not the same as E2EE payload encryption; subject to Supabase’s policies and logging.                                                                                                |
| `Authorization: Bearer`                  | **`https://helvety.com/auth`** | Only for the three `/api/extension/*` passkey routes (see `EXTENSION_*_PATH` in `src/lib/env.ts`). The bearer token is visible to that server over TLS like any authenticated HTTP call.                               |
| WebAuthn assertion (no PRF payload)      | **Helvety auth** (same origin) | Standard `clientDataJSON` / `authenticatorData` / `signature` on verify—**not** decrypted task or note text.                                                                                                           |
| `prf_salt`, `version`, `key_check_value` | **Helvety auth** + database    | PRF salt and KCV are **server-stored parameters** for the same passkey-E2EE design as the web app. They are **not** a substitute for secrecy of user content; secrecy comes from the authenticator and key derivation. |
| Ciphertext columns                       | **Supabase** (PostgREST)       | Encrypted blobs under RLS. **Database operators** (Supabase staff per their policies) and anyone with `service_role` / backups could access ciphertext or metadata—same trust boundary as any hosted database.         |

## PRF output in verify requests

`clientExtensionResults` (including PRF output) is **not** included in the JSON body sent to `EXTENSION_PASSKEY_VERIFY_PATH` (`/api/extension/passkey/verify` under the auth origin). PRF output is used **in the extension** to derive the master key after the server accepts the WebAuthn assertion.

## Relationship to “Helvety” vs infrastructure

- **Helvety application code** (auth routes in the `helvety` monorepo, Next.js apps) is written so that **normal paths** for these features do not require decrypted entity plaintext on the server—the same architectural goal as the web apps.
- **Supabase** provides Auth and Postgres. **TLS** protects data in transit between the extension and Supabase/Helvety; **at-rest** protection is your project configuration and provider contracts.

If any statement here disagrees with the code, **the code wins**—treat this file as explanatory, not a warranty.
