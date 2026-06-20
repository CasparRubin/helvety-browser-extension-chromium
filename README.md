# Helvety Chromium extension

Chromium MV3 **side panel** extension for **Helvety** [helvety.com](https://helvety.com): email OTP sign-in via the Helvety auth API, **passkey + PRF** unlock for E2EE, and **full CRUD** for tasks, notes, contacts, links, and link folders (decrypted in the side panel after unlock).

You do **not** need the Helvety monorepo or a local auth server to **build** this project. Public URLs and Supabase keys are hardcoded in **`src/lib/config.ts`**.

## What works today (production)

| Feature                                                         | Status                                                                                                                                                                                 |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build & load unpacked (`dist/`)                                 | Yes                                                                                                                                                                                    |
| Email OTP sign-in                                               | Yes — server routes on `helvety.com/auth/api/extension/otp/*` with EU/EEA attestation (not direct Supabase OTP from the client)                                                        |
| Cross-app entity links                                          | Yes — link/unlink tasks, notes, contacts, and links in edit forms (`EntityLinksPanel`)                                                                                                 |
| Open in web app (list + edit)                                   | Yes — list opens zone path on gateway; edit opens entity deep link (`buildE2eeDeepLink`)                                                                                               |
| PRF params read (preflight)                                     | **Usually yes** when signed in — Supabase `user_passkey_params`; unlock UI shows `ready` / `not set up` / `cannot load: …`                                                             |
| Decrypted lists + CRUD (tasks, notes, contacts, links, folders) | **Only after full passkey unlock in the extension** — create, edit, and delete from the side panel (edit-first lists; links open URL on tap; up/down reorder within each list level)   |
| Passkey unlock (WebAuthn on auth)                               | **Yes** when `helvety.com/auth` serves JSON on `options` / `verify` and Vercel `HELVETY_CHROME_EXTENSION_ORIGINS` includes your runtime extension id (Edge/Chrome unpacked ids differ) |

You can sign in and the extension will load PRF params when configured (preflight on the unlock screen). **Decrypted lists and CRUD** require a successful passkey unlock in this extension: production auth must expose the passkey API routes and allowlist your extension id on `helvety-auth` (see monorepo [`apps/auth/docs/extension-passkey-production.md`](https://github.com/CasparRubin/helvety/blob/main/apps/auth/docs/extension-passkey-production.md)). Unlocking on [helvety.com](https://helvety.com) does **not** unlock this extension — master keys are per browser context. See [docs/webauthn-extension.md](docs/webauthn-extension.md).

## What talks to what

| Piece                             | Runs where                                                                                                                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Email OTP send / verify           | **`HELVETY_AUTH_ORIGIN`** — `EXTENSION_OTP_SEND_PATH` and `EXTENSION_OTP_VERIFY_PATH` (EU/EEA attestation; session tokens via `setSession` into Supabase client storage)                         |
| PRF params (salt, KCV)            | **Supabase** PostgREST — `PASSKEY_PARAMS_SELECT` in `extension-passkey-params.ts`                                                                                                                |
| OTP session storage               | **Supabase client** (`extension-supabase.ts`) — refresh token in `chrome.storage.local`; access token mirrored to `chrome.storage.session` (not website cookies)                                 |
| Passkey options / verify          | **`HELVETY_AUTH_ORIGIN`** — `EXTENSION_PASSKEY_OPTIONS_PATH` and `EXTENSION_PASSKEY_VERIFY_PATH` only                                                                                            |
| Encrypted list and edit-form rows | **Supabase** PostgREST — projections in `e2ee-data-select.ts` (`*_LIST_SELECT` for grouped lists; `*_DETAIL_SELECT` when opening the editor)                                                     |
| Decryption                        | **This extension** — `decrypt-entities.ts` and `@helvety/shared` crypto (client-side only)                                                                                                       |
| Writes (entity content + links)   | **Supabase** PostgREST — `encrypt-entities.ts` + `entity-repository.ts` (ciphertext in `encrypted_*`); cross-app links via `entity-link-repository.ts` + `entity-links-client` on `entity_links` |

The legacy `EXTENSION_PASSKEY_PARAMS_PATH` constant is **documentation for auth deploy**; the extension does **not** call that URL at runtime.

## Why `pnpm install` fetches the Helvety repo

Workspace packages supply **extension chrome**, **UI primitives**, **brand assets**, and **cryptography** aligned with helvety.com:

| Package                     | Role in this extension                                                                 |
| --------------------------- | -------------------------------------------------------------------------------------- |
| `@helvety/extension-chrome` | Side panel shell, theme boot / `usePopupTheme`, shared `PopupHeader`, scroll utilities |
| `@helvety/ui`               | Tabs, buttons, inputs, list states (flat PP-style surfaces)                            |
| `@helvety/shared`           | E2EE crypto and shared utilities                                                       |
| `@helvety/brand`            | Helvety mark in the About **Developer** section                                        |

Auth HTTP routes stay on the deployed auth service (not in these packages). `preinstall` runs `scripts/ensure-helvety.mjs`:

- If **`../helvety`** exists: **junction/symlink** `.helvety` → sibling monorepo (read-only for install; does not patch sibling `package.json`).
- Otherwise: shallow **clone** into **`.helvety/`** (gitignored).

That vendor tree is **not** required to run the extension in Chrome—only to compile.

## Side panel UI (structure)

Requires **Chrome 114+** (or equivalent Chromium) for the Side Panel API.

- Entry: `index.html` → `src/popup/main.tsx` (imports `@helvety/extension-chrome/theme-boot` before React). The `src/popup/` path is the React UI module (legacy folder name); the Chrome surface is the side panel, not an action popup.
- Surface: global side panel (`manifest.json` `side_panel.default_path`); toolbar icon opens the panel via `background.ts` (`openPanelOnActionClick`).
- Root: `src/popup/App.tsx` — sign-in, unlock, or data tabs after session + passkey unlock; clears decrypted state on sign-out and account switch.
- Views: `src/popup/views/` — `SignInView`, `UnlockView`, `DataTabsView` (grouped lists + edit-first navigation), `EntityFormView`, `AboutTab`.
- Lists: `src/popup/components/lists/` — stage/category groups and links tree (mobile-style rows); row tap opens the edit form (links: tap opens URL, pencil opens edit); up/down reorder for tasks, notes, contacts, links, and folders.
- **Open in web app**: list mode opens the zone path on the gateway; edit mode opens an entity deep link (`buildE2eeDeepLink`).
- **Unsaved changes**: switching tabs or canceling an edit form with a dirty draft shows the shared discard dialog (`isFormDraftDirty`).
- Metadata pickers: `catalog-picker.tsx` — colored stage/label/category/priority toggles aligned with web apps.
- Tooltips: `@helvety/ui/tooltip` via `IconTooltipButton`; session email appears on sign-out hover only (not as always-visible header text).
- Layout: full viewport height in the side panel; `EntityScreenLayout` — scrollable body with pinned footers (Add / Edit / Save); sharp borders via `extension-tokens.css`.
- Rich text: `entity-rich-text.ts` + lazy `EntityRichTextEditor` (TipTap) for task/note descriptions and contact notes; remount key is `entityFormSessionKey` (record identity), not serialized draft text — same idea as web `E2eeRichTextItemEditorShell`; plain `Input`/`Textarea` for other fields.
- E2EE data layer: `entity-repository.ts`, `entity-link-repository.ts`, `encrypt-entities.ts`, `decrypt-entities.ts` under `src/lib/`.
- Entity links UI: `extension-entity-links-hooks.tsx`, `ExtensionEntityLinkPanels.tsx` in edit forms.
- Chrome: `src/popup/components/PopupHeader.tsx` (wraps shared header; icon URL from `extension-icon.ts` → `assets/icon-48.png`).
- Theme: `chrome.storage.local` key `helvetyPopupThemePreference` via `usePopupTheme` (not `next-themes`).
- OTP mid-flow: persisted in `chrome.storage.local` (`pending-otp-storage.ts`) when the panel is closed before verification.
- About tab: version, extension ID, auth origin, passkey API URL, security doc links; **no** session tokens or OTP in the DOM.

## Session and vault policy

Aligned with helvety.com (`@helvety/shared/auth-session-policy.ts`; no extension env vars):

- **Weekly OTP anchor (client UX)** — after OTP verify, `helvety_extension_last_email_verified` in `chrome.storage.local` records when email was last verified (**7d** window). This is **not** a cryptographic proof; it pairs with server-issued JWT age checks.
- **JWT max lifetime (server-enforced)** — `resolveVerifiedExtensionSession` rejects access tokens whose `iat` exceeds **7d** (`@helvety/shared/jwt-session-lifetime`). Align Supabase Dashboard → Authentication → Sessions JWT expiry to the same cap. The extension does **not** receive the web `helvety_device_trust` cookie.
- **Vault idle lock** — IndexedDB master keys follow **24h sliding idle** and **7d absolute max**; `useVaultIdleLock` and `touchVaultSessionInStorage` on entity CRUD renew activity.

### Token storage threat model

| Token / data      | Storage                      | Notes                                                                      |
| ----------------- | ---------------------------- | -------------------------------------------------------------------------- |
| Refresh token     | `chrome.storage.local`       | Persists across browser restarts (standard MV3 Supabase adapter)           |
| Access token      | `chrome.storage.session`     | Cleared when the browser session ends; also embedded in local session JSON |
| OTP anchor        | `chrome.storage.local`       | UX timestamp only — tampering cannot extend JWT validity                   |
| Master key (E2EE) | IndexedDB (extension origin) | Requires passkey unlock; separate from helvety.com web storage             |

Malware or a modified extension build can read extension storage. **RLS + valid JWT + passkey/PRF** remain the server and crypto boundaries. See [docs/SECURITY-E2EE.md](docs/SECURITY-E2EE.md).

## Prerequisites

- Node 22+ and **pnpm**
- Git (for the shallow clone when `../helvety` is absent)

When passkey unlock is enabled on production auth, operators set **`HELVETY_CHROME_EXTENSION_ORIGINS`** on Vercel (`helvety-auth`) to your runtime id (from `edge://extensions/?id=…` or `chrome://extensions`, or `chrome.runtime.id` in side panel DevTools). See [docs/webauthn-extension.md](docs/webauthn-extension.md).

## Setup

```bash
git clone https://github.com/CasparRubin/helvety-browser-extension-chromium.git
cd helvety-browser-extension-chromium
pnpm install
pnpm build
```

Load **`dist/`** in a Chromium browser (Chrome 114+, Edge, …): Extensions → Developer mode → **Load unpacked** → select the `dist` folder. Click the Helvety toolbar icon to open the side panel.

## Configuration

Edit **`src/lib/config.ts`** and rebuild to change production URLs or Supabase keys.

The values there are **public client config** (same as `NEXT_PUBLIC_*` on helvety.com): project URL, publishable/anon key, and HTTPS app URLs. They are **intentionally not secret** — RLS and user sessions protect data, not hiding those strings. **Never** put server secrets (`SUPABASE_SECRET_KEY`, `sb_secret_*`, etc.) in the extension. See the comment block at the top of `config.ts`.

| Setting              | Constant / location                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------- |
| Auth zone (default)  | `HELVETY_AUTH_ORIGIN` → `https://helvety.com/auth`                                          |
| Auth zone (override) | Optional build-time `VITE_HELVETY_AUTH_ORIGIN` (non-production only; default is production) |
| Web deep links       | `HELVETY_GATEWAY` → `https://helvety.com`                                                   |
| Supabase (public)    | `HELVETY_SUPABASE_URL`, `HELVETY_SUPABASE_PUBLISHABLE_KEY`                                  |

## Scripts

```bash
pnpm test          # src/lib/*.test.ts + tests/*.test.ts
pnpm type-check
pnpm ci:check
pnpm ci:release   # check + build → dist/
```

## Repository layout

| Path                         | Purpose                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/`                   | Helvety auth API (`helvety-auth-api.ts`), Supabase session (`extension-supabase.ts`), passkey unlock, encrypt/decrypt, entity + link repositories, config (E2EE core)                                                                                                                                                                                                |
| `src/popup/`                 | React side panel shell and views                                                                                                                                                                                                                                                                                                                                     |
| `public/manifest.json`       | MV3 manifest (`name` must match `EXTENSION_DISPLAY_NAME` in `about-meta.ts`; `side_panel.default_path`)                                                                                                                                                                                                                                                              |
| `tests/`                     | Vitest drift/contract tests (`about-meta`, `readme-vendor-docs`, `manifest-side-panel`, `background-side-panel`, `pending-otp-storage`, `entity-catalog-drift`, `side-panel-chrome`, `security-e2ee-docs`, `auth-session-policy-wiring`, `extension-chrome-shell`, `theme-preference`, `webauthn-docs`, `supabase-auth-patterns`, `copy-accuracy`, `tsconfig-build`) |
| `src/**/*.test.ts`           | Co-located unit tests (`helvety-auth-api`, `entity-link-repository`, `entity-catalogs`, `entity-navigation` + `entityFormSessionKey`, `entity-rich-text-editor`, `list-group-utils`, `link-tree`, `e2ee-data-select`, `dead-export-cleanup`, repository/crypto guards, …)                                                                                            |
| `src/lib/e2ee-privacy.ts`    | Forbidden plaintext column names; guarded by `e2ee-privacy.test.ts` and select/mutation tests                                                                                                                                                                                                                                                                        |
| `scripts/ensure-helvety.mjs` | Vendor Helvety monorepo packages into `.helvety/` before `pnpm install`                                                                                                                                                                                                                                                                                              |

## Docs

- [docs/SECURITY-E2EE.md](docs/SECURITY-E2EE.md) — privacy model: client-side content encryption, what stays on Supabase (email, timestamps, structural metadata), data flows
- [docs/webauthn-extension.md](docs/webauthn-extension.md) — passkey ceremony and auth deployment checklist

## E2EE writes (after unlock)

Create, edit, and delete tasks (`items`), notes, contacts, links, and link folders from the side panel. Lists are **edit-first**: tapping a row opens the editor (links open the URL on tap; use the pencil to edit). Tasks, notes, contacts, links, and folders support **up/down reorder** within their list level. **Open in web app** opens the zone path from list mode or an entity deep link from edit mode. Switching tabs with an unsaved edit shows the discard dialog. Deletes are available from list rows (tasks, notes, contacts) or the edit form (including links and folders). Writes go to Supabase with the same field-level encryption as the web apps (no Next.js server actions). Structural fields (category, stage, folder, priority) are stored in plaintext on Supabase like the web apps — see [docs/SECURITY-E2EE.md](docs/SECURITY-E2EE.md).
