import { describe, expect, it } from "vitest";

import {
  CONTACT_LIST_SELECT,
  LINK_FOLDER_LIST_SELECT,
  LINK_LIST_SELECT,
  NOTE_LIST_SELECT,
  TASK_LIST_SELECT,
} from "./e2ee-data-select";
import { PLAINTEXT_CONTENT_FIELD_NAMES } from "./e2ee-privacy";

describe("E2EE list select projections", () => {
  it("includes structural metadata for grouped mobile lists", () => {
    expect(TASK_LIST_SELECT).toContain("stage_id");
    expect(TASK_LIST_SELECT).toContain("sort_order");
    expect(TASK_LIST_SELECT).toContain("created_at");
    expect(NOTE_LIST_SELECT).toContain("category_id");
    expect(NOTE_LIST_SELECT).toContain("created_at");
    expect(CONTACT_LIST_SELECT).toContain("category_id");
    expect(LINK_LIST_SELECT).toContain("folder_id");
    expect(LINK_LIST_SELECT).toContain("created_at");
    expect(LINK_FOLDER_LIST_SELECT).toContain("parent_folder_id");
  });

  it("never selects plaintext content columns", () => {
    const all = [
      TASK_LIST_SELECT,
      NOTE_LIST_SELECT,
      CONTACT_LIST_SELECT,
      LINK_LIST_SELECT,
      LINK_FOLDER_LIST_SELECT,
    ];
    const forbidden = new Set<string>(PLAINTEXT_CONTENT_FIELD_NAMES);
    for (const select of all) {
      expect(select).not.toMatch(/\*/);
      for (const col of select.split(",").map((c) => c.trim())) {
        expect(forbidden.has(col)).toBe(false);
      }
    }
  });

  it("links list includes encrypted url for open-in-browser", () => {
    expect(LINK_LIST_SELECT).toContain("encrypted_url");
    expect(LINK_LIST_SELECT).toContain("encrypted_name");
  });
});
