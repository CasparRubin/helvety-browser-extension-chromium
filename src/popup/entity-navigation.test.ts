import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { entityFormSessionKey, entityKindForTab } from "./entity-navigation";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("entity-navigation", () => {
  it("maps entity tabs to kinds except about", () => {
    expect(entityKindForTab("tasks")).toBe("tasks");
    expect(entityKindForTab("notes")).toBe("notes");
    expect(entityKindForTab("contacts")).toBe("contacts");
    expect(entityKindForTab("links")).toBe("links");
    expect(entityKindForTab("about")).toBeNull();
  });

  it("entityFormSessionKey is stable per record and differs for create vs edit", () => {
    expect(
      entityFormSessionKey({
        mode: "form",
        kind: "tasks",
        formMode: "create",
      })
    ).toBe("tasks-create-new");
    expect(
      entityFormSessionKey({
        mode: "form",
        kind: "notes",
        formMode: "edit",
        id: "abc-123",
      })
    ).toBe("notes-edit-abc-123");
    expect(entityFormSessionKey({ mode: "list" })).toBe("");
  });

  it("EntityScreen union has list and form modes only", () => {
    const source = readFileSync(
      join(repoRoot, "src/popup/entity-navigation.ts"),
      "utf8"
    );
    expect(source).toContain('mode: "list"');
    expect(source).toContain('mode: "form"');
    expect(source).not.toContain('mode: "detail"');
    expect(source).not.toContain("LinksSection");
    expect(source).toContain("entityFormSessionKey");
  });

  it("DataTabsView wires entityFormSessionKey into EntityFormView", () => {
    const dataTabs = readFileSync(
      join(repoRoot, "src/popup/views/DataTabsView.tsx"),
      "utf8"
    );
    const formView = readFileSync(
      join(repoRoot, "src/popup/views/EntityFormView.tsx"),
      "utf8"
    );
    expect(dataTabs).toContain("formSessionKey={entityFormSessionKey(screen)}");
    expect(formView).toContain("sessionKey={formSessionKey}");
    expect(formView).not.toMatch(/key=\{value/);
  });
});
