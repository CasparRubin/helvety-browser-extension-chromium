import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("auth session policy wiring (extension)", () => {
  it("auth and vault hooks use shared idle lock, key events, and weekly proof storage", () => {
    const vaultSrc = readFileSync(
      join(repoRoot, "src/popup/hooks/use-extension-vault.ts"),
      "utf8"
    );
    const authSrc = readFileSync(
      join(repoRoot, "src/popup/hooks/use-extension-auth.ts"),
      "utf8"
    );
    expect(vaultSrc).toContain("useVaultIdleLock");
    expect(vaultSrc).toContain("touchVaultSessionInStorage");
    expect(vaultSrc).toContain("onKeyEvent");
    expect(authSrc).toContain("writeExtensionWeeklyProof");
  });

  it("extension weekly proof storage uses shared token module", () => {
    const src = readFileSync(
      join(repoRoot, "src/lib/extension-weekly-proof-storage.ts"),
      "utf8"
    );
    expect(src).toContain("@helvety/shared/weekly-proof-token");
    expect(src).toContain("EXTENSION_WEEKLY_PROOF_STORAGE_KEY");
  });

  it("extension session enforces signed weekly proof (not JWT iat)", () => {
    const src = readFileSync(
      join(repoRoot, "src/lib/extension-session.ts"),
      "utf8"
    );
    expect(src).toContain("hasValidExtensionWeeklyProof");
    expect(src).not.toContain("isJwtWithinMaxLifetime");
    expect(src).not.toContain("jwt-session-lifetime");
    expect(src).not.toContain("extension-weekly-otp-anchor");
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
