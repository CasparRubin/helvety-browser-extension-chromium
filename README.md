# Helvety Chromium extension

Chromium MV3 extension for **Helvety** [helvety.com](https://helvety.com): email OTP sign-in (Supabase Auth), **passkey + PRF** unlock for E2EE, and read-only lists of tasks, notes, contacts, and links (decrypted only in the extension).

You do **not** need the Helvety monorepo or a local auth server to **build** this project. Public URLs and Supabase keys are hardcoded in **`src/lib/config.ts`**.

## What works today (production)

| Feature                                | Status                                                                                                                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build & load unpacked (`dist/`)        | Yes                                                                                                                                                                         |
| Email OTP sign-in                      | Yes — production Supabase project in `config.ts`                                                                                                                            |
| PRF params read (preflight)            | **Usually yes** when signed in — Supabase `user_passkey_params`; unlock UI shows `ready` / `not set up` / `cannot load: …`                                                  |
| Decrypted task/note/contact/link lists | **Only after full passkey unlock in the extension**                                                                                                                         |
| Passkey unlock (WebAuthn on auth)      | **Client + monorepo ready** — calls `options` / `verify` with signed `challengeEnvelope`; **production** needs auth redeploy at `HELVETY_AUTH_ORIGIN` (404/HTML until then) |

You can sign in and the extension will load PRF params when configured (preflight on the unlock screen). **List decryption** needs a successful passkey unlock here: auth must serve extension routes and allow `chrome-extension://<id>`. Unlocking on [helvety.com](https://helvety.com) does **not** unlock this extension — master keys are per browser context. See [docs/webauthn-extension.md](docs/webauthn-extension.md).

## What talks to what

| Piece                    | Runs where                                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| Email OTP sign-in        | **Supabase Auth** (`HELVETY_SUPABASE_*` in `config.ts`)                                               |
| PRF params (salt, KCV)   | **Supabase** PostgREST — `PASSKEY_PARAMS_SELECT` in `extension-passkey-params.ts`                     |
| Passkey options / verify | **`HELVETY_AUTH_ORIGIN`** — `EXTENSION_PASSKEY_OPTIONS_PATH` and `EXTENSION_PASSKEY_VERIFY_PATH` only |
| Encrypted list rows      | **Supabase** PostgREST — ciphertext projections in `e2ee-data-select.ts`                              |
| Decryption               | **This extension** — `decrypt-entities.ts` and `@helvety/shared` crypto (client-side only)            |

The legacy `EXTENSION_PASSKEY_PARAMS_PATH` constant is **documentation for auth deploy**; the extension does **not** call that URL at runtime.

## Why `pnpm install` fetches the Helvety repo

`@helvety/ui` and `@helvety/shared` supply **UI and cryptography** aligned with the web apps. Auth HTTP routes stay on the deployed auth service. `preinstall` runs `scripts/ensure-helvety.mjs`:

- Optional: symlink **`../helvety`** if you already have the monorepo.
- Otherwise: shallow clone into **`.helvety/`** (gitignored).

That clone is **not** required to run the extension in Chrome—only to compile.

## Prerequisites

- Node 22+ and **pnpm**
- Git (for the shallow clone when `../helvety` is absent)

When passkey unlock is enabled on production auth, operators must allow your extension origin in WebAuthn configuration (`chrome-extension://<id>` from Chrome → Extensions → Details). See [docs/webauthn-extension.md](docs/webauthn-extension.md).

## Setup

```bash
git clone https://github.com/CasparRubin/helvety-browser-extension-chromium.git
cd helvety-browser-extension-chromium
pnpm install
pnpm build
```

Load **`dist/`** in Chrome: Extensions → Developer mode → **Load unpacked** → select the `dist` folder.

## Configuration

Edit **`src/lib/config.ts`** and rebuild to change production URLs or Supabase keys.

The values there are **public client config** (same as `NEXT_PUBLIC_*` on helvety.com): project URL, publishable/anon key, and HTTPS app URLs. They are **intentionally not secret** — RLS and user sessions protect data, not hiding those strings. **Never** put server secrets (`SUPABASE_SECRET_KEY`, `sb_secret_*`, etc.) in the extension. See the comment block at the top of `config.ts`.

| Setting             | Constant / location                                              |
| ------------------- | ---------------------------------------------------------------- |
| Auth zone (default) | `HELVETY_AUTH_ORIGIN` → `https://helvety.com/auth`               |
| Auth zone (local)   | Build with `VITE_HELVETY_AUTH_ORIGIN=http://localhost:3001/auth` |
| Web deep links      | `HELVETY_GATEWAY` → `https://helvety.com`                        |
| Supabase (public)   | `HELVETY_SUPABASE_URL`, `HELVETY_SUPABASE_PUBLISHABLE_KEY`       |

## Scripts

```bash
pnpm test
pnpm type-check
pnpm ci:check
pnpm ci:release   # check + build → dist/
```

## Docs

- [docs/SECURITY-E2EE.md](docs/SECURITY-E2EE.md) — trust boundaries, what is ciphertext vs metadata, data flows
- [docs/webauthn-extension.md](docs/webauthn-extension.md) — passkey ceremony and auth deployment checklist

## Mutations

Read-only MVP. Writes would need a separate security design.
