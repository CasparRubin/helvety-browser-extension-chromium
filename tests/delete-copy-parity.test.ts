import { describe, expect, it } from "vitest";

import { buildDeleteMessage } from "../src/lib/entity-config";

describe("extension delete copy parity", () => {
  it("task delete uses shared registry wording", () => {
    const { title, description } = buildDeleteMessage("tasks", "My task");
    expect(title).toBe('Delete "My task"?');
    expect(description).toContain("permanently delete this task");
  });

  it("folder delete warns about nested content", () => {
    const { description } = buildDeleteMessage("link_folder", "Work");
    expect(description).toContain("folder");
    expect(description).toContain("nested");
    expect(description).toMatch(/links|subfolders/);
  });

  it("link delete matches links zone registry shape", () => {
    const { description } = buildDeleteMessage("links", "Example");
    expect(description).toContain("link");
    expect(description).not.toContain("nested content");
  });
});
