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
    expect(panelSection).toContain("editorSessionKey");
    expect(panelSection).toMatch(/mount-only/i);
    expect(panelSection).toContain("entity-rich-text");
    expect(panelSection).not.toMatch(/key=\{value/);
    expect(panelSection).toContain("edit-first");
    expect(panelSection).toContain("IconTooltipButton");
    expect(panelSection).toContain("row-action-button");
    expect(panelSection).toContain("form-field");
    expect(panelSection).toContain("extension-tokens.css");
    expect(panelSection).toContain("dirty-gated");
    expect(panelSection).toContain("edit **header**");
    expect(panelSection).toContain("components/lists/");
    expect(panelSection).toContain("up/down reorder");
    expect(panelSection).toContain("buildE2eeDeepLink");
    expect(panelSection).toContain("Open in web app");
    expect(panelSection).toContain("isFormDraftDirty");
    expect(panelSection).toContain("use-extension-entities");
    expect(panelSection).toContain("use-extension-vault");
    expect(panelSection).toContain("use-extension-auth");
    expect(panelSection).toContain("use-extension-entity-form");
    expect(panelSection).toContain("e2ee-entity-crypto");
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

  it("documents E2EE data-layer modules accurately (re-exports vs delete registry)", () => {
    const panelSection = readme.slice(
      readme.indexOf("## Side panel UI (structure)")
    );
    expect(panelSection).toContain("encrypt-entities.ts");
    expect(panelSection).toContain("decrypt-entities.ts");
    expect(panelSection).toContain("link-url-normalize.ts");
    expect(panelSection).toContain("link-tree.ts");
    expect(panelSection).toContain("entity-config.ts");
    expect(panelSection).toContain("defineEntityDeleteRegistry");
    expect(panelSection).toContain("buildDeleteMessage");
    expect(panelSection).not.toMatch(
      /entity-config\.ts` re-export other shared E2EE modules/
    );
    expect(panelSection).toMatch(/chip buttons|chip pickers/i);
    expect(panelSection).not.toMatch(/priority toggles/i);
  });

  it("documents sonner toasts through the shared UI wrapper", () => {
    expect(readme).toContain("sonner");
    expect(readme).toContain("@helvety/ui/sonner");
    expect(readme).toContain("Toaster");
    expect(readme).toContain("getE2eeHookErrorMessage");
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
    expect(readme).toContain("supabase-auth-patterns");
    expect(readme).toContain("copy-accuracy");
    expect(readme).toContain("e2ee-catalog-wiring");
    expect(readme).toContain("dependency-pins");
    expect(readme).toContain("extension-config-wiring");
    expect(readme).toContain("tsconfig-build");
    expect(readme).toContain("test:coverage");
    expect(readme).toContain("env.example");
    expect(readme).toContain("src/**/*.test.ts");
    expect(readme).toMatch(/src\/\*\*\/\*\.test\.ts\(x\)/);
    expect(readme).toContain("extension-entity-links-hooks");
    expect(readme).toContain("e2ee-entity-catalogs");
    expect(readme).toContain("entity-link-repository");
    expect(readme).toContain("helvety-auth-api");
    expect(readme).toContain("e2ee-crypto-wiring");
    expect(readme).toContain("e2ee-forms-wiring");
    expect(readme).toContain("e2ee-types-wiring");
    expect(readme).toContain("automation-policy-consistency");
    expect(readme).toContain("auth-session-policy-wiring.test.ts");
    // Co-located under src/lib/, not listed as a tests/ contract suite name alone.
    const testsRow = readme
      .split("\n")
      .find((line) => line.includes("| `tests/`"));
    expect(testsRow).toBeDefined();
    expect(testsRow).not.toContain("auth-session-policy-wiring");
  });

  it("documents local-only validation in Scripts section", () => {
    const scriptsSection = readme.slice(readme.indexOf("## Scripts"));
    expect(scriptsSection).toContain("pnpm ci:check");
    expect(scriptsSection).toContain("format:check");
    expect(scriptsSection).toContain("pnpm ci:release");
    expect(scriptsSection).toMatch(/local only/i);
    expect(scriptsSection).toMatch(/no remote automation/i);
    expect(scriptsSection).not.toContain("GitHub Actions");
    expect(scriptsSection).not.toContain(".github/workflows/");
  });

  it("documents auth API OTP sign-in (not direct Supabase OTP client)", () => {
    expect(readme).toContain("/api/extension/otp/");
    expect(readme).toMatch(/EU\/EEA attestation/i);
    expect(readme).not.toMatch(/signInWithOtp/i);
    expect(readme).toMatch(/auth API/i);
  });

  it("documents project-scoped Supabase host_permissions (not *.supabase.co)", () => {
    const configSection = readme.slice(readme.indexOf("## Configuration"));
    expect(configSection).toContain("host_permissions");
    expect(configSection).toContain("HELVETY_SUPABASE_URL");
    expect(configSection).toMatch(
      /not a broad.*\*\.supabase\.co|not.*\*\.supabase\.co wildcard/i
    );
    expect(configSection).not.toMatch(
      /host_permissions[^\n]*https:\/\/\*\.supabase\.co/
    );
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
    expect(e2eeSection).toMatch(/up\/down reorder/i);
    expect(e2eeSection).toMatch(/Open in web app/i);
    expect(e2eeSection).toMatch(/unsaved edit shows the discard dialog/i);
    expect(e2eeSection).toMatch(/header command bar/i);
    expect(e2eeSection).not.toMatch(/edit form \(including links/i);
  });

  it("describes CRUD and does not claim read-only MVP", () => {
    expect(readme).toMatch(/full CRUD|CRUD/i);
    expect(readme).not.toMatch(/read-only MVP/i);
    expect(readme).not.toMatch(/Read-only MVP/);
    expect(readme).toContain("link folders");
    expect(readme).toContain("entity-repository");
    expect(readme).toMatch(/Open in web app \(list \+ edit\)/);
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

  it("documents extension OTP creates accounts for new emails", () => {
    expect(readme).toMatch(/creates a Helvety account when the email is new/i);
  });

  it("documents session and vault policy aligned with helvety.com", () => {
    const policySection = readme.slice(
      readme.indexOf("## Session and vault policy")
    );
    expect(policySection).toContain("auth-session-policy");
    expect(policySection).toContain("helvety_extension_weekly_proof");
    expect(policySection).toMatch(/weekly proof/i);
    expect(policySection).toContain("X-Helvety-Weekly-Proof");
    expect(policySection).toContain("chrome.storage.local");
    expect(policySection).not.toContain("chrome.storage.session");
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
