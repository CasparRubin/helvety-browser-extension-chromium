import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const formPath = resolve(import.meta.dirname, "EntityFormView.tsx");

describe("EntityFormView", () => {
  const src = readFileSync(formPath, "utf8");

  it("uses FormField and shared editor field stack spacing", () => {
    expect(src).toContain("@helvety/ui/form-field");
    expect(src).toContain("E2EE_EDITOR_FORM_FIELDS_STACK_CLASS");
    expect(src).toContain("<FormField");
  });

  it("gates save on dirty state in edit mode", () => {
    expect(src).toContain("hasUnsavedChanges");
    expect(src).toContain(
      'formMode === "create" ? !mutationBusy : hasUnsavedChanges && !mutationBusy'
    );
    expect(src).toContain('formMode === "edit" && hasUnsavedChanges');
    expect(src).toContain("Save changes");
  });

  it("does not render footer delete or cancel actions", () => {
    expect(src).not.toContain("onDelete");
    expect(src).not.toContain("Cancel");
    expect(src).not.toMatch(/Trash2/);
  });
});
