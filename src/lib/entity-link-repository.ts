import {
  createEntityLink,
  deleteEntityLink,
  ensureOwnedEntityExists,
  getEntityLinksForEndpoint,
  toLinkedEntityReferences,
  type LinkEntityType,
} from "@helvety/shared/entity-links-client";

import type { EntityRepository } from "./entity-repository";
import type {
  ContactListRow,
  LinkListRow,
  NoteListRow,
  TaskListRow,
} from "./entity-types";
import type { ExtensionSupabaseClient } from "./extension-supabase";

/** Linked task row joined with link metadata. */
export type LinkedTask = TaskListRow & { link_id: string; linked_at: string };
/** Linked note row joined with link metadata. */
export type LinkedNote = NoteListRow & { link_id: string; linked_at: string };
/** Linked contact row joined with link metadata. */
export type LinkedContact = ContactListRow & {
  link_id: string;
  linked_at: string;
};
/** Linked link row joined with link metadata. */
export type LinkedLink = LinkListRow & { link_id: string; linked_at: string };

const DUPLICATE_LINK_MESSAGE = "These records are already linked.";

/**
 * Cross-app entity link CRUD for the extension (PostgREST + shared client helpers).
 */
export class EntityLinkRepository {
  constructor(
    private readonly supabase: ExtensionSupabaseClient,
    private readonly userId: string,
    private readonly entities: EntityRepository
  ) {}

  async linkEntities(
    sourceType: LinkEntityType,
    sourceId: string,
    targetType: LinkEntityType,
    targetId: string
  ): Promise<void> {
    const [sourceExists, targetExists] = await Promise.all([
      ensureOwnedEntityExists(this.supabase, this.userId, sourceType, sourceId),
      ensureOwnedEntityExists(this.supabase, this.userId, targetType, targetId),
    ]);
    if (!sourceExists || !targetExists) {
      throw new Error("Referenced record not found.");
    }

    const result = await createEntityLink({
      supabase: this.supabase,
      userId: this.userId,
      sourceEntityType: sourceType,
      sourceEntityId: sourceId,
      targetEntityType: targetType,
      targetEntityId: targetId,
    });
    if (result.error) {
      if (result.error.code === "23505") {
        throw new Error(DUPLICATE_LINK_MESSAGE);
      }
      throw new Error(result.error.message);
    }
  }

