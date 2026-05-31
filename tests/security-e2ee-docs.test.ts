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

  it("still documents client-side decrypt and privacy guards", () => {
    expect(doc).toContain("e2ee-privacy");
    expect(doc).toContain("decrypt-entities.ts");
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
    expect(doc).toMatch(/@helvety\/shared\/crypto/i);
    expect(doc).toMatch(/24h sliding idle/i);
    expect(doc).toMatch(/7d absolute max/i);
    expect(doc).toContain("helvety_extension_last_email_verified");
  });

  it("describes edit-first side panel UX (not a read-only detail view)", () => {
    expect(doc).toMatch(/edit-first|Edit-first/i);
    expect(doc).toMatch(/\*_DETAIL_SELECT.*edit/i);
    expect(doc).not.toMatch(/read-only detail/i);
    expect(doc).not.toMatch(/list\/detail\/form state/i);
  });

  it("documents TipTap rich text and entityFormSessionKey remount pattern", () => {
    expect(doc).toContain("entityFormSessionKey");
    expect(doc).toContain("EntityRichTextEditor");
    expect(doc).toContain("entity-rich-text-editor.test.ts");
  });
});
