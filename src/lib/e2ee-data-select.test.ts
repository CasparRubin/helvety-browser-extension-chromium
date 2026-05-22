import { describe, expect, it } from "vitest";

import {
  CONTACT_DETAIL_SELECT,
  CONTACT_LIST_SELECT,
  LINK_DETAIL_SELECT,
  LINK_FOLDER_DETAIL_SELECT,
  LINK_FOLDER_LIST_SELECT,
  LINK_LIST_SELECT,
  NOTE_DETAIL_SELECT,
  NOTE_LIST_SELECT,
  TASK_DETAIL_SELECT,
  TASK_LIST_SELECT,
} from "./e2ee-data-select";
import { PLAINTEXT_CONTENT_FIELD_NAMES } from "./e2ee-privacy";

describe("E2EE list select projections", () => {
  it("keeps list projections narrow (id + ciphertext only, no star selects)", () => {
    const all = [
      TASK_LIST_SELECT,
      NOTE_LIST_SELECT,
      CONTACT_LIST_SELECT,
      LINK_LIST_SELECT,
      LINK_FOLDER_LIST_SELECT,
    ];
    expect(all).toHaveLength(5);
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

  it("never selects plaintext content columns (only encrypted_* + structural metadata)", () => {
    const all = [
      TASK_LIST_SELECT,
      NOTE_LIST_SELECT,
      CONTACT_LIST_SELECT,
      LINK_LIST_SELECT,
      LINK_FOLDER_LIST_SELECT,
      TASK_DETAIL_SELECT,
      NOTE_DETAIL_SELECT,
      CONTACT_DETAIL_SELECT,
      LINK_DETAIL_SELECT,
      LINK_FOLDER_DETAIL_SELECT,
    ];
    const forbidden = new Set<string>(PLAINTEXT_CONTENT_FIELD_NAMES);
    for (const select of all) {
      const columns = select.split(",").map((c) => c.trim());
      for (const col of columns) {
        expect(forbidden.has(col)).toBe(false);
      }
    }
  });

  it("detail projections include ciphertext fields and metadata", () => {
    expect(TASK_DETAIL_SELECT).toContain("encrypted_title");
    expect(TASK_DETAIL_SELECT).toContain("stage_id");
    expect(NOTE_DETAIL_SELECT).toContain("encrypted_description");
    expect(CONTACT_DETAIL_SELECT).toContain("encrypted_email");
    expect(LINK_DETAIL_SELECT).toContain("encrypted_url");
    expect(LINK_FOLDER_DETAIL_SELECT).toContain("parent_folder_id");
    for (const select of [
      TASK_DETAIL_SELECT,
      NOTE_DETAIL_SELECT,
      CONTACT_DETAIL_SELECT,
      LINK_DETAIL_SELECT,
      LINK_FOLDER_DETAIL_SELECT,
    ]) {
      expect(select).not.toMatch(/\*/);
    }
  });
});
