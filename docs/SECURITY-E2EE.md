# Extension E2EE boundary (network and trust model)

What this extension is **designed** to do and what it **does not** guarantee. Same **client-side decrypt** model as Helvety web apps for tasks, notes, contacts, and links: **ciphertext** in Postgres (Supabase), **plaintext content** only in the extension after passkey unlock.

Not a formal threat model or audit. Your Supabase RLS, extension packaging, browser updates, and host integrity still matter.

URLs and API path constants: **`src/lib/config.ts`**.  
Automated guards: **`entity-repository.test.ts`** (no star selects; ciphertext-only writes via `@helvety/shared/e2ee-write-guard`), **`encrypt-entities.test.ts`**, **`decrypt-entities.test.ts`**, **`extension-entity-links-hooks.test.tsx`** (entity-link load/link/unlink failures toast via `getE2eeHookErrorMessage`), **`unlock-dev-log.test.ts`**, **`passkey-unlock.test.ts`** (no PRF in verify body; shared `backfillKeyCheckValueIfMissing`), **`scripts/check-extension-e2ee-consistency.mjs`**, **`tests/supabase-auth-patterns.test.ts`** (`getUser()`-first session), **`tests/copy-accuracy.test.ts`**, **`tests/readme-vendor-docs.test.ts`** (README must not claim read-only MVP or a separate detail-view step), **`tests/security-e2ee-docs.test.ts`** (this doc stays aligned with manifest and side panel), **`entity-rich-text-editor.test.ts`** (TipTap remount key + mount-only `content` parity with web `E2eeRichTextItemEditorShell`; co-located with the side panel UI), plus other UI/data tests under **`src/**/\*.test.ts(x)`** (catalogs, navigation including `entityFormSessionKey`, list grouping, link tree). Shared package tests cover **`e2ee-entity-columns`**, **`e2ee-write-guard`**, and **`entity-links-client`**.

## Privacy summary

| Class                   | Examples                                                                                         | Plaintext on Supabase / Helvety auth?                                                                                   | Plaintext in extension before unlock?          |
| ----------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **Identity**            | Email, OTP                                                                                       | Email in Supabase Auth; OTP send/verify via Helvety auth API (not direct client Supabase OTP)                           | Email in UI when signed in                     |
| **Timestamps & ids**    | `created_at`, `updated_at`, row UUIDs                                                            | Yes                                                                                                                     | Yes after fetch (not secret)                   |
| **Structural metadata** | `category_id`, `stage_id`, `label_id`, `priority`, `folder_id`, `parent_folder_id`, `sort_order` | Yes (organizational, not body text)                                                                                     | Yes when unlocked                              |
| **Entity content**      | Titles, descriptions, contact fields, link URLs                                                  | **No** — `encrypted_*` only                                                                                             | **Only after passkey unlock** (memory / UI)    |
| **Crypto unlock**       | PRF salt, credential id, KCV                                                                     | Metadata rows only                                                                                                      | Master key in extension IndexedDB after unlock |
| **Session**             | Supabase JWT / refresh, HMAC weekly proof                                                        | Refresh + `helvety_extension_weekly_proof` in `chrome.storage.local`; access token mirrored in `chrome.storage.session` | Not shown in About UI                          |

**“100% client-side” for user content** means: this extension **never** sends decrypted titles, notes, contact details, or URLs to Helvety app APIs or PostgREST. Encryption and decryption run in the extension via Web Crypto (`encrypt-entities.ts` / `decrypt-entities.ts`). That matches helvety.com.

**Not** “only email and timestamps exist on the server.” Helvety (web + extension) also stores **structural metadata** in plaintext so lists can be filtered and filed without decrypting every row on the server. Those fields are catalog ids and numbers, not your written content.

## Plaintext on servers (by design)

**Entity content** (task/note/contact/link **text**) is **not** sent to Helvety or Supabase as plaintext by this extension. Reads use **ciphertext columns** from `@helvety/shared/e2ee-entity-columns` (`E2EE_LIST_COLUMNS` / `E2EE_DETAIL_COLUMNS`); decryption runs in the side panel.

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

**PRF salt** is a public HKDF parameter; security comes from the passkey private key. **Key check value (KCV)** is an encrypted blob to detect a wrong derived key — not human-readable content. On first successful unlock when no KCV exists yet, the extension backfills it via shared `backfillKeyCheckValueIfMissing` (PostgREST update on `user_passkey_params.key_check_value`), matching the web auth app login bootstrap.

## Hardcoded “public” config (not a leak)

`config.ts` embeds the Supabase project URL and **publishable** key (and Helvety HTTPS origins). Same as `NEXT_PUBLIC_SUPABASE_*` on helvety.com.

- Safe to commit and ship in the bundle.
- Does **not** decrypt data without the passkey-derived master key.
- Does **not** replace RLS.
- **Never** add server secrets (`SUPABASE_SECRET_KEY`, `sb_secret_*`, etc.).

