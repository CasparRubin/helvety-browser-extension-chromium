import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("E2EE forms wiring (extension)", () => {
  it("entity-drafts re-exports shared create inputs and record-to-input", () => {
    const src = readFileSync(
      join(repoRoot, "src/popup/entity-drafts.ts"),
      "utf8"
    );
    expect(src).toContain("@helvety/shared/e2ee-create-inputs");
    expect(src).toContain("@helvety/shared/e2ee-record-to-input");
    expect(src).not.toMatch(/export function noteToInput/);
  });

  it("extension-entity-mutations maps records via shared *ToInput helpers", () => {
    const src = readFileSync(
      join(repoRoot, "src/popup/lib/extension-entity-mutations.ts"),
      "utf8"
    );
    expect(src).toContain("taskToInput");
    expect(src).toContain("contactToInput");
    expect(src).toContain("../entity-drafts");
    expect(src).toContain("draftFromRecord");
    expect(src).not.toMatch(/first_name:\s*contact\.first_name/);
  });

  it("use-extension-entity-form validates via shared validateE2eeDraft", () => {
    const src = readFileSync(
      join(repoRoot, "src/popup/hooks/use-extension-entity-form.ts"),
      "utf8"
    );
    expect(src).toContain("@helvety/shared/validate-e2ee-draft");
    expect(src).toContain("validateE2eeDraft");
    expect(src).toContain("draftForKind");
    expect(src).toContain("serializeFormDraft");
    expect(src).not.toMatch(/function validateDraft/);
  });
});
