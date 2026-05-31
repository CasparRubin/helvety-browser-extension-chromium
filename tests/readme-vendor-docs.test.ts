import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("README vendor and popup documentation", () => {
  const readme = readFileSync(join(repoRoot, "README.md"), "utf8");

  it("lists extension-chrome and documents popup structure", () => {
    const popupSection = readme.slice(
      readme.indexOf("## Popup UI (structure)")
    );
    expect(popupSection).toContain("@helvety/extension-chrome/theme-boot");
    expect(popupSection).toContain("helvetyPopupThemePreference");
    expect(popupSection).toMatch(/not `next-themes`/);
    expect(popupSection).toContain("EntityScreenLayout");
    expect(popupSection).toContain("EntityRichTextEditor");
    expect(popupSection).toContain("entity-rich-text");
    expect(popupSection).toContain("clears decrypted state");
    expect(readme).toMatch(/800px|800×600|800x600/i);
  });

  it("documents tests/ layout contract suites", () => {
    expect(readme).toContain("tests/");
    expect(readme).toContain("popup-chrome");
  });

  it("describes CRUD and does not claim read-only MVP", () => {
    expect(readme).toMatch(/full CRUD|CRUD/i);
    expect(readme).not.toMatch(/read-only MVP/i);
    expect(readme).not.toMatch(/Read-only MVP/);
    expect(readme).toContain("link folders");
    expect(readme).toContain("entity-repository");
  });

  it("points to current security and webauthn docs", () => {
    expect(readme).toContain("docs/SECURITY-E2EE.md");
    expect(readme).toContain("structural metadata");
    expect(readme).toContain("docs/webauthn-extension.md");
    expect(readme).toContain("extension-passkey-production.md");
  });

  it("does not claim passkey unlock is blocked until a future auth redeploy", () => {
    expect(readme).not.toMatch(/404\/HTML until then/i);
    expect(readme).not.toMatch(/needs auth redeploy.*until then/i);
  });

  it("documents HELVETY_CHROME_EXTENSION_ORIGINS for operators", () => {
    expect(readme).toContain("HELVETY_CHROME_EXTENSION_ORIGINS");
    expect(readme).toMatch(/edge:\/\/extensions|runtime id/i);
  });

  it("does not imply lists-only or pre-CRUD behavior", () => {
    expect(readme).not.toMatch(/read-only MVP/i);
    expect(readme).not.toMatch(/\blists? only\b/i);
    expect(readme).not.toMatch(/view-only/i);
    expect(readme).not.toMatch(/browse only/i);
  });
});
