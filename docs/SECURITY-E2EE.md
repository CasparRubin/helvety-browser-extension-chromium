# Extension E2EE boundary (network and trust model)

What this extension is **designed** to do and what it **does not** guarantee. Same **client-side decrypt** model as Helvety web apps for tasks, notes, contacts, and links: **ciphertext** in Postgres (Supabase), **plaintext content** only in the extension after passkey unlock.

Not a formal threat model or audit. Your Supabase RLS, extension packaging, browser updates, and host integrity still matter.

URLs and API path constants: **`src/lib/config.ts`**.  
Automated guards: **`src/lib/e2ee-privacy.ts`**, **`e2ee-privacy.test.ts`**, **`e2ee-data-select.test.ts`**, **`entity-repository.test.ts`**, **`encrypt-entities.test.ts`**, **`unlock-dev-log.test.ts`**, **`passkey-unlock.test.ts`** (no PRF in verify body), **`tests/readme-vendor-docs.test.ts`** (README must not claim read-only MVP), **`tests/security-e2ee-docs.test.ts`** (this doc stays aligned with manifest and side panel).

## Privacy summary

| Class                   | Examples                                                                                         | Plaintext on Supabase / Helvety auth?    | Plaintext in extension before unlock?          |
| ----------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------- | ---------------------------------------------- |
| **Identity**            | Email, OTP                                                                                       | Email via Supabase Auth only             | Email in UI when signed in                     |
| **Timestamps & ids**    | `created_at`, `updated_at`, row UUIDs                                                            | Yes                                      | Yes after fetch (not secret)                   |
| **Structural metadata** | `category_id`, `stage_id`, `label_id`, `priority`, `folder_id`, `parent_folder_id`, `sort_order` | Yes (organizational, not body text)      | Yes when unlocked                              |
| **Entity content**      | Titles, descriptions, contact fields, link URLs                                                  | **No** — `encrypted_*` only              | **Only after passkey unlock** (memory / UI)    |
| **Crypto unlock**       | PRF salt, credential id, KCV                                                                     | Metadata rows only                       | Master key in extension IndexedDB after unlock |
| **Session**             | Supabase JWT / refresh                                                                           | In `chrome.storage.local` (auth adapter) | Not shown in About UI                          |

**“100% client-side” for user content** means: this extension **never** sends decrypted titles, notes, contact details, or URLs to Helvety app APIs or PostgREST. Encryption and decryption run in the extension via Web Crypto (`encrypt-entities.ts` / `decrypt-entities.ts`). That matches helvety.com.

**Not** “only email and timestamps exist on the server.” Helvety (web + extension) also stores **structural metadata** in plaintext so lists can be filtered and filed without decrypting every row on the server. Those fields are catalog ids and numbers, not your written content.

## Plaintext on servers (by design)

**Entity content** (task/note/contact/link **text**) is **not** sent to Helvety or Supabase as plaintext by this extension. Reads use **ciphertext columns** from `e2ee-data-select.ts`; decryption runs in the side panel.

**Allowed on infrastructure** (aligned with helvety.com web apps):

| Data                                                                                             | Where                                 | User-readable content?              |
| ------------------------------------------------------------------------------------------------ | ------------------------------------- | ----------------------------------- |
| Email, OTP                                                                                       | Supabase Auth                         | Email only (identity)               |
| `created_at`, `updated_at`, row `id`                                                             | Supabase                              | Timestamps / identifiers            |
| `encrypted_*` columns                                                                            | Supabase                              | No — AES-256-GCM ciphertext         |
| `category_id`, `stage_id`, `label_id`, `priority`, `folder_id`, `parent_folder_id`, `sort_order` | Supabase                              | No — structural metadata            |
| `user_id`                                                                                        | Supabase                              | Account linkage (RLS)               |
| `prf_salt`, `credential_id`, `version` (and `key_check_value` when deployed)                     | `user_passkey_params`                 | Crypto metadata, not task/note text |
| WebAuthn assertion                                                                               | Helvety auth (when deployed)          | Signatures / authenticator bytes    |
| Access token (Bearer)                                                                            | Auth passkey routes + Supabase client | Session material                    |

**PRF salt** is a public HKDF parameter; security comes from the passkey private key. **Key check value (KCV)** is an encrypted blob to detect a wrong derived key — not human-readable content.

## Hardcoded “public” config (not a leak)

`config.ts` embeds the Supabase project URL and **publishable** key (and Helvety HTTPS origins). Same as `NEXT_PUBLIC_SUPABASE_*` on helvety.com.

- Safe to commit and ship in the bundle.
- Does **not** decrypt data without the passkey-derived master key.
- Does **not** replace RLS.
- **Never** add server secrets (`SUPABASE_SECRET_KEY`, `sb_secret_*`, etc.).

