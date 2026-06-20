import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("auth session policy wiring (extension)", () => {
  it("App.tsx uses shared vault idle lock and session touch", () => {
    const src = readFileSync(join(repoRoot, "src/popup/App.tsx"), "utf8");
    expect(src).toContain("useVaultIdleLock");
    expect(src).toContain("touchVaultSessionInStorage");
  });

  it("extension weekly OTP anchor uses shared auth max lifetime", () => {
    const src = readFileSync(
      join(repoRoot, "src/lib/extension-weekly-otp-anchor.ts"),
      "utf8"
    );
    expect(src).toContain("AUTH_MAX_LIFETIME_MS");
    expect(src).not.toMatch(/30 \* 24 \* 60 \* 60 \* 1000/);
  });

  it("extension session enforces JWT max lifetime via shared helper", () => {
    const src = readFileSync(
      join(repoRoot, "src/lib/extension-session.ts"),
      "utf8"
    );
    expect(src).toContain("isJwtWithinMaxLifetime");
    expect(src).toContain("@helvety/shared/jwt-session-lifetime");
  });

  it("extension supabase mirrors access token to chrome.storage.session", () => {
    const src = readFileSync(
      join(repoRoot, "src/lib/extension-supabase.ts"),
      "utf8"
    );
    expect(src).toContain("chrome.storage.session");
    expect(src).toContain("chrome.storage.local");
  });
});
