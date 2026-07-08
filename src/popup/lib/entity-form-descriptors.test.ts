import { describe, expect, it, vi } from "vitest";

import {
  assertMatchingDraftKind,
  getEntityFormDescriptor,
} from "./entity-form-descriptors";

import type { EntityRepository } from "../../lib/entity-repository";
import type { EntityFormDraft } from "../views/EntityFormView";

function createRepoMock(
  overrides: Partial<EntityRepository> = {}
): EntityRepository {
  return {
    getTask: vi.fn().mockResolvedValue({
      id: "task-1",
      user_id: "user-1",
      title: "Ship it",
      description: null,
      start_date: null,
      end_date: null,
      stage_id: "default-item-backlog",
      label_id: "default",
      priority: 2,
      sort_order: 0,
      created_at: "2026-07-08T12:00:00.000Z",
      updated_at: "2026-07-08T12:00:00.000Z",
    }),
    deleteContact: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as EntityRepository;
}

describe("entity-form-descriptors", () => {
  it("maps fetched records into form drafts through the descriptor registry", async () => {
    const repo = createRepoMock();
    const descriptor = getEntityFormDescriptor("tasks");

    const record = await descriptor.fetch(repo, "task-1");
    const draft = descriptor.toDraft(record);

    expect(repo.getTask).toHaveBeenCalledWith("task-1");
    expect(draft).toEqual({
      kind: "tasks",
      value: {
        title: "Ship it",
        description: null,
        start_date: null,
        end_date: null,
        stage_id: "default-item-backlog",
        label_id: "default",
        priority: 2,
      },
    });
  });

  it("provides delete labels and CRUD bindings per entity kind", async () => {
    const repo = createRepoMock();
    const descriptor = getEntityFormDescriptor("contacts");
    const contactDraft: Extract<EntityFormDraft, { kind: "contacts" }> = {
      kind: "contacts",
      value: {
        first_name: "Ada",
        last_name: "Lovelace",
        description: null,
        email: null,
        phone: null,
        birthday: null,
        notes: null,
        category_id: "personal",
      },
    };

    expect(descriptor.getDeleteLabel(contactDraft)).toBe("Ada Lovelace");
    await descriptor.remove(repo, "contact-1");
    expect(repo.deleteContact).toHaveBeenCalledWith("contact-1");
  });

  it("throws when draft kind does not match the edited entity kind", () => {
    const taskDraft: Extract<EntityFormDraft, { kind: "tasks" }> = {
      kind: "tasks",
      value: {
        title: "Task",
        description: null,
        start_date: null,
        end_date: null,
        stage_id: "default-item-backlog",
        label_id: "default",
        priority: 2,
      },
    };

    expect(() => assertMatchingDraftKind("notes", taskDraft)).toThrow(
      "Form data does not match entity type."
    );
  });
});
