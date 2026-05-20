# Helvety Chromium extension

Chromium MV3 extension for **Helvety** [helvety.com](https://helvety.com): email OTP sign-in (Supabase Auth), **passkey + PRF** unlock for E2EE, and read-only lists of tasks, notes, contacts, and links (decrypted only in the extension).

You do **not** need the Helvety monorepo or a local auth server to **build** this project. Public URLs and Supabase keys are hardcoded in **`src/lib/config.ts`**.

## What works today (production)

| Feature                                                   | Status                                                        |
| --------------------------------------------------------- | ------------------------------------------------------------- |
| Build & load unpacked (`dist/`)                           | Yes                                                           |
| Email OTP sign-in                                         | Yes — talks to the production Supabase project in `config.ts` |
| Decrypted task/note/contact/link lists                    | **Only after passkey unlock**                                 |
| Passkey unlock (`/api/extension/*` on `helvety.com/auth`) | **No** — those routes return **404** on production auth today |

So you can sign in, but **unlock and list decryption will fail** until the Helvety **auth** deployment exposes the extension JSON routes (and WebAuthn origin policy for `chrome-extension://…`). This repo implements the client side only; it does not change the `helvety` monorepo.

## What talks to what

| Piece                             | Runs where                                                                                                      |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Email OTP sign-in                 | **Supabase Auth** (`HELVETY_SUPABASE_*` in `config.ts`)                                                         |
| Passkey params / options / verify | **`https://helvety.com/auth`** — paths in `EXTENSION_*_PATH` (`config.ts`); must exist on the deployed auth app |
| Encrypted list rows               | **Supabase** PostgREST (RLS; ciphertext columns only — see `e2ee-data-select.ts`)                               |
| Decryption                        | **This extension** (`decrypt-entities.ts`, `@helvety/shared` crypto)                                            |

## Why `pnpm install` fetches the Helvety repo

`@helvety/ui` and `@helvety/shared` supply **UI and cryptography** aligned with the web apps. Auth stays remote. `preinstall` runs `scripts/ensure-helvety.mjs`:

- Optional: symlink **`../helvety`** if you already have the monorepo.
- Otherwise: shallow clone into **`.helvety/`** (gitignored).

That clone is **not** required to run the extension in Chrome—only to compile.

## Prerequisites

- Node 22+ and **pnpm**
- Git (for the shallow clone when `../helvety` is absent)

When passkey unlock is enabled on production auth, operators must also allow your extension origin in that deployment’s WebAuthn configuration (`chrome-extension://<id>` from Chrome → Extensions → Details). See [docs/webauthn-extension.md](docs/webauthn-extension.md).

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

| Setting           | Constant / location                                        |
| ----------------- | ---------------------------------------------------------- |
| Auth zone         | `HELVETY_AUTH_ORIGIN` → `https://helvety.com/auth`         |
| Web deep links    | `HELVETY_GATEWAY` → `https://helvety.com`                  |
| Supabase (public) | `HELVETY_SUPABASE_URL`, `HELVETY_SUPABASE_PUBLISHABLE_KEY` |

## Scripts

```bash
pnpm test
pnpm type-check
pnpm ci:check
pnpm ci:release   # check + build → dist/
```

## Docs

- [docs/SECURITY-E2EE.md](docs/SECURITY-E2EE.md) — trust boundaries and data flows
- [docs/webauthn-extension.md](docs/webauthn-extension.md) — passkey ceremony and server requirements

## Mutations

Read-only MVP. Writes would need a separate security design.
