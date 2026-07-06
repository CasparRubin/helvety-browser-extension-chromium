import { describe, expect, it } from "vitest";

import {
  deleteLabelFromDraft,
  draftFromRecord,
} from "./extension-entity-mutations";

import type { Task, LinkFolder } from "../../lib/entity-types";
import type { EntityFormDraft } from "../views/EntityFormView";

describe("draftFromRecord", () => {
  it("maps a task record to editable draft state", () => {
    const task: Task = {
      id: "task-1",
      user_id: "user-1",
      title: "Ship phase 4",
      description: "Extract hooks",
      start_date: "2026-07-01",
      end_date: "2026-07-06",
      stage_id: "doing",
      label_id: "feature",
      priority: 2,
      sort_order: 10,
      created_at: "2026-07-01",
      updated_at: "2026-07-06",
    };

    expect(draftFromRecord("tasks", task)).toEqual({
      kind: "tasks",
      value: {
        title: "Ship phase 4",
        description: "Extract hooks",
        start_date: "2026-07-01",
        end_date: "2026-07-06",
        stage_id: "doing",
        label_id: "feature",
        priority: 2,
      },
    });
  });

  it("maps a link folder record to editable draft state", () => {
    const folder: LinkFolder = {
      id: "folder-1",
      user_id: "user-1",
      name: "Docs",
      parent_folder_id: null,
      sort_order: 1,
      created_at: "2026-07-01",
      updated_at: "2026-07-06",
    };

    expect(draftFromRecord("link_folder", folder)).toEqual({
      kind: "link_folder",
      value: {
        name: "Docs",
        parent_folder_id: null,
      },
    });
  });
});

describe("deleteLabelFromDraft", () => {
  it("returns trimmed labels with kind-specific fallbacks", () => {
    const contactDraft: EntityFormDraft = {
      kind: "contacts",
      value: {
        first_name: " Ada ",
        last_name: " Lovelace ",
        description: null,
        email: null,
        phone: null,
        birthday: null,
        notes: null,
        category_id: "default",
      },
    };
    const blankLinkDraft: EntityFormDraft = {
      kind: "links",
      value: { name: "   ", url: "https://helvety.com", folder_id: null },
    };

    expect(deleteLabelFromDraft("contacts", contactDraft)).toBe(
      "Ada   Lovelace"
    );
    expect(deleteLabelFromDraft("links", blankLinkDraft)).toBe("Link");
  });

  it("returns null when draft kind does not match the delete target kind", () => {
    const draft: EntityFormDraft = {
      kind: "notes",
      value: {
        title: "Note",
        description: null,
        category_id: "default",
      },
    };

    expect(deleteLabelFromDraft("tasks", draft)).toBeNull();
  });
});
