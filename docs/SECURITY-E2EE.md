# Extension E2EE boundary (network and trust model)

What this extension is **designed** to do and what it **does not** guarantee. Same **client-side decrypt** model as Helvety web apps for tasks, notes, contacts, and links: **ciphertext** in Postgres (Supabase), **plaintext content** only in the extension after passkey unlock.

Not a formal threat model or audit. Your Supabase RLS, extension packaging, browser updates, and host integrity still matter.

URLs and API path constants: **`src/lib/config.ts`**.  
Automated guards: **`src/lib/e2ee-privacy.ts`**, **`e2ee-privacy.test.ts`**, **`e2ee-data-select.test.ts`**, **`entity-repository.test.ts`**, **`encrypt-entities.test.ts`**, **`unlock-dev-log.test.ts`**, **`passkey-unlock.test.ts`** (no PRF in verify body; KCV backfill), **`tests/supabase-auth-patterns.test.ts`** (`getUser()`-first session), **`tests/copy-accuracy.test.ts`**, **`tests/readme-vendor-docs.test.ts`** (README must not claim read-only MVP or a separate detail-view step), **`tests/security-e2ee-docs.test.ts`** (this doc stays aligned with manifest and side panel), **`entity-rich-text-editor.test.ts`** (TipTap must not use a value-based React `key` — focus regression; co-located with the side panel UI), plus other UI/data tests under **`src/**/\*.test.ts`** (catalogs, navigation including `entityFormSessionKey`, list grouping, link tree).

## Privacy summary

| Class                   | Examples                                                                                         | Plaintext on Supabase / Helvety auth?                                                         | Plaintext in extension before unlock?          |
| ----------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **Identity**            | Email, OTP                                                                                       | Email in Supabase Auth; OTP send/verify via Helvety auth API (not direct client Supabase OTP) | Email in UI when signed in                     |
| **Timestamps & ids**    | `created_at`, `updated_at`, row UUIDs                                                            | Yes                                                                                           | Yes after fetch (not secret)                   |
| **Structural metadata** | `category_id`, `stage_id`, `label_id`, `priority`, `folder_id`, `parent_folder_id`, `sort_order` | Yes (organizational, not body text)                                                           | Yes when unlocked                              |
| **Entity content**      | Titles, descriptions, contact fields, link URLs                                                  | **No** — `encrypted_*` only                                                                   | **Only after passkey unlock** (memory / UI)    |
| **Crypto unlock**       | PRF salt, credential id, KCV                                                                     | Metadata rows only                                                                            | Master key in extension IndexedDB after unlock |
| **Session**             | Supabase JWT / refresh, weekly email-proof anchor                                                | In `chrome.storage.local` (auth + `helvety_extension_last_email_verified`)                    | Not shown in About UI                          |

**“100% client-side” for user content** means: this extension **never** sends decrypted titles, notes, contact details, or URLs to Helvety app APIs or PostgREST. Encryption and decryption run in the extension via Web Crypto (`encrypt-entities.ts` / `decrypt-entities.ts`). That matches helvety.com.

**Not** “only email and timestamps exist on the server.” Helvety (web + extension) also stores **structural metadata** in plaintext so lists can be filtered and filed without decrypting every row on the server. Those fields are catalog ids and numbers, not your written content.

## Plaintext on servers (by design)

**Entity content** (task/note/contact/link **text**) is **not** sent to Helvety or Supabase as plaintext by this extension. Reads use **ciphertext columns** from `e2ee-data-select.ts`; decryption runs in the side panel.

**Allowed on infrastructure** (aligned with helvety.com web apps):

| Data                                                                                             | Where                                 | User-readable content?                      |
| ------------------------------------------------------------------------------------------------ | ------------------------------------- | ------------------------------------------- |
| Email                                                                                            | Supabase Auth                         | Email only (identity)                       |
| OTP send/verify                                                                                  | Helvety auth (`HELVETY_AUTH_ORIGIN`)  | Codes in transit only; not entity plaintext |
| `created_at`, `updated_at`, row `id`                                                             | Supabase                              | Timestamps / identifiers                    |
| `encrypted_*` columns                                                                            | Supabase                              | No — AES-256-GCM ciphertext                 |
| `category_id`, `stage_id`, `label_id`, `priority`, `folder_id`, `parent_folder_id`, `sort_order` | Supabase                              | No — structural metadata                    |
| `user_id`                                                                                        | Supabase                              | Account linkage (RLS)                       |
| `prf_salt`, `credential_id`, `version`, `key_check_value`                                        | `user_passkey_params`                 | Crypto metadata, not task/note text         |
| WebAuthn assertion                                                                               | Helvety auth (when deployed)          | Signatures / authenticator bytes            |
| Access token (Bearer)                                                                            | Auth passkey routes + Supabase client | Session material                            |