  async unlink(linkId: string): Promise<void> {
    const result = await deleteEntityLink(this.supabase, this.userId, linkId);
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  private async loadLinkedRows<T extends { id: string }>(
    sourceType: LinkEntityType,
    sourceId: string,
    targetType: LinkEntityType,
    catalog: T[]
  ): Promise<Array<T & { link_id: string; linked_at: string }>> {
    const { data, error } = await getEntityLinksForEndpoint({
      supabase: this.supabase,
      userId: this.userId,
      entityType: sourceType,
      entityId: sourceId,
    });
    if (error) {
      throw new Error(error.message);
    }
    const refs = toLinkedEntityReferences(
      data ?? [],
      sourceType,
      sourceId,
      targetType
    );
    const byId = new Map(catalog.map((item) => [item.id, item]));
    return refs
      .map((ref) => {
        const item = byId.get(ref.entity_id);
        if (!item) {
          return null;
        }
        return {
          ...item,
          link_id: ref.link_id,
          linked_at: ref.linked_at,
        };
      })
      .filter(
        (row): row is T & { link_id: string; linked_at: string } => row !== null
      );
  }

  async loadTaskContactLinks(taskId: string): Promise<{
    allItems: ContactListRow[];
    linkedItems: LinkedContact[];
  }> {
    const allItems = await this.entities.listContacts();
    const linkedItems = await this.loadLinkedRows(
      "items",
      taskId,
      "contacts",
      allItems
    );
    return { allItems, linkedItems };
  }

  async loadTaskNoteLinks(taskId: string): Promise<{
    allItems: NoteListRow[];
    linkedItems: LinkedNote[];
  }> {
    const allItems = await this.entities.listNotes();
    const linkedItems = await this.loadLinkedRows(
      "items",
      taskId,
      "notes",
      allItems
    );
    return { allItems, linkedItems };
  }

  async loadTaskLinkLinks(taskId: string): Promise<{
    allItems: LinkListRow[];
    linkedItems: LinkedLink[];
  }> {
    const allItems = await this.entities.listLinks();
    const linkedItems = await this.loadLinkedRows(
      "items",
      taskId,
      "links",
      allItems
    );
    return { allItems, linkedItems };
  }

  async loadNoteTaskLinks(noteId: string): Promise<{
    allItems: TaskListRow[];
    linkedItems: LinkedTask[];
  }> {
    const allItems = await this.entities.listTasks();
    const linkedItems = await this.loadLinkedRows(
      "notes",
      noteId,
      "items",
      allItems
    );
    return { allItems, linkedItems };
  }

  async loadNoteContactLinks(noteId: string): Promise<{
    allItems: ContactListRow[];
    linkedItems: LinkedContact[];
  }> {
    const allItems = await this.entities.listContacts();
    const linkedItems = await this.loadLinkedRows(
      "notes",
      noteId,
      "contacts",
      allItems
    );
    return { allItems, linkedItems };
  }

  async loadNoteLinkLinks(noteId: string): Promise<{
    allItems: LinkListRow[];
    linkedItems: LinkedLink[];
  }> {
    const allItems = await this.entities.listLinks();
    const linkedItems = await this.loadLinkedRows(
      "notes",
      noteId,
      "links",
      allItems
    );
    return { allItems, linkedItems };
  }

  async loadContactTaskLinks(contactId: string): Promise<{
    allItems: TaskListRow[];
    linkedItems: LinkedTask[];
  }> {
    const allItems = await this.entities.listTasks();
    const linkedItems = await this.loadLinkedRows(
      "contacts",
      contactId,
      "items",
      allItems
    );
    return { allItems, linkedItems };
  }

  async loadContactNoteLinks(contactId: string): Promise<{
    allItems: NoteListRow[];
    linkedItems: LinkedNote[];
  }> {
    const allItems = await this.entities.listNotes();
    const linkedItems = await this.loadLinkedRows(
      "contacts",
      contactId,
      "notes",
      allItems
    );
    return { allItems, linkedItems };
  }

  async loadContactLinkLinks(contactId: string): Promise<{
    allItems: LinkListRow[];
    linkedItems: LinkedLink[];
  }> {
    const allItems = await this.entities.listLinks();
    const linkedItems = await this.loadLinkedRows(
      "contacts",
      contactId,
      "links",
      allItems
    );
    return { allItems, linkedItems };
  }

  async loadLinkTaskLinks(linkId: string): Promise<{
    allItems: TaskListRow[];
    linkedItems: LinkedTask[];
  }> {
    const allItems = await this.entities.listTasks();
    const linkedItems = await this.loadLinkedRows(
      "links",
      linkId,
      "items",
      allItems
    );
    return { allItems, linkedItems };
  }

  async loadLinkNoteLinks(linkId: string): Promise<{
    allItems: NoteListRow[];
    linkedItems: LinkedNote[];
  }> {
    const allItems = await this.entities.listNotes();
    const linkedItems = await this.loadLinkedRows(
      "links",
      linkId,
      "notes",
      allItems
    );
    return { allItems, linkedItems };
  }

  async loadLinkContactLinks(linkId: string): Promise<{
    allItems: ContactListRow[];
    linkedItems: LinkedContact[];
  }> {
    const allItems = await this.entities.listContacts();
    const linkedItems = await this.loadLinkedRows(
      "links",
      linkId,
      "contacts",
      allItems
    );
    return { allItems, linkedItems };
  }
}
