import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("SECURITY-E2EE.md", () => {
  const doc = readFileSync(join(repoRoot, "docs/SECURITY-E2EE.md"), "utf8");

  it("documents side panel boundaries (not popup)", () => {
    expect(doc).toMatch(/side panel/i);
    expect(doc).not.toMatch(/\bpopup\b/i);
  });

  it("extension surface matches manifest (sidePanel, not empty background)", () => {
    expect(doc).toContain("`storage`, `sidePanel`");
    expect(doc).toContain("openPanelOnActionClick");
    expect(doc).not.toMatch(/Empty service worker/i);
    expect(doc).not.toMatch(/`storage` only/i);
  });

  it("documents project-scoped Supabase host permission (not *.supabase.co)", () => {
    expect(doc).toContain("bkdzeihxzvrkndjvyzye.supabase.co");
    expect(doc).toMatch(/host_permissions/);
    expect(doc).not.toContain("`*.supabase.co`");
  });

  it("still documents client-side decrypt and privacy guards", () => {
    expect(doc).toContain("e2ee-write-guard");
    expect(doc).toContain("e2ee-entity-crypto");
    expect(doc).toContain("decrypt-entities.ts");
    expect(doc).toContain("entity-repository.test.ts");
    expect(doc).toContain("use-extension-entities");
    expect(doc).toContain("clearDecryptedEntityState");
    expect(doc).toContain("tests/security-e2ee-docs.test.ts");
  });

  it("documents About passkey API URL and production passkey fetch logging", () => {
    expect(doc).toMatch(/passkey API URL/i);
    expect(doc).toMatch(/passkey auth HTTP failures|\[helvety-unlock\]/i);
    expect(doc).not.toMatch(/No unlock diagnostics/i);
  });

  it("documents unified session and vault TTL policy", () => {
    expect(doc).toContain("auth-session-policy");
    expect(doc).toMatch(/24h sliding idle/i);
    expect(doc).toMatch(/7d absolute max/i);
    expect(doc).toContain("helvety_extension_weekly_proof");
    expect(doc).toContain("weekly_proof");
    expect(doc).toContain("extension-session.ts");
    expect(doc).toContain("helvety_device_trust");
    expect(doc).toContain("getUser()");
    expect(doc).toContain("onKeyEvent");
  });

  it("documents KCV metadata and shared backfill on unlock", () => {
    expect(doc).toContain("key_check_value");
    expect(doc).toMatch(/backfillKeyCheckValueIfMissing/i);
    expect(doc).toContain("passkey-unlock");
  });

  it("documents vault lock vs sign-out PRF salt behavior", () => {
    expect(doc).toMatch(/Vault lock vs sign-out/i);
    expect(doc).toContain("clearCachedPRFSalt");
    expect(doc).toContain("clearAllKeys");
  });

  it("documents field-bound entity encryption", () => {
    expect(doc).toMatch(/field-bound AAD/i);
    expect(doc).toContain("table:recordId:column");
    expect(doc).toContain("e2ee-entity-columns");
  });

  it("documents extension vs web device-trust threat model", () => {
    expect(doc).toMatch(/Weekly proof vs web device trust/i);
    expect(doc).toContain("authenticateBearerRequest");
    expect(doc).toContain("X-Helvety-Weekly-Proof");
  });

  it("documents extension entity-link hook toasts and test coverage", () => {
    expect(doc).toContain("extension-entity-links-hooks.test.tsx");
    expect(doc).toContain("getE2eeHookErrorMessage");
    expect(doc).toContain("<Toaster>");
  });

  it("documents server-enforced OTP and cross-app entity links", () => {
    expect(doc).toContain("/api/extension/otp/");
    expect(doc).toMatch(/EU\/EEA attestation/i);
    expect(doc).not.toMatch(/signInWithOtp/i);
    expect(doc).toContain("EntityLinksPanel");
    expect(doc).toContain("entity_links");
  });

  it("documents create clientRecordId crypto contract vs save-first UI", () => {
    expect(doc).toContain("clientRecordId");
    expect(doc).toMatch(/save-first/i);
    expect(doc).toContain("e2ee-create-inputs");
  });

  it("describes edit-first side panel UX (not a read-only detail view)", () => {
    expect(doc).toMatch(/edit-first|Edit-first/i);
    expect(doc).toMatch(/E2EE_DETAIL_COLUMNS.*edit/i);
    expect(doc).not.toMatch(/read-only detail/i);
    expect(doc).not.toMatch(/list\/detail\/form state/i);
  });

  it("documents TipTap rich text and entityFormSessionKey remount pattern", () => {
    expect(doc).toContain("entityFormSessionKey");
    expect(doc).toContain("EntityRichTextEditor");
    expect(doc).toContain("entity-rich-text-editor.test.ts");
    expect(doc).toMatch(/mount-only|initialContentRef/i);
    expect(doc).toContain("editorSessionKey");
  });

  it("documents side panel reorder, open-in-app deep links, and unsaved tab guard", () => {
    expect(doc).toMatch(/Open in web app/i);
    expect(doc).toMatch(/entity deep link/i);
    expect(doc).toMatch(/up-down reorder|reorder within tree level/i);
    expect(doc).toMatch(
      /unsaved form shows discard dialog|Tab switch with unsaved/i
    );
  });
});