**PRF salt** is a public HKDF parameter; security comes from the passkey private key. **Key check value (KCV)** is an encrypted blob to detect a wrong derived key — not human-readable content. On first successful unlock when no KCV exists yet, the extension backfills it via PostgREST (`user_passkey_params.key_check_value`), matching the web auth app.

## Hardcoded “public” config (not a leak)

`config.ts` embeds the Supabase project URL and **publishable** key (and Helvety HTTPS origins). Same as `NEXT_PUBLIC_SUPABASE_*` on helvety.com.

- Safe to commit and ship in the bundle.
- Does **not** decrypt data without the passkey-derived master key.
- Does **not** replace RLS.
- **Never** add server secrets (`SUPABASE_SECRET_KEY`, `sb_secret_*`, etc.).

User **access tokens** after OTP sign-in live in `chrome.storage.local` via the Supabase auth adapter. Sensitive at runtime; not entity plaintext.

**Session and vault policy (aligned with helvety.com):** TTL constants come from `@helvety/shared/crypto` (`auth-session-policy`, no extension env vars). OTP sign-in uses server routes on `helvety.com/auth/api/extension/otp/*` with EU/EEA attestation (not direct Supabase OTP from the client). After OTP verify, `helvety_extension_last_email_verified` in `chrome.storage.local` records weekly email proof (7d). Vault master keys in IndexedDB follow **24h sliding idle** and **7d absolute max**; the side panel uses `useVaultIdleLock` and `touchVaultSessionInStorage` on entity activity. Expired email proof or vault policy triggers sign-out or passkey re-unlock respectively. Session bootstrap uses **`getUser()` for authorization** (`extension-session.ts`); `getSession()` is only used after JWT validation to read the access token.

### Weekly email proof vs web device trust (threat model)

Helvety web apps mint an **HttpOnly HMAC-signed** `helvety_device_trust` cookie after email verification. E2EE server pages and mutations enforce it via `requireDeviceTrust` — tampering without the signing secret fails server-side.

