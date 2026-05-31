# Helvety Chromium extension

Chromium MV3 extension for **Helvety** [helvety.com](https://helvety.com): email OTP sign-in (Supabase Auth), **passkey + PRF** unlock for E2EE, and **full CRUD** for tasks, notes, contacts, links, and link folders (decrypted only in the extension after unlock).

You do **not** need the Helvety monorepo or a local auth server to **build** this project. Public URLs and Supabase keys are hardcoded in **`src/lib/config.ts`**.

## What works today (production)

| Feature                                                         | Status                                                                                                                                                                                 |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build & load unpacked (`dist/`)                                 | Yes                                                                                                                                                                                    |
| Email OTP sign-in                                               | Yes — production Supabase project in `config.ts`                                                                                                                                       |
| PRF params read (preflight)                                     | **Usually yes** when signed in — Supabase `user_passkey_params`; unlock UI shows `ready` / `not set up` / `cannot load: …`                                                             |
| Decrypted lists + CRUD (tasks, notes, contacts, links, folders) | **Only after full passkey unlock in the extension** — create, view details, edit, delete from the popup                                                                                |
| Passkey unlock (WebAuthn on auth)                               | **Yes** when `helvety.com/auth` serves JSON on `options` / `verify` and Vercel `HELVETY_CHROME_EXTENSION_ORIGINS` includes your runtime extension id (Edge/Chrome unpacked ids differ) |

You can sign in and the extension will load PRF params when configured (preflight on the unlock screen). **Decrypted lists and CRUD** require a successful passkey unlock in this extension: production auth must expose the passkey API routes and allowlist your extension id on `helvety-auth` (see monorepo [`apps/auth/docs/extension-passkey-production.md`](https://github.com/CasparRubin/helvety/blob/main/apps/auth/docs/extension-passkey-production.md)). Unlocking on [helvety.com](https://helvety.com) does **not** unlock this extension — master keys are per browser context. See [docs/webauthn-extension.md](docs/webauthn-extension.md).

## What talks to what

| Piece                         | Runs where                                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Email OTP sign-in             | **Supabase Auth** (`HELVETY_SUPABASE_*` in `config.ts`)                                                    |
| PRF params (salt, KCV)        | **Supabase** PostgREST — `PASSKEY_PARAMS_SELECT` in `extension-passkey-params.ts`                          |
| Passkey options / verify      | **`HELVETY_AUTH_ORIGIN`** — `EXTENSION_PASSKEY_OPTIONS_PATH` and `EXTENSION_PASSKEY_VERIFY_PATH` only      |
| Encrypted list/detail rows    | **Supabase** PostgREST — projections in `e2ee-data-select.ts`                                              |
| Decryption                    | **This extension** — `decrypt-entities.ts` and `@helvety/shared` crypto (client-side only)                 |
| Writes (insert/update/delete) | **Supabase** PostgREST — `encrypt-entities.ts` + `entity-repository.ts` (ciphertext only in `encrypted_*`) |

The legacy `EXTENSION_PASSKEY_PARAMS_PATH` constant is **documentation for auth deploy**; the extension does **not** call that URL at runtime.

## Why `pnpm install` fetches the Helvety repo

Workspace packages supply **popup chrome**, **UI primitives**, **brand assets**, and **cryptography** aligned with helvety.com:

| Package                     | Role in this extension                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------------------- |
| `@helvety/extension-chrome` | Popup shell (800px, Chrome max), theme boot / `usePopupTheme`, shared `PopupHeader`, scroll utilities |
| `@helvety/ui`               | Tabs, buttons, inputs, list states (flat PP-style surfaces)                                           |
| `@helvety/shared`           | E2EE crypto and shared utilities                                                                      |
| `@helvety/brand`            | Helvety mark in the About **Developer** section                                                       |

Auth HTTP routes stay on the deployed auth service (not in these packages). `preinstall` runs `scripts/ensure-helvety.mjs`:

- If **`../helvety`** exists: **junction/symlink** `.helvety` → sibling monorepo (read-only for install; does not patch sibling `package.json`).
- Otherwise: shallow **clone** into **`.helvety/`** (gitignored).

That vendor tree is **not** required to run the extension in Chrome—only to compile.

## Popup UI (structure)

- Entry: `index.html` → `src/popup/main.tsx` (imports `@helvety/extension-chrome/theme-boot` before React).
- Root: `src/popup/App.tsx` — sign-in, unlock, or data tabs after session + passkey unlock; clears decrypted state on sign-out and account switch.
- Views: `src/popup/views/` — `SignInView`, `UnlockView`, `DataTabsView` (lists + navigation), `EntityDetailView`, `EntityFormView`, `AboutTab`.
- Layout: `EntityScreenLayout` — scrollable body with pinned footers (Add / Edit / Save); sharp borders via `extension-tokens.css`.
- Rich text: `entity-rich-text.ts` + lazy `EntityRichTextEditor` (TipTap) for task/note descriptions and contact notes; plain `Input`/`Textarea` for other fields.
- E2EE data layer: `entity-repository.ts`, `encrypt-entities.ts`, `decrypt-entities.ts` under `src/lib/`.
- Chrome: `src/popup/components/PopupHeader.tsx` (wraps shared header + `assets/icon-48.png`).
- Theme: `chrome.storage.local` key `helvetyPopupThemePreference` via `usePopupTheme` (not `next-themes`).
- About tab: version, extension ID, auth origin, security doc links; **no** session tokens or OTP in the DOM.

## Prerequisites

- Node 22+ and **pnpm**
- Git (for the shallow clone when `../helvety` is absent)

When passkey unlock is enabled on production auth, operators set **`HELVETY_CHROME_EXTENSION_ORIGINS`** on Vercel (`helvety-auth`) to your runtime id (from `edge://extensions/?id=…` or `chrome://extensions`, or `chrome.runtime.id` in popup DevTools). See [docs/webauthn-extension.md](docs/webauthn-extension.md).

## Setup

```bash
git clone https://github.com/CasparRubin/helvety-browser-extension-chromium.git
cd helvety-browser-extension-chromium
pnpm install
pnpm build
```

Load **`dist/`** in a Chromium browser (Chrome, Edge, …): Extensions → Developer mode → **Load unpacked** → select the `dist` folder.

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
pnpm test          # src/lib/*.test.ts + src/popup/*.test.ts + tests/*.test.ts
pnpm type-check
pnpm ci:check
pnpm ci:release   # check + build → dist/
```

## Repository layout

| Path                         | Purpose                                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `src/lib/`                   | Supabase auth, passkey unlock, encrypt/decrypt, repository CRUD, config (E2EE core)                                 |
| `src/popup/`                 | React popup shell and views                                                                                         |
| `public/manifest.json`       | MV3 manifest (`name` must match `EXTENSION_DISPLAY_NAME` in `about-meta.ts`)                                        |
| `tests/`                     | Vitest drift/contract tests (`about-meta`, `readme-vendor-docs`, `popup-chrome`, `popup-shell`, `theme-preference`) |
| `src/lib/e2ee-privacy.ts`    | Forbidden plaintext column names; guarded by `e2ee-privacy.test.ts` and select/mutation tests                       |
| `scripts/ensure-helvety.mjs` | Vendor Helvety monorepo packages into `.helvety/` before `pnpm install`                                             |

## Docs

- [docs/SECURITY-E2EE.md](docs/SECURITY-E2EE.md) — privacy model: client-side content encryption, what stays on Supabase (email, timestamps, structural metadata), data flows
- [docs/webauthn-extension.md](docs/webauthn-extension.md) — passkey ceremony and auth deployment checklist

## E2EE writes (after unlock)

Create, view full decrypted details, edit, and delete tasks (`items`), notes, contacts, links, and link folders from the popup. Writes go to Supabase with the same field-level encryption as the web apps (no Next.js server actions). Structural fields (category, stage, folder, priority) are stored in plaintext on Supabase like the web apps — see [docs/SECURITY-E2EE.md](docs/SECURITY-E2EE.md).
