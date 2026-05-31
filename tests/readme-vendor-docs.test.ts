import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("README vendor and side panel documentation", () => {
  const readme = readFileSync(join(repoRoot, "README.md"), "utf8");

  it("lists extension-chrome and documents side panel structure", () => {
    const panelSection = readme.slice(
      readme.indexOf("## Side panel UI (structure)")
    );
    expect(panelSection).toContain("@helvety/extension-chrome/theme-boot");
    expect(panelSection).toContain("helvetyPopupThemePreference");
    expect(panelSection).toMatch(/not `next-themes`/);
    expect(panelSection).toContain("EntityScreenLayout");
    expect(panelSection).toContain("EntityRichTextEditor");
    expect(panelSection).toContain("entityFormSessionKey");
    expect(panelSection).toContain("E2eeRichTextItemEditorShell");
    expect(panelSection).toContain("entity-rich-text");
    expect(panelSection).not.toMatch(/key=\{value/);
    expect(panelSection).toContain("edit-first");
    expect(panelSection).toContain("IconTooltipButton");
    expect(panelSection).toContain("components/lists/");
    expect(panelSection).toContain("clears decrypted state");
    expect(panelSection).toContain("openPanelOnActionClick");
    expect(panelSection).toContain("pending-otp-storage.ts");
    expect(readme).toContain("Chrome 114+");
    expect(readme).not.toMatch(/800px|800×600|800x600/i);
    expect(readme).not.toContain("default_popup");
  });

  it("does not describe the extension UX as an action popup", () => {
    expect(readme).toMatch(/side panel extension|Side panel UI/i);
    expect(readme).not.toMatch(/from the popup\b/i);
    expect(readme).not.toMatch(/manage them in the popup/i);
    expect(readme).not.toMatch(/default_popup/i);
  });

  it("documents tests/ layout contract suites", () => {
    expect(readme).toContain("tests/");
    expect(readme).toContain("manifest-side-panel");
    expect(readme).toContain("background-side-panel");
    expect(readme).toContain("pending-otp-storage");
    expect(readme).toContain("side-panel-chrome");
    expect(readme).toContain("extension-chrome-shell");
    expect(readme).toContain("security-e2ee-docs");
    expect(readme).toContain("webauthn-docs");
    expect(readme).toContain("tsconfig-build");
    expect(readme).toContain("src/**/*.test.ts");
    expect(readme).toContain("entity-catalogs");
    expect(readme).toContain("list-group-utils");
  });

  it("does not describe a separate read-only detail step", () => {
    expect(readme).not.toMatch(/view details/i);
    expect(readme).not.toMatch(/view full decrypted/i);
    expect(readme).not.toContain("EntityDetailView");
    expect(readme).toMatch(/edit-first/i);
  });

  it("E2EE writes section matches edit-first side panel UX", () => {
    const e2eeSection = readme.slice(readme.indexOf("## E2EE writes"));
    expect(e2eeSection).toMatch(/Create, edit, and delete/i);
    expect(e2eeSection).toMatch(/edit-first/i);
    expect(e2eeSection).toMatch(/links open the URL on tap/i);
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
    expect(readme).toMatch(/passkey API URL/i);
  });

  it("documents session and vault policy aligned with helvety.com", () => {
    const policySection = readme.slice(
      readme.indexOf("## Session and vault policy")
    );
    expect(policySection).toContain("auth-session-policy");
    expect(policySection).toContain("helvety_extension_last_email_verified");
    expect(policySection).toMatch(/24h sliding idle/i);
    expect(policySection).toMatch(/7d absolute max/i);
    expect(policySection).toContain("useVaultIdleLock");
    expect(policySection).toContain("touchVaultSessionInStorage");
  });

  it("does not imply lists-only or pre-CRUD behavior", () => {
    expect(readme).not.toMatch(/read-only MVP/i);
    expect(readme).not.toMatch(/\blists? only\b/i);
    expect(readme).not.toMatch(/view-only/i);
    expect(readme).not.toMatch(/browse only/i);
  });
});