User **access tokens** after OTP sign-in are mirrored to `chrome.storage.session` (cleared when the browser session ends). **Refresh tokens** and the Supabase session JSON remain in `chrome.storage.local`. Sensitive at runtime; not entity plaintext.

**Session and vault policy (aligned with helvety.com):** TTL constants come from `@helvety/shared/auth-session-policy` (no extension env vars). OTP sign-in uses server routes on `helvety.com/auth/api/extension/otp/*` with EU/EEA attestation (not direct Supabase OTP from the client). After OTP verify, the auth app returns a server-minted HMAC **`weekly_proof`** stored in `chrome.storage.local` (`helvety_extension_weekly_proof`) — same payload/secret as web `helvety_device_trust`. Bearer passkey routes require header `X-Helvety-Weekly-Proof`. Supabase hosted settings: **JWT expiry 3600s**, **session time-box 7d**, **inactivity 24h**. Vault master keys in IndexedDB follow **24h sliding idle** and **7d absolute max**; the side panel uses `useVaultIdleLock`, `onKeyEvent`, and `touchVaultSessionInStorage` on entity activity. Missing/expired weekly proof or vault policy triggers sign-out or passkey re-unlock. Session bootstrap uses **`getUser()` for authorization** (`extension-session.ts`); `getSession()` is only used after JWT validation to read the access token.

### Weekly proof vs web device trust (threat model)

Helvety web apps mint an **HttpOnly HMAC-signed** `helvety_device_trust` cookie after email verification. E2EE server pages and mutations enforce it via `requireDeviceTrust` — tampering without the signing secret fails server-side. The extension **does not mint device-trust cookies** on helvety.com; it stores the same HMAC schema as `weekly_proof` locally and sends `X-Helvety-Weekly-Proof` on Bearer routes (`authenticateBearerRequest` verifies server-side).

The extension **cannot** set helvety.com cookies. Extension OTP verify returns a **`weekly_proof`** token (same HMAC schema) for `chrome.storage.local`. `authenticateBearerRequest` verifies the proof on passkey routes; `resolveVerifiedExtensionSession` requires a valid stored proof before PostgREST.

| Mechanism         | Web (helvety.com)             | Extension                                                  |
| ----------------- | ----------------------------- | ---------------------------------------------------------- |
| Storage           | HttpOnly signed cookie        | `chrome.storage.local` signed weekly proof                 |
| Enforcement       | Server (`requireDeviceTrust`) | Server (`authenticateBearerRequest`) + client session gate |
| Tamper resistance | HMAC + server verify          | HMAC + server verify; GoTrue time-box + RLS                |

**Implication:** A modified extension build could skip local proof checks for PostgREST UX, but **cannot forge** a valid HMAC weekly proof or Supabase JWT without re-authenticating via OTP. **RLS and JWT validity still gate PostgREST**; vault content still requires passkey + PRF.

**Cross-app entity links:** edit forms include shared `EntityLinksPanel` sections (tasks ↔ notes ↔ contacts ↔ links). Link rows are stored in Supabase `entity_links` (structural metadata only); linked record titles are decrypted client-side for display. Load/link/unlink failures in `extension-entity-links-hooks.tsx` surface user-visible toasts (`getE2eeHookErrorMessage`); `<Toaster>` is mounted in `App.tsx`.

## Entity content (tasks, notes, contacts, links)

### Fetch

List and single-record (edit-form) queries use explicit projections from `@helvety/shared/e2ee-entity-columns` — **no `select('*')`**. `E2EE_LIST_COLUMNS` loads grouped list rows; `E2EE_DETAIL_COLUMNS` loads the full ciphertext fields needed when opening the editor. Tests assert selects never include plaintext content column names (shared `@helvety/shared/e2ee-write-guard`).

Passkey unlock params: `PASSKEY_PARAMS_SELECT` from `@helvety/shared/user-passkey-params-client` (re-exported by `extension-passkey-params.ts`) — crypto metadata only.

### Decrypt

`decrypt-entities.ts` uses `@helvety/shared/crypto/encryption` with **field-bound AAD** (`table:recordId:column` per `encrypted_*` column). Plaintext exists in extension memory and React state while unlocked.

**Vault lock vs sign-out (aligned with helvety.com):** idle vault lock calls `deleteMasterKey` + `clearAllKeys` and wipes decrypted list/form state (`App.tsx` `clearDecryptedEntityState`) but **keeps** the cached PRF salt for faster re-unlock. Sign-out calls `clearAllKeys` + `clearCachedPRFSalt`, clears weekly proof, and wipes decrypted state. The same in-memory wipe runs when `user_id` changes so another account never sees the previous user’s rows before the next fetch.

**Limitation:** malware, a tampered build, or a debugger can read memory. “Client-side only” means **not sent as plaintext over the network by this code**, not “unextractable on a hostile machine.”

### Master key

Derived from WebAuthn **PRF** (`passkey-unlock.ts`), stored in **IndexedDB** (extension origin only). PRF output and the raw `CryptoKey` are **not** in the passkey verify JSON body (`passkey-unlock.test.ts` asserts `clientExtensionResults` is omitted).

