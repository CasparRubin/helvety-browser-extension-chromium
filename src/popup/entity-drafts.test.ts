import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  DEFAULT_CONTACT_CATEGORY_ID,
  DEFAULT_NOTE_CATEGORY_ID,
  DEFAULT_TASK_LABEL_ID,
  DEFAULT_TASK_PRIORITY,
  DEFAULT_TASK_STAGE_ID,
} from "../lib/entity-defaults";

import {
  contactToInput,
  emptyContactInput,
  emptyLinkFolderInput,
  emptyLinkInput,
  emptyNoteInput,
  emptyTaskInput,
  linkFolderToInput,
  linkToInput,
  noteToInput,
  taskToInput,
} from "./entity-drafts";

import type {
  Contact,
  Link,
  LinkFolder,
  Note,
  Task,
} from "../lib/entity-types";

const draftsPath = resolve(import.meta.dirname, "entity-drafts.ts");

describe("entity-drafts wiring", () => {
  it("re-exports empty create inputs from @helvety/shared/e2ee-create-inputs", () => {
    const src = readFileSync(draftsPath, "utf8");
    expect(src).toContain("@helvety/shared/e2ee-create-inputs");
    expect(src).toContain("emptyContactInput");
    expect(src).not.toMatch(/function emptyContactInput\(/);
  });
});

describe("empty input factories", () => {
  it("emptyContactInput uses shared category default and empty names", () => {
    expect(emptyContactInput()).toEqual({
      first_name: "",
      last_name: "",
      description: null,
      email: null,
      phone: null,
      birthday: null,
      notes: null,
      category_id: DEFAULT_CONTACT_CATEGORY_ID,
    });
  });

  it("emptyNoteInput uses shared category default", () => {
    expect(emptyNoteInput()).toEqual({
      title: "",
      description: null,
      category_id: DEFAULT_NOTE_CATEGORY_ID,
    });
  });

  it("emptyTaskInput uses default stage, label, and priority", () => {
    expect(emptyTaskInput()).toEqual({
      title: "",
      description: null,
      start_date: null,
      end_date: null,
      stage_id: DEFAULT_TASK_STAGE_ID,
      label_id: DEFAULT_TASK_LABEL_ID,
      priority: DEFAULT_TASK_PRIORITY,
    });
  });

  it("emptyLinkInput and emptyLinkFolderInput start blank", () => {
    expect(emptyLinkInput()).toEqual({ name: "", url: "", folder_id: null });
    expect(emptyLinkFolderInput()).toEqual({
      name: "",
      parent_folder_id: null,
    });
  });
});

describe("entity-to-input mappers", () => {
  it("drops server-managed fields when mapping a contact", () => {
    const contact: Contact = {
      id: "c1",
      user_id: "u1",
      first_name: "Ada",
      last_name: "Lovelace",
      description: "Mathematician",
      email: "ada@example.com",
      phone: "123",
      birthday: "1815-12-10",
      notes: "note",
      category_id: "work",
      sort_order: 5,
      created_at: "2026-01-01",
      updated_at: "2026-01-02",
    };
    expect(contactToInput(contact)).toEqual({
      first_name: "Ada",
      last_name: "Lovelace",
      description: "Mathematician",
      email: "ada@example.com",
      phone: "123",
      birthday: "1815-12-10",
      notes: "note",
      category_id: "work",
    });
  });

  it("maps a note to its editable fields", () => {
    const note: Note = {
      id: "n1",
      user_id: "u1",
      title: "Title",
      description: "Body",
      category_id: "personal",
      sort_order: 1,
      created_at: "2026-01-01",
      updated_at: "2026-01-02",
    };
    expect(noteToInput(note)).toEqual({
      title: "Title",
      description: "Body",
      category_id: "personal",
    });
  });

  it("maps a task to its editable fields", () => {
    const task: Task = {
      id: "t1",
      user_id: "u1",
      title: "Ship",
      description: null,
      start_date: "2026-01-01",
      end_date: "2026-01-05",
      stage_id: "doing",
      label_id: "label-1",
      priority: 2,
      sort_order: 3,
      created_at: "2026-01-01",
      updated_at: "2026-01-02",
    };
    expect(taskToInput(task)).toEqual({
      title: "Ship",
      description: null,
      start_date: "2026-01-01",
      end_date: "2026-01-05",
      stage_id: "doing",
      label_id: "label-1",
      priority: 2,
    });
  });

  it("maps links and link folders to their editable fields", () => {
    const link: Link = {
      id: "l1",
      user_id: "u1",
      name: "Helvety",
      url: "https://helvety.com",
      folder_id: "f1",
      sort_order: 0,
      created_at: "2026-01-01",
      updated_at: "2026-01-02",
    };
    expect(linkToInput(link)).toEqual({
      name: "Helvety",
      url: "https://helvety.com",
      folder_id: "f1",
    });

    const folder: LinkFolder = {
      id: "f1",
      user_id: "u1",
      name: "Bookmarks",
      parent_folder_id: null,
      sort_order: 0,
      created_at: "2026-01-01",
      updated_at: "2026-01-02",
    };
    expect(linkFolderToInput(folder)).toEqual({
      name: "Bookmarks",
      parent_folder_id: null,
    });
  });
});