The extension **cannot** set helvety.com cookies. Extension OTP verify intentionally **does not** mint device-trust cookies ([`apps/auth/README.md`](https://github.com/CasparRubin/helvety/blob/main/apps/auth/README.md)). Instead, the side panel stores `helvety_extension_last_email_verified` in `chrome.storage.local` and `resolveVerifiedExtensionSession` signs the user out when proof is missing or expired.

| Mechanism         | Web (helvety.com)             | Extension                                  |
| ----------------- | ----------------------------- | ------------------------------------------ |
| Storage           | HttpOnly signed cookie        | `chrome.storage.local` timestamp           |
| Enforcement       | Server (`requireDeviceTrust`) | Client (`extension-session.ts`, `App.tsx`) |
| Tamper resistance | HMAC + server verify          | Same-origin extension code only            |

**Implication:** A modified extension build could skip email-proof checks locally. **RLS and JWT validity still gate PostgREST**; vault content still requires passkey + PRF. Email re-proof is defense-in-depth for stolen refresh tokens on a shared machine, not the primary E2EE boundary.

**Cross-app entity links:** edit forms include shared `EntityLinksPanel` sections (tasks ↔ notes ↔ contacts ↔ links). Link rows are stored in Supabase `entity_links` (structural metadata only); linked record titles are decrypted client-side for display.

## Entity content (tasks, notes, contacts, links)

### Fetch

List and single-record (edit-form) queries use explicit projections in `e2ee-data-select.ts` — **no `select('*')`**. `*_LIST_SELECT` loads grouped list rows; `*_DETAIL_SELECT` loads the full ciphertext fields needed when opening the editor. Tests assert selects never include plaintext content column names (`e2ee-privacy.ts`).

Passkey unlock params: `PASSKEY_PARAMS_SELECT` in `extension-passkey-params.ts` — crypto metadata only.

### Decrypt

`decrypt-entities.ts` uses `@helvety/shared/crypto/encryption` with per-table AAD (`items`, `notes`, `contacts`, `links`, `link_folders`). Plaintext exists in extension memory and React state while unlocked. Sign-out clears the cached master key (`deleteMasterKey`) and wipes decrypted list and form state in the side panel (`App.tsx` `clearDecryptedEntityState`). The same wipe runs when `user_id` changes so another account never sees the previous user’s in-memory rows before the next fetch.

**Limitation:** malware, a tampered build, or a debugger can read memory. “Client-side only” means **not sent as plaintext over the network by this code**, not “unextractable on a hostile machine.”

### Master key

Derived from WebAuthn **PRF** (`passkey-unlock.ts`), stored in **IndexedDB** (extension origin only). PRF output and the raw `CryptoKey` are **not** in the passkey verify JSON body (`passkey-unlock.test.ts` asserts `clientExtensionResults` is omitted).

A master key unlocked on **helvety.com** is **not** available in this extension (`chrome-extension://…` is a separate storage context).

### Writes

Create, update, and delete entity **content** use **direct Supabase PostgREST** (`entity-repository.ts`) with payloads from `encrypt-entities.ts`. Only **serialized ciphertext** in `encrypted_*` columns; structural metadata matches the web apps. Link URLs are normalized client-side before encryption (`link-url-normalize.ts`).

**Cross-app links** (link/unlink between tasks, notes, contacts, and links) use `entity-link-repository.ts` and `@helvety/shared/entity-links-client` on the `entity_links` table — structural metadata only (no decrypted titles in link rows).

- Every mutation uses `.eq("user_id", userId)` plus Supabase RLS.
- Does **not** call Next.js server actions.
- Tests scan insert/update payloads for forbidden plaintext content keys.

## What is sent where (by design)

| Data                                                      | Where                     | Notes                                        |
| --------------------------------------------------------- | ------------------------- | -------------------------------------------- |
| Email + OTP send/verify                                   | **`HELVETY_AUTH_ORIGIN`** | EU/EEA attestation; session via `setSession` |
| `Authorization: Bearer`                                   | **`HELVETY_AUTH_ORIGIN`** | Passkey options/verify only                  |
| WebAuthn assertion + `challengeEnvelope`                  | **Helvety auth**          | No entity plaintext; no PRF in body          |
| `prf_salt`, `version`, `credential_id`, `key_check_value` | **Supabase**              | `user_passkey_params` under RLS              |
| Ciphertext + structural metadata                          | **Supabase**              | Operators/backups see ciphertext/metadata    |

Auth responses use `@helvety/shared/parse-action-response` in `helvety-auth-api.ts`. Unlock logs omit user ids and tokens; passkey auth HTTP failures log URL/status as `[helvety-unlock]` in production (other unlock steps are dev-only).

## PRF output in verify requests

`clientExtensionResults` is **not** in the JSON body to `EXTENSION_PASSKEY_VERIFY_PATH`. PRF stays in the extension to derive the master key after verify succeeds.

## Passkey unlock and production

1. **Supabase** — PRF params (`extension-passkey-params.ts`).
2. **Auth HTTP** — options + verify with `challengeEnvelope` when routes are deployed on `HELVETY_AUTH_ORIGIN`.

`EXTENSION_PASSKEY_PARAMS_PATH` is **doc-only**; runtime params use Supabase, not that URL.

## Extension surface

| Surface            | Data handling                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MV3 `permissions`  | `storage`, `sidePanel`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `host_permissions` | `*.supabase.co`, `helvety.com` (auth + gateway links)                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `side_panel`       | Global panel at `index.html`; toolbar icon opens it (`background.js` `openPanelOnActionClick`)                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `background.js`    | Side panel open behavior only — no entity I/O or auth ceremony                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Side panel UI      | Edit-first lists (grouped tasks/notes/contacts, links tree); row tap opens the editor except links (tap opens URL). Task/note **descriptions** and contact **notes** use TipTap (`EntityRichTextEditor`); React remount key is **`entityFormSessionKey`** (record id), not live draft text. Session email on sign-out tooltip only. **Open in web app**: list mode opens zone path on gateway; edit mode opens entity deep link. Link/folder up-down reorder within tree level. Tab switch with unsaved form shows discard dialog. |
| About tab          | Version, extension id, auth origin, passkey API URL — **no** access tokens or OTP in DOM                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Production console | Passkey auth fetch failures log as `[helvety-unlock]` (URL/status only); other unlock steps are dev-only                                                                                                                                                                                                                                                                                                                                                                                                                           |

## Helvety vs infrastructure

- **Helvety auth** (when extension routes are deployed) verifies WebAuthn without requiring decrypted entity plaintext on the server.
- **Supabase** provides Auth and Postgres. TLS in transit; at-rest depends on your project.

If this document disagrees with the code, **the code wins**.