User **access tokens** after OTP sign-in live in `chrome.storage.local` via the Supabase auth adapter. Sensitive at runtime; not entity plaintext.

## Entity content (tasks, notes, contacts, links)

### Fetch

List and detail queries use explicit projections in `e2ee-data-select.ts` — **no `select('*')`**. Tests assert selects never include plaintext content column names (`e2ee-privacy.ts`).

Passkey unlock params: `PASSKEY_PARAMS_SELECT` in `extension-passkey-params.ts` — crypto metadata only.

### Decrypt

`decrypt-entities.ts` uses `@helvety/shared/crypto/encryption` with per-table AAD (`items`, `notes`, `contacts`, `links`, `link_folders`). Plaintext exists in extension memory and React state while unlocked. Sign-out clears the cached master key (`deleteMasterKey`) and wipes decrypted list/detail/form state in the side panel (`App.tsx` `clearDecryptedEntityState`). The same wipe runs when `user_id` changes so another account never sees the previous user’s in-memory rows before the next fetch.

**Limitation:** malware, a tampered build, or a debugger can read memory. “Client-side only” means **not sent as plaintext over the network by this code**, not “unextractable on a hostile machine.”

### Master key

Derived from WebAuthn **PRF** (`passkey-unlock.ts`), stored in **IndexedDB** (extension origin only). PRF output and the raw `CryptoKey` are **not** in the passkey verify JSON body (`passkey-unlock.test.ts` asserts `clientExtensionResults` is omitted).

A master key unlocked on **helvety.com** is **not** available in this extension (`chrome-extension://…` is a separate storage context).

### Writes

Create, update, and delete use **direct Supabase PostgREST** (`entity-repository.ts`) with payloads from `encrypt-entities.ts`. Only **serialized ciphertext** in `encrypted_*` columns; structural metadata matches the web apps. Link URLs are normalized client-side before encryption (`link-url-normalize.ts`).

- Every mutation uses `.eq("user_id", userId)` plus Supabase RLS.
- Does **not** call Next.js server actions.
- Tests scan insert/update payloads for forbidden plaintext content keys.

## What is sent where (by design)

| Data                                     | Where                     | Notes                                     |
| ---------------------------------------- | ------------------------- | ----------------------------------------- |
| Email + OTP                              | **Supabase Auth**         | Identity only                             |
| `Authorization: Bearer`                  | **`HELVETY_AUTH_ORIGIN`** | Passkey options/verify only               |
| WebAuthn assertion + `challengeEnvelope` | **Helvety auth**          | No entity plaintext; no PRF in body       |
| `prf_salt`, `version`, `credential_id`   | **Supabase**              | `user_passkey_params` under RLS           |
| Ciphertext + structural metadata         | **Supabase**              | Operators/backups see ciphertext/metadata |

Auth responses use `@helvety/shared/parse-action-response` in `helvety-auth-api.ts`. Unlock logs omit user ids and tokens; passkey auth HTTP failures log URL/status as `[helvety-unlock]` in production (other unlock steps are dev-only).

## PRF output in verify requests

`clientExtensionResults` is **not** in the JSON body to `EXTENSION_PASSKEY_VERIFY_PATH`. PRF stays in the extension to derive the master key after verify succeeds.

## Passkey unlock and production

1. **Supabase** — PRF params (`extension-passkey-params.ts`).
2. **Auth HTTP** — options + verify with `challengeEnvelope` when routes are deployed on `HELVETY_AUTH_ORIGIN`.

`EXTENSION_PASSKEY_PARAMS_PATH` is **doc-only**; runtime params use Supabase, not that URL.

## Extension surface

| Surface            | Data handling                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| MV3 `permissions`  | `storage`, `sidePanel`                                                                                   |
| `host_permissions` | `*.supabase.co`, `helvety.com` (auth + gateway links)                                                    |
| `side_panel`       | Global panel at `index.html`; toolbar icon opens it (`background.js` `openPanelOnActionClick`)           |
| `background.js`    | Side panel open behavior only — no entity I/O or auth ceremony                                           |
| About tab          | Version, extension id, auth origin, passkey API URL — **no** access tokens or OTP in DOM                 |
| Production console | Passkey auth fetch failures log as `[helvety-unlock]` (URL/status only); other unlock steps are dev-only |

## Helvety vs infrastructure

- **Helvety auth** (when extension routes are deployed) verifies WebAuthn without requiring decrypted entity plaintext on the server.
- **Supabase** provides Auth and Postgres. TLS in transit; at-rest depends on your project.

If this document disagrees with the code, **the code wins**.
