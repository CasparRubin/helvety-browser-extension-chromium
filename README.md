# Helvety Chromium extension

Chromium MV3 **side panel** extension for **Helvety** [helvety.com](https://helvety.com): email OTP sign-in via the Helvety auth API, **passkey + PRF** unlock for E2EE, and **full CRUD** for tasks, notes, contacts, links, and link folders (decrypted in the side panel after unlock).

You do **not** need the Helvety monorepo or a local auth server to **build** this project. Public URLs and Supabase keys are hardcoded in **`src/lib/config.ts`**.

## What works today (production)

| Feature                                                         | Status                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build & load unpacked (`dist/`)                                 | Yes                                                                                                                                                                                                                                                                          |
| Email OTP sign-in                                               | Yes — server routes on `helvety.com/auth/api/extension/otp/*` with EU/EEA attestation (not direct Supabase OTP from the client); **creates a Helvety account when the email is new** (same server path as helvety.com)                                                       |
| Cross-app entity links                                          | Yes — link/unlink tasks, notes, contacts, and links in edit forms (`EntityLinksPanel`)                                                                                                                                                                                       |
| Open in web app (list + edit)                                   | Yes — list opens zone path on gateway; edit opens entity deep link (`buildE2eeDeepLink`)                                                                                                                                                                                     |
| PRF params read (preflight)                                     | **Usually yes** when signed in — Supabase `user_passkey_params`; status on **About** tab (`ready` / `not set up` / error message)                                                                                                                                            |
| Decrypted lists + CRUD (tasks, notes, contacts, links, folders) | **Only after full passkey unlock in the extension** — create, edit, and delete from the side panel (edit-first lists; **create** opens an empty form then saves with a client-generated id passed to encrypt; links open URL on tap; up/down reorder within each list level) |
| Passkey unlock (WebAuthn on auth)                               | **Yes** when `helvety.com/auth` serves JSON on `options` / `verify` and Vercel `HELVETY_CHROME_EXTENSION_ORIGINS` includes your runtime extension id (Edge/Chrome unpacked ids differ)                                                                                       |

You can sign in and the extension will load PRF params when configured (preflight runs in the background; see About tab for status). **Decrypted lists and CRUD** require a successful passkey unlock in this extension: production auth must expose the passkey API routes and allowlist your extension id on `helvety-auth` (see monorepo [`apps/auth/docs/extension-passkey-production.md`](https://github.com/CasparRubin/helvety/blob/main/apps/auth/docs/extension-passkey-production.md)). Unlocking on [helvety.com](https://helvety.com) does **not** unlock this extension — master keys are per browser context. See [docs/webauthn-extension.md](docs/webauthn-extension.md).

## What talks to what

| Piece                             | Runs where                                                                                                                                                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Email OTP send / verify           | **`HELVETY_AUTH_ORIGIN`** — `EXTENSION_OTP_SEND_PATH` and `EXTENSION_OTP_VERIFY_PATH` (EU/EEA attestation; session tokens via `setSession` into Supabase client storage)                                                                    |
| PRF params (salt, KCV)            | **Supabase** PostgREST — `PASSKEY_PARAMS_SELECT` in `extension-passkey-params.ts`                                                                                                                                                           |
| OTP session storage               | **Supabase client** (`extension-supabase.ts`) — refresh token in `chrome.storage.local`; access token mirrored to `chrome.storage.session` (not website cookies)                                                                            |
| Passkey options / verify          | **`HELVETY_AUTH_ORIGIN`** — `EXTENSION_PASSKEY_OPTIONS_PATH` and `EXTENSION_PASSKEY_VERIFY_PATH` only                                                                                                                                       |
| Encrypted list and edit-form rows | **Supabase** PostgREST — projections from `@helvety/shared/e2ee-entity-columns` (`E2EE_LIST_COLUMNS` for grouped lists; `E2EE_DETAIL_COLUMNS` when opening the editor)                                                                      |
| Decryption                        | **This extension** — `@helvety/shared/crypto/e2ee-entity-crypto` via thin `decrypt-entities.ts` re-export (client-side only)                                                                                                                |
| Writes (entity content + links)   | **Supabase** PostgREST — `encrypt-entities.ts` (re-export of shared `e2ee-entity-crypto`) + `entity-repository.ts` (ciphertext in `encrypted_*`); cross-app links via `entity-link-repository.ts` + `entity-links-client` on `entity_links` |

The legacy `EXTENSION_PASSKEY_PARAMS_PATH` constant is **documentation for auth deploy**; the extension does **not** call that URL at runtime.

## Why `pnpm install` fetches the Helvety repo

Workspace packages supply **extension chrome**, **UI primitives**, **brand assets**, and **cryptography** aligned with helvety.com:

| Package                     | Role in this extension                                                                                                                                                                               |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@helvety/extension-chrome` | Side panel shell, theme boot / `usePopupTheme`, shared `PopupHeader`, scroll utilities                                                                                                               |
| `@helvety/ui`               | Base UI shadcn primitives (`base-vega`): tabs, buttons, inputs, tooltips, list states, `row-action-button`, `form-field`, `icon-size`, `public-tool-workspace`, `<Toaster>` via `@helvety/ui/sonner` |
| `sonner`                    | Transitive toast runtime used through `@helvety/ui/sonner`                                                                                                                                           |
| `@helvety/shared`           | E2EE SSOT: `e2ee-entity-catalogs`, entity columns/write-guard, URL normalize, domain types, draft validation, list grouping, link-tree ops, `crypto/e2ee-entity-crypto` (via thin extension facades) |
| `@helvety/brand`            | Helvety mark in the About **Developer** section                                                                                                                                                      |

Auth HTTP routes stay on the deployed auth service (not in these packages). `preinstall` runs `scripts/ensure-helvety.mjs`:

- If **`../helvety`** exists: **junction/symlink** `.helvety` → sibling monorepo (read-only for install; does not patch sibling `package.json`).
- Otherwise: shallow **clone** into **`.helvety/`** (gitignored).

That vendor tree is **not** required to run the extension in Chrome—only to compile.

## Side panel UI (structure)

Requires **Chrome 114+** (or equivalent Chromium) for the Side Panel API.

- Entry: `index.html` → `src/popup/main.tsx` (imports `@helvety/extension-chrome/theme-boot` before React). The `src/popup/` path is the React UI module (legacy folder name); the Chrome surface is the side panel, not an action popup.
- Surface: global side panel (`manifest.json` `side_panel.default_path`); toolbar icon opens the panel via `background.ts` (`openPanelOnActionClick`).
- Root: `src/popup/App.tsx` — composes `use-extension-auth`, `use-extension-vault`, `use-extension-entities`, and `use-extension-entity-form`; sign-in, unlock, or data tabs after session + passkey unlock; wires vault `onLocked` → wipe decrypted UI (`clearDecryptedEntityState` in `use-extension-entities.ts`).
- Views: `src/popup/views/` — `SignInView`, `UnlockView`, `DataTabsView` (grouped lists + edit-first navigation), `EntityFormView`, `AboutTab`.
- Lists: `src/popup/components/lists/` — stage/category groups and links tree (mobile-style rows); row tap opens the edit form (links: tap opens URL, pencil opens edit); up/down reorder for tasks, notes, contacts, links, and folders.
- **Open in web app**: list mode opens the zone path on the gateway; edit mode opens an entity deep link (`buildE2eeDeepLink`).
- **Save-first create**: **New** opens `formMode: "create"` with empty defaults from `@helvety/shared/e2ee-create-inputs` (no list row until Save); first Save encrypts with a client-generated id and switches to edit mode (same contract as helvety.com web zones).
- **Unsaved changes**: switching tabs or canceling an edit form with a dirty draft shows the shared discard dialog (`isFormDraftDirty`).
- Metadata pickers: `catalog-picker.tsx` — colored stage/label/category/priority toggles (`@helvety/ui/Button`) aligned with web apps.
- Row actions: `IconTooltipButton` wraps `@helvety/ui/row-action-button` with `showTooltip`; list delete uses `Trash2Icon` + `ICON_SIZE_CLASS`.
- Forms: `@helvety/ui/form-field` + `E2EE_EDITOR_FORM_FIELDS_STACK_CLASS`; save is dirty-gated in edit mode; delete lives in the edit **header** (`DataTabsView`), not the form footer.
- Tooltips: `@helvety/ui/tooltip` via `IconTooltipButton`; session email appears on sign-out hover only (not as always-visible header text). Unlock sign-out uses `variant="ghost"`.
- Layout: full viewport height in the side panel; `EntityScreenLayout` — scrollable body with pinned footers (Add / Save only); OKLCH tokens via `@helvety/extension-chrome/extension-tokens.css` and `@helvety/extension-chrome/popup.css` (imported from `src/globals.css`, not a local fork).
- Rich text: `entity-rich-text.ts` + lazy `EntityRichTextEditor` (shared `@helvety/ui/tiptap-editor`) for task/note descriptions and contact notes. Remount key is `entityFormSessionKey` (record identity), never serialized draft text; `content` is mount-only so TipTap v3 does not reset on each keystroke. Web apps mirror this in `E2eeRichTextItemEditorShell` (`editorSessionKey`). `@helvety/ui/input`, `@helvety/ui/textarea`, and `@helvety/ui/native-select` for other fields.
- E2EE data layer: `entity-repository.ts`, `entity-link-repository.ts`; `encrypt-entities.ts` / `decrypt-entities.ts` re-export `@helvety/shared/crypto/e2ee-entity-crypto`; `link-url-normalize.ts`, `link-tree.ts`, `entity-config.ts` re-export other shared E2EE modules under `src/lib/`.
- Hooks: `src/popup/hooks/use-extension-{auth,vault,entities,entity-form}.ts` — session, vault lock, decrypted lists, and form/draft state (orchestrated by `App.tsx`).
- Entity links UI: `extension-entity-links-hooks.tsx` (load/link/unlink failures surface `toast.error` via `getE2eeHookErrorMessage`), `ExtensionEntityLinkPanels.tsx` in edit forms.
- Chrome: `src/popup/components/PopupHeader.tsx` (wraps shared header; icon URL from `extension-icon.ts` → `assets/icon-48.png`).
- Theme: `usePopupTheme` persists the side-panel preference under `STORAGE_KEY_SIDE_PANEL_THEME` (current storage value: `helvetyPopupThemePreference`; not `next-themes`).
- OTP mid-flow: persisted in `chrome.storage.local` (`pending-otp-storage.ts`) when the panel is closed before verification.
- About tab: version, extension ID, auth origin, passkey API URL, security doc links; **no** session tokens or OTP in the DOM.

## Session and vault policy

Aligned with helvety.com (`@helvety/shared/auth-session-policy.ts`; no extension env vars):

- **Weekly proof (server-HMAC)** — after OTP verify, auth returns `weekly_proof` stored in `helvety_extension_weekly_proof` (`chrome.storage.local`). Same payload/secret as web `helvety_device_trust`; sent as `X-Helvety-Weekly-Proof` on Bearer passkey routes.
- **Session bootstrap** — `resolveVerifiedExtensionSession` in `extension-session.ts` requires `getUser()`, a valid weekly proof, and an access token before unlock or PostgREST reads.
- **GoTrue session time-box** — align Supabase Dashboard → Authentication → Sessions: **JWT expiry 3600s**, **time-box 7d**, **inactivity 24h**. The extension does **not** receive the web HttpOnly device-trust cookie.
- **Vault idle lock** — IndexedDB master keys follow **24h sliding idle** and **7d absolute max**; `useVaultIdleLock`, `onKeyEvent`, and `touchVaultSessionInStorage` on entity CRUD renew activity.

### Token storage threat model

| Token / data      | Storage                      | Notes                                                                      |
| ----------------- | ---------------------------- | -------------------------------------------------------------------------- |
| Refresh token     | `chrome.storage.local`       | Persists across browser restarts (standard MV3 Supabase adapter)           |
| Access token      | `chrome.storage.session`     | Cleared when the browser session ends; also embedded in local session JSON |
| Weekly proof      | `chrome.storage.local`       | HMAC-signed by auth app; verified on Bearer routes                         |
| Master key (E2EE) | IndexedDB (extension origin) | Requires passkey unlock; separate from helvety.com web storage             |

Malware or a modified extension build can read extension storage. **RLS + valid JWT + passkey/PRF** remain the server and crypto boundaries. See [docs/SECURITY-E2EE.md](docs/SECURITY-E2EE.md).

## Prerequisites

- Node **24.x** and **pnpm**
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

`public/manifest.json` `host_permissions` must stay scoped to that same project URL (`${HELVETY_SUPABASE_URL}/*`), plus `helvety.com` / `*.helvety.com` for auth and deep links — not a broad `*.supabase.co` wildcard.

## Scripts

```bash
pnpm test              # src/**/*.test.ts(x) + tests/*.test.ts
pnpm test:coverage     # Vitest coverage (src/**; excludes background entry)
pnpm type-check
pnpm ci:check          # test + type-check + lint + consistency:extension-auth + consistency:extension-e2ee
pnpm ci:release        # check + build → dist/
```

Copy `env.example` to `.env.local` when you need a non-production `VITE_HELVETY_AUTH_ORIGIN` override during local builds.

Validation and release builds are **local only** — run `pnpm ci:check` or `pnpm ci:release` on your machine; there is no remote automation in this repo. To publish a packaged build, zip the contents of `dist/` after `pnpm ci:release` and upload it to a GitHub release manually.

## Repository layout

| Path                         | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/`                   | Helvety auth API (`helvety-auth-api.ts`), Supabase session (`extension-supabase.ts`), passkey unlock, thin E2EE re-exports (`encrypt-entities.ts`, `decrypt-entities.ts`, `link-url-normalize.ts`, `link-tree.ts`, `entity-config.ts`), entity + link repositories, config                                                                                                                                                                                                                                                                                    |
| `src/lib/entity-defaults.ts` | Thin re-export of `@helvety/shared/e2ee-entity-defaults` for create payloads                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `src/popup/hooks/`           | `use-extension-auth`, `use-extension-vault`, `use-extension-entities`, `use-extension-entity-form` — session, vault, lists, and form state                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `src/popup/lib/`             | `extension-entity-mutations.ts` — shared create/update/delete orchestration for entity forms                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `src/popup/`                 | React side panel shell and views                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `public/manifest.json`       | MV3 manifest (`name` must match `EXTENSION_DISPLAY_NAME` in `about-meta.ts`; `side_panel.default_path`)                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `tests/`                     | Vitest drift/contract tests (`about-meta`, `readme-vendor-docs`, `manifest-side-panel`, `background-side-panel`, `pending-otp-storage`, `e2ee-catalog-wiring`, `e2ee-crypto-wiring`, `e2ee-forms-wiring`, `e2ee-types-wiring`, `delete-copy-parity`, `dependency-pins`, `extension-config-wiring`, `guardrail-scripts`, `automation-policy-consistency`, `side-panel-chrome`, `security-e2ee-docs`, `auth-session-policy-wiring`, `extension-chrome-shell`, `theme-preference`, `webauthn-docs`, `supabase-auth-patterns`, `copy-accuracy`, `tsconfig-build`) |
| `src/**/*.test.ts(x)`        | Co-located unit tests (`helvety-auth-api`, `extension-entity-links-hooks`, `entity-link-repository`, `entity-navigation` + `entityFormSessionKey`, `entity-rich-text-editor`, `entity-drafts`, `extension-entity-mutations`, `dead-export-cleanup`, repository/crypto guards, …)                                                                                                                                                                                                                                                                              |
| `scripts/ensure-helvety.mjs` | Vendor Helvety monorepo packages into `.helvety/` before `pnpm install`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

## Docs

- [docs/SECURITY-E2EE.md](docs/SECURITY-E2EE.md) — privacy model: client-side content encryption, what stays on Supabase (email, timestamps, structural metadata), data flows
- [docs/webauthn-extension.md](docs/webauthn-extension.md) — passkey ceremony and auth deployment checklist

## E2EE writes (after unlock)

Create, edit, and delete tasks (`items`), notes, contacts, links, and link folders from the side panel. Lists are **edit-first**: tapping a row opens the editor (links open the URL on tap; use the pencil to edit). Tasks, notes, contacts, links, and folders support **up/down reorder** within their list level. **Open in web app** opens the zone path from list mode or an entity deep link from edit mode. Switching tabs with an unsaved edit shows the discard dialog. **Delete:** list rows for tasks, notes, and contacts; when editing any entity, delete is in the **header command bar** (back + title + trash), not the form footer. Writes go to Supabase with the same field-level encryption as the web apps (no Next.js server actions). Structural fields (category, stage, folder, priority) are stored in plaintext on Supabase like the web apps — see [docs/SECURITY-E2EE.md](docs/SECURITY-E2EE.md).
