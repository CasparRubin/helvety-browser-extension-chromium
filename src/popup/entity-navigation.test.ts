import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { entityKindForTab } from "./entity-navigation";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("entity-navigation", () => {
  it("maps entity tabs to kinds except about", () => {
    expect(entityKindForTab("tasks")).toBe("tasks");
    expect(entityKindForTab("notes")).toBe("notes");
    expect(entityKindForTab("contacts")).toBe("contacts");
    expect(entityKindForTab("links")).toBe("links");
    expect(entityKindForTab("about")).toBeNull();
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
  });
});
