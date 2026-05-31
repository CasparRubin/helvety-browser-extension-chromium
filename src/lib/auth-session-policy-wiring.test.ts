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

  it("extension email proof uses shared auth max lifetime", () => {
    const src = readFileSync(
      join(repoRoot, "src/lib/extension-email-proof.ts"),
      "utf8"
    );
    expect(src).toContain("AUTH_MAX_LIFETIME_MS");
    expect(src).not.toMatch(/30 \* 24 \* 60 \* 60 \* 1000/);
  });
});
