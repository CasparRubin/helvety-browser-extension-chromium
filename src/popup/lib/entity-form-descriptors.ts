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
  Link,
  LinkFolder,
  Note,
  Task,
} from "../../lib/entity-types";
import type { EntityFormDraft } from "../views/EntityFormView";

/** Form draft type keyed by entity kind. */
type EntityDraftByKind = {
  tasks: Extract<EntityFormDraft, { kind: "tasks" }>;
  notes: Extract<EntityFormDraft, { kind: "notes" }>;
  contacts: Extract<EntityFormDraft, { kind: "contacts" }>;
  links: Extract<EntityFormDraft, { kind: "links" }>;
  link_folder: Extract<EntityFormDraft, { kind: "link_folder" }>;
};

/** Decrypted record type keyed by entity kind. */
type EntityRecordByKind = {
  tasks: Task;
  notes: Note;
  contacts: Contact;
  links: Link;
  link_folder: LinkFolder;
};

/** CRUD + draft wiring for one extension entity kind. */
interface EntityFormDescriptor<K extends EntityKind> {
  fetch: (repo: EntityRepository, id: string) => Promise<EntityRecordByKind[K]>;
  toDraft: (record: EntityRecordByKind[K]) => EntityDraftByKind[K];
  create: (
    repo: EntityRepository,
    value: EntityDraftByKind[K]["value"],
    clientRecordId?: string
  ) => Promise<string>;
  update: (
    repo: EntityRepository,
    id: string,
    value: EntityDraftByKind[K]["value"]
  ) => Promise<void>;
  remove: (repo: EntityRepository, id: string) => Promise<void>;
  getDeleteLabel: (draft: EntityDraftByKind[K]) => string;
}

const entityFormDescriptors: {
  [K in EntityKind]: EntityFormDescriptor<K>;
} = {
  tasks: {
    fetch: (repo, id) => repo.getTask(id),
    toDraft: (record) => ({ kind: "tasks", value: taskToInput(record) }),
    create: (repo, value, clientRecordId) =>
      repo.createTask(value, clientRecordId),
    update: (repo, id, value) => repo.updateTask(id, value),
    remove: (repo, id) => repo.deleteTask(id),
    getDeleteLabel: (draft) => draft.value.title.trim() || "Task",
  },
  notes: {
    fetch: (repo, id) => repo.getNote(id),
    toDraft: (record) => ({ kind: "notes", value: noteToInput(record) }),
    create: (repo, value, clientRecordId) =>
      repo.createNote(value, clientRecordId),
    update: (repo, id, value) => repo.updateNote(id, value),
    remove: (repo, id) => repo.deleteNote(id),
    getDeleteLabel: (draft) => draft.value.title.trim() || "Note",
  },
  contacts: {
    fetch: (repo, id) => repo.getContact(id),
    toDraft: (record) => ({ kind: "contacts", value: contactToInput(record) }),
    create: (repo, value, clientRecordId) =>
      repo.createContact(value, clientRecordId),
    update: (repo, id, value) => repo.updateContact(id, value),
    remove: (repo, id) => repo.deleteContact(id),
    getDeleteLabel: (draft) =>
      `${draft.value.first_name} ${draft.value.last_name}`.trim() || "Contact",
  },
  links: {
    fetch: (repo, id) => repo.getLink(id),
    toDraft: (record) => ({ kind: "links", value: linkToInput(record) }),
    create: (repo, value, clientRecordId) =>
      repo.createLink(value, clientRecordId),
    update: (repo, id, value) => repo.updateLink(id, value),
    remove: (repo, id) => repo.deleteLink(id),
    getDeleteLabel: (draft) => draft.value.name.trim() || "Link",
  },
  link_folder: {
    fetch: (repo, id) => repo.getLinkFolder(id),
    toDraft: (record) => ({
      kind: "link_folder",
      value: linkFolderToInput(record),
    }),
    create: (repo, value, clientRecordId) =>
      repo.createLinkFolder(value, clientRecordId),
    update: (repo, id, value) => repo.updateLinkFolder(id, value),
    remove: (repo, id) => repo.deleteLinkFolder(id),
    getDeleteLabel: (draft) => draft.value.name.trim() || "Folder",
  },
};

/** Looks up the form descriptor for an entity kind. */
export function getEntityFormDescriptor<K extends EntityKind>(
  kind: K
): EntityFormDescriptor<K> {
  return entityFormDescriptors[kind];
}

/** Narrows a draft to the entity kind currently being edited. */
export function assertMatchingDraftKind<K extends EntityKind>(
  kind: K,
  draft: EntityFormDraft
): asserts draft is EntityDraftByKind[K] {
  if (draft.kind !== kind) {
    throw new Error("Form data does not match entity type.");
  }
}

export type { EntityDraftByKind, EntityRecordByKind };
