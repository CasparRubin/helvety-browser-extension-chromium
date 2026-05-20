# Helvety Chromium extension

MV3 popup that reuses **Helvety Tailwind v4** and **`@helvety/ui`**, uses **`@helvety/shared`** for Web Crypto (PRF → AES-GCM) consistent with the web apps, and stores the **Supabase session** in `chrome.storage.local`.

## Prerequisites

- Node 22+ and pnpm
- A sibling checkout of the Helvety monorepo at `../helvety` (this project uses `file:../helvety/packages/*` plus **`pnpm.overrides`** so nested `workspace:*` dependencies from `@helvety/ui` resolve to those folders)
- Production auth deployed with extension API routes (`helvety/apps/auth/app/api/extension/*`) at **`https://helvety.com/auth`**
- `HELVETY_WEBAUTHN_EXTENSION_ORIGINS` on that auth deployment set to your extension origin(s), e.g. `chrome-extension://<id>` (Chrome → Extensions → Details → ID). Use commas for multiple IDs

## Configuration

| What                           | Where                                                                                                                                                 |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth API base                  | Fixed: `https://helvety.com/auth` (`HELVETY_AUTH_ORIGIN` in `src/lib/env.ts`)                                                                         |
| “Open in web” links            | Fixed: `https://helvety.com` (`HELVETY_GATEWAY`)                                                                                                      |
| Supabase URL + publishable key | **Required** at build time: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local` (same values as `NEXT_PUBLIC_*` in the Helvety apps) |

Helvety host URLs are **not** env-configurable in this repo—only Supabase project settings use `VITE_*`.

## Setup

```bash
cd helvety-browser-extension-chromium
cp .env.example .env.local
# Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local
pnpm install
pnpm dev   # or pnpm build
```

Vite inlines `VITE_*` when you **build** the bundle; the installed extension does not read `.env` at runtime. Publishable Supabase values are public but **per-project**, so they are not committed here.

After `pnpm build`, load the **unpacked** extension from `dist/` (Chrome → Extensions → Load unpacked).

## Testing

```bash
pnpm test         # Vitest (unit)
pnpm test:watch   # watch mode
pnpm type-check   # tsc --noEmit
pnpm ci:check     # format:check + lint + type-check + test
pnpm ci:release   # ci:check + production build (dist/)
```

Tests cover: production URL constants (`src/lib/env.ts`), Helvety auth JSON envelopes, ciphertext-only list `select` projections, AES-GCM decrypt helpers, and `helvetyAuthFetch` (URLs, headers, 401 normalization).

## WebAuthn and extensions

Passkeys use RP ID **`helvety.com`**. Ceremonies run from `chrome-extension://…`; the auth server must allow that origin via `HELVETY_WEBAUTHN_EXTENSION_ORIGINS`. **Whether a web-registered credential works from an extension context must be validated on real devices**—see [docs/webauthn-extension.md](docs/webauthn-extension.md).

## Privacy and E2EE (entity data)

See **[docs/SECURITY-E2EE.md](docs/SECURITY-E2EE.md)** for what goes to Supabase vs Helvety auth, what stays ciphertext on the wire in this MVP, and known trust boundaries.

## Mutations (not in this MVP)

Creating or updating rows from the extension is **not implemented**. The web apps use CSRF-protected server actions; any future extension writes need ciphertext + RLS (or dedicated APIs) and a security review—not a config flag.

## Documentation index

- [docs/SECURITY-E2EE.md](docs/SECURITY-E2EE.md) — trust model and data flows
- [docs/webauthn-extension.md](docs/webauthn-extension.md) — WebAuthn / RP / extension ceremony