A master key unlocked on **helvety.com** is **not** available in this extension (`chrome-extension://…` is a separate storage context).

### Writes

Create, update, and delete entity **content** use **direct Supabase PostgREST** (`entity-repository.ts`) with payloads from `encrypt-entities.ts`. Only **serialized ciphertext** in `encrypted_*` columns; `assertEncryptedWritePayloadAuto` from `@helvety/shared/e2ee-write-guard` runs before every insert/update. Structural metadata and default ids come from `@helvety/shared/e2ee-entity-defaults`. **Create** may pass an optional `clientRecordId` so ciphertext AAD matches the row id (same contract as web zone open-first create); the side panel UI is still **save-then-edit** (empty form until Save), not instant sheet open. Link URLs are normalized client-side before encryption (`link-url-normalize.ts`).

**Cross-app links** (link/unlink between tasks, notes, contacts, and links) use `entity-link-repository.ts` and `@helvety/shared/entity-links-client` on the `entity_links` table — structural metadata only (no decrypted titles in link rows).

- Every mutation uses `.eq("user_id", userId)` plus Supabase RLS.
- Does **not** call Next.js server actions.
- Tests scan insert/update payloads for forbidden plaintext content keys.

## What is sent where (by design)

| Data                                                      | Where                     | Notes                                                               |
| --------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------- |
| Email + OTP send/verify                                   | **`HELVETY_AUTH_ORIGIN`** | EU/EEA attestation; session via `setSession`                        |
| `Authorization: Bearer` + `X-Helvety-Weekly-Proof`        | **`HELVETY_AUTH_ORIGIN`** | Passkey options/verify only; weekly proof HMAC-verified server-side |
| WebAuthn assertion + `challengeEnvelope`                  | **Helvety auth**          | No entity plaintext; no PRF in body                                 |
| `prf_salt`, `version`, `credential_id`, `key_check_value` | **Supabase**              | `user_passkey_params` under RLS                                     |
| Ciphertext + structural metadata                          | **Supabase**              | Operators/backups see ciphertext/metadata                           |

Auth responses use `@helvety/shared/parse-action-response` in `helvety-auth-api.ts`. Unlock logs omit user ids and tokens; passkey auth HTTP failures log URL/status as `[helvety-unlock]` in production (other unlock steps are dev-only).

## PRF output in verify requests

`clientExtensionResults` is **not** in the JSON body to `EXTENSION_PASSKEY_VERIFY_PATH`. PRF stays in the extension to derive the master key after verify succeeds.

## Passkey unlock and production

1. **Supabase** — PRF params (`extension-passkey-params.ts`).
2. **Auth HTTP** — options + verify with `challengeEnvelope` when routes are deployed on `HELVETY_AUTH_ORIGIN`.

`EXTENSION_PASSKEY_PARAMS_PATH` is **doc-only**; runtime params use Supabase, not that URL.

## Extension surface

| Surface            | Data handling                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MV3 `permissions`  | `storage`, `sidePanel`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `host_permissions` | `*.supabase.co`, `helvety.com` (auth + gateway links)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `side_panel`       | Global panel at `index.html`; toolbar icon opens it (`background.js` `openPanelOnActionClick`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `background.js`    | Side panel open behavior only — no entity I/O or auth ceremony                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Side panel UI      | Edit-first lists (grouped tasks/notes/contacts, links tree); row tap opens the editor except links (tap opens URL). Task/note **descriptions** and contact **notes** use TipTap (`EntityRichTextEditor` + shared `@helvety/ui/tiptap-editor`). Forms use `@helvety/ui/form-field` and dirty-gated save. **Delete:** list rows (tasks/notes/contacts) or edit **header** trash (`DataTabsView`), not the form footer. Row actions use `Trash2Icon` via `IconTooltipButton` → `@helvety/ui/row-action-button`. React remount key is **`entityFormSessionKey`** (record id), not live draft text; TipTap **`content` is mount-only** (`initialContentRef`) so v3 `setOptions` does not eat keystrokes. Web zone editors use the same pattern (`E2eeRichTextItemEditorShell`, `editorSessionKey`). Session email on sign-out tooltip only (`variant="ghost"`). **Open in web app**: list mode opens zone path on gateway; edit mode opens entity deep link. Link/folder up-down reorder within tree level. Tab switch with unsaved form shows discard dialog. Tokens: `@helvety/extension-chrome/extension-tokens.css` imported from `globals.css`. |
| About tab          | Version, extension id, auth origin, passkey API URL — **no** access tokens or OTP in DOM                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Production console | Passkey auth fetch failures log as `[helvety-unlock]` (URL/status only); other unlock steps are dev-only                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

## Helvety vs infrastructure

- **Helvety auth** (when extension routes are deployed) verifies WebAuthn without requiring decrypted entity plaintext on the server.
- **Supabase** provides Auth and Postgres. TLS in transit; at-rest depends on your project.

If this document disagrees with the code, **the code wins**.
