import {
  contactToInput,
  linkFolderToInput,
  linkToInput,
  noteToInput,
  taskToInput,
} from "../entity-drafts";

import type { EntityRepository } from "../../lib/entity-repository";
import type {
  Contact,
  EntityKind,
  EntityRecord,
  Link,
  LinkFolder,
  Note,
  Task,
} from "../../lib/entity-types";
import type { EntityFormDraft } from "../views/EntityFormView";

/**
 *
 */
function assertNever(value: never): never {
  throw new Error(`Unhandled entity kind: ${String(value)}`);
}

/** Loads one decrypted entity for the edit form. */
export async function fetchEntity(
  repo: EntityRepository,
  kind: EntityKind,
  id: string
): Promise<EntityRecord> {
  switch (kind) {
    case "tasks":
      return repo.getTask(id);
    case "notes":
      return repo.getNote(id);
    case "contacts":
      return repo.getContact(id);
    case "links":
      return repo.getLink(id);
    case "link_folder":
      return repo.getLinkFolder(id);
    default:
      return assertNever(kind);
  }
}

/** Maps a decrypted repository record into form draft state. */
export function draftFromRecord(
  kind: EntityKind,
  record: EntityRecord
): EntityFormDraft {
  switch (kind) {
    case "tasks":
      return { kind: "tasks", value: taskToInput(record as Task) };
    case "notes":
      return { kind: "notes", value: noteToInput(record as Note) };
    case "contacts":
      return { kind: "contacts", value: contactToInput(record as Contact) };
    case "links":
      return { kind: "links", value: linkToInput(record as Link) };
    case "link_folder":
      return {
        kind: "link_folder",
        value: linkFolderToInput(record as LinkFolder),
      };
    default:
      return assertNever(kind);
  }
}

/** Persists a new entity and returns its id. */
export async function createEntity(
  repo: EntityRepository,
  draft: EntityFormDraft,
  clientRecordId?: string
): Promise<string> {
  switch (draft.kind) {
    case "tasks":
      return repo.createTask(draft.value, clientRecordId);
    case "notes":
      return repo.createNote(draft.value, clientRecordId);
    case "contacts":
      return repo.createContact(draft.value, clientRecordId);
    case "links":
      return repo.createLink(draft.value, clientRecordId);
    case "link_folder":
      return repo.createLinkFolder(draft.value, clientRecordId);
    default:
      return assertNever(draft);
  }
}

/** Persists edits to an existing entity. */
export async function updateEntity(
  repo: EntityRepository,
  kind: EntityKind,
  id: string,
  draft: EntityFormDraft
): Promise<void> {
  switch (kind) {
    case "tasks":
      if (draft.kind !== "tasks") {
        throw new Error("Form data does not match entity type.");
      }
      await repo.updateTask(id, draft.value);
      return;
    case "notes":
      if (draft.kind !== "notes") {
        throw new Error("Form data does not match entity type.");
      }
      await repo.updateNote(id, draft.value);
      return;
    case "contacts":
      if (draft.kind !== "contacts") {
        throw new Error("Form data does not match entity type.");
      }
      await repo.updateContact(id, draft.value);
      return;
    case "links":
      if (draft.kind !== "links") {
        throw new Error("Form data does not match entity type.");
      }
      await repo.updateLink(id, draft.value);
      return;
    case "link_folder":
      if (draft.kind !== "link_folder") {
        throw new Error("Form data does not match entity type.");
      }
      await repo.updateLinkFolder(id, draft.value);
      return;
    default:
      assertNever(kind);
  }
}

/** Deletes one entity by kind and id. */
export async function deleteEntity(
  repo: EntityRepository,
  kind: EntityKind,
  id: string
): Promise<void> {
  switch (kind) {
    case "tasks":
      await repo.deleteTask(id);
      return;
    case "notes":
      await repo.deleteNote(id);
      return;
    case "contacts":
      await repo.deleteContact(id);
      return;
    case "links":
      await repo.deleteLink(id);
      return;
    case "link_folder":
      await repo.deleteLinkFolder(id);
      return;
    default:
      assertNever(kind);
  }
}

/** Human-readable label for delete confirmation from the current draft. */
export function deleteLabelFromDraft(
  kind: EntityKind,
  draft: EntityFormDraft | null
): string | null {
  if (draft?.kind !== kind) {
    return null;
  }
  switch (draft.kind) {
    case "tasks":
      return draft.value.title.trim() || "Task";
    case "notes":
      return draft.value.title.trim() || "Note";
    case "contacts":
      return (
        `${draft.value.first_name} ${draft.value.last_name}`.trim() || "Contact"
      );
    case "links":
      return draft.value.name.trim() || "Link";
    case "link_folder":
      return draft.value.name.trim() || "Folder";
    default:
      return assertNever(draft);
  }
}
