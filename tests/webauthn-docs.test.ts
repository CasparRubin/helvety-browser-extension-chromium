import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("webauthn-extension.md", () => {
  const doc = readFileSync(
    join(repoRoot, "docs/webauthn-extension.md"),
    "utf8"
  );

  it("documents production helvety.com/auth and extension id allowlist", () => {
    expect(doc).toContain("helvety.com/auth");
    expect(doc).toContain("HELVETY_CHROME_EXTENSION_ORIGINS");
    expect(doc).toMatch(/bare ids|extension id/i);
    expect(doc).toContain("extension-passkey-production.md");
    expect(doc).toMatch(/401.*JSON|JSON.*401/i);
  });

  it("troubleshooting covers missing allowlist not only missing deploy", () => {
    expect(doc).toContain("HELVETY_CHROME_EXTENSION_ORIGINS");
    expect(doc).toMatch(/origin errors|allowlist/i);
    expect(doc).not.toMatch(/Auth not redeployed/i);
  });

  it("does not document localhost auth as the default unlock path", () => {
    expect(doc).not.toMatch(/VITE_HELVETY_AUTH_ORIGIN=http:\/\/localhost/);
    expect(doc).not.toMatch(/bun run dev.*auth/i);
  });

  it("documents side panel DevTools for manual passkey checks", () => {
    expect(doc).toContain("side panel DevTools");
    expect(doc).not.toMatch(/popup DevTools/i);
  });

  it("documents production passkey auth fetch logging", () => {
    expect(doc).toMatch(/passkey auth HTTP failures|\[helvety-unlock\]/i);
    expect(doc).toMatch(/production builds also log passkey/i);
  });
});
