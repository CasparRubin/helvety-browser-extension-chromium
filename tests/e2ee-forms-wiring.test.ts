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

  it("entity form descriptors centralize shared record-to-draft helpers", () => {
    const descriptors = readFileSync(
      join(repoRoot, "src/popup/lib/entity-form-descriptors.ts"),
      "utf8"
    );
    const mutations = readFileSync(
      join(repoRoot, "src/popup/lib/extension-entity-mutations.ts"),
      "utf8"
    );
    expect(descriptors).toContain("taskToInput");
    expect(descriptors).toContain("contactToInput");
    expect(descriptors).toContain("../entity-drafts");
    expect(descriptors).toContain("getEntityFormDescriptor");
    expect(mutations).toContain("getEntityFormDescriptor");
    expect(mutations).toContain("draftFromRecord");
    expect(descriptors).not.toMatch(/first_name:\s*contact\.first_name/);
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
