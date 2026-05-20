import { describe, expect, it } from "vitest";

import {
  CONTACT_LIST_SELECT,
  LINK_LIST_SELECT,
  NOTE_LIST_SELECT,
  TASK_LIST_SELECT,
} from "./e2ee-data-select";

describe("E2EE list select projections", () => {
  it("keeps list projections narrow (id + ciphertext only, no star selects)", () => {
    const all = [
      TASK_LIST_SELECT,
      NOTE_LIST_SELECT,
      CONTACT_LIST_SELECT,
      LINK_LIST_SELECT,
    ];
    expect(all).toHaveLength(4);
    for (const select of all) {
      expect(select).not.toMatch(/\*/);
      expect(select).toContain("id");
      expect(select.split(",").map((c) => c.trim())).not.toContain("*");
    }
    expect(TASK_LIST_SELECT).toBe(NOTE_LIST_SELECT);
    expect(CONTACT_LIST_SELECT).not.toBe(LINK_LIST_SELECT);
  });

  it("tasks projection only pulls ciphertext title + id", () => {
    expect(TASK_LIST_SELECT).toBe("id, encrypted_title");
    expect(TASK_LIST_SELECT).not.toMatch(/\*/);
  });

  it("notes projection mirrors tasks column shape", () => {
    expect(NOTE_LIST_SELECT).toBe("id, encrypted_title");
  });

  it("contacts projection pulls name ciphertext only", () => {
    expect(CONTACT_LIST_SELECT).toBe(
      "id, encrypted_first_name, encrypted_last_name"
    );
    expect(CONTACT_LIST_SELECT).not.toContain("encrypted_email");
  });

  it("links projection pulls name ciphertext only", () => {
    expect(LINK_LIST_SELECT).toBe("id, encrypted_name");
    expect(LINK_LIST_SELECT).not.toContain("encrypted_url");
  });
});
