import { describe, expect, it } from "vitest";

import { sectionTitle } from "./section-title";

describe("sectionTitle", () => {
  it("returns tab labels in list mode", () => {
    const list = { mode: "list" as const };
    expect(sectionTitle({ tab: "tasks", screen: list })).toBe("Tasks");
    expect(sectionTitle({ tab: "notes", screen: list })).toBe("Notes");
    expect(sectionTitle({ tab: "contacts", screen: list })).toBe("Contacts");
    expect(sectionTitle({ tab: "links", screen: list })).toBe("Links");
    expect(sectionTitle({ tab: "about", screen: list })).toBe("About");
  });

  it("returns create and edit headings in form mode", () => {
    expect(
      sectionTitle({
        tab: "tasks",
        screen: { mode: "form", kind: "tasks", formMode: "create" },
      })
    ).toBe("New task");
    expect(
      sectionTitle({
        tab: "links",
        screen: { mode: "form", kind: "link_folder", formMode: "create" },
      })
    ).toBe("New folder");
    expect(
      sectionTitle({
        tab: "links",
        screen: {
          mode: "form",
          kind: "links",
          formMode: "edit",
          id: "link-1",
        },
      })
    ).toBe("Edit link");
  });
});
