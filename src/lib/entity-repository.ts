/**
 * E2EE data access: PostgREST reads use narrow selects; writes spread only
 * `encrypt*` outputs plus `user_id` / structural metadata — never form plaintext.
 */
import { ACTION_LIMITS } from "@helvety/shared/constants";
import {
  E2EE_DETAIL_COLUMNS,
  E2EE_LIST_COLUMNS,
} from "@helvety/shared/e2ee-entity-columns";
import { assertEncryptedWritePayloadAuto } from "@helvety/shared/e2ee-write-guard";

import {
  decryptContactRow,
  decryptLinkFolderRow,
  decryptLinkRow,
  decryptNoteRow,
  decryptTaskRow,
  toContactListItem,
  toLinkFolderListItem,
  toLinkFolderPickerItem,
  toLinkListItem,
  toNoteListItem,
  toTaskListItem,
} from "./decrypt-entities";
import {
  encryptContactCreate,
  encryptContactUpdate,
  encryptLinkCreate,
  encryptLinkFolderCreate,
  encryptLinkFolderUpdate,
  encryptLinkUpdate,
  encryptNoteCreate,
  encryptNoteUpdate,
  encryptTaskCreate,
  encryptTaskUpdate,
} from "./encrypt-entities";

import type {
  Contact,
  ContactInput,
  ContactListRow,
  EntityListItem,
  Link,
  LinkFolder,
  LinkFolderInput,
  LinkFolderListRow,
  LinkInput,
  LinkListRow,
  Note,
  NoteInput,
  NoteListRow,
  Task,
  TaskInput,
  TaskListRow,
} from "./entity-types";
import type { ExtensionSupabaseClient } from "./extension-supabase";

const LIST_LIMIT = ACTION_LIMITS.MAX_DASHBOARD_ROWS;

function guardReorderLimit(count: number): void {
  if (count > ACTION_LIMITS.MAX_REORDER_ITEMS) {
    throw new Error(
      `Cannot reorder more than ${ACTION_LIMITS.MAX_REORDER_ITEMS} items`
    );
  }
}

function guardEncryptedWrite(payload: Record<string, unknown>): void {
  assertEncryptedWritePayloadAuto(payload);
}

function nowIso(): string {
  return new Date().toISOString();
}

export class EntityRepository {
  constructor(
    private readonly supabase: ExtensionSupabaseClient,
    private readonly userId: string,
    private readonly masterKey: CryptoKey
  ) {}

  async listTasks(): Promise<TaskListRow[]> {
    const { data, error } = await this.supabase
      .from("items")
      .select(E2EE_LIST_COLUMNS.items)
      .eq("user_id", this.userId)
      .order("sort_order", { ascending: true })
      .limit(LIST_LIMIT);
    if (error) {
      throw new Error(error.message);
    }
    return Promise.all(
      (data ?? []).map((row) => toTaskListItem(row, this.masterKey))
    );
  }

  async getTask(id: string): Promise<Task> {
    const { data, error } = await this.supabase
      .from("items")
      .select(E2EE_DETAIL_COLUMNS.items)
      .eq("id", id)
      .eq("user_id", this.userId)
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return decryptTaskRow(data, this.masterKey);
  }

  async createTask(input: TaskInput, clientRecordId?: string): Promise<string> {
    const encrypted = await encryptTaskCreate(
      input,
      this.masterKey,
      clientRecordId
    );
    const payload = { ...encrypted, user_id: this.userId };
    guardEncryptedWrite(payload);
    const { error } = await this.supabase.from("items").insert(payload);
    if (error) {
      throw new Error(error.message);
    }
    return encrypted.id;
  }

  async updateTask(id: string, input: Partial<TaskInput>): Promise<void> {
    const encrypted = await encryptTaskUpdate(id, input, this.masterKey);
    const payload = { ...encrypted, updated_at: nowIso() };
    guardEncryptedWrite(payload);
    const { error } = await this.supabase
      .from("items")
      .update(payload)
      .eq("id", id)
      .eq("user_id", this.userId);
    if (error) {
      throw new Error(error.message);
    }
  }

  async deleteTask(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("items")
      .delete()
      .eq("id", id)
      .eq("user_id", this.userId);
    if (error) {
      throw new Error(error.message);
    }
  }

  async reorderTasks(
    updates: { id: string; sort_order: number; stage_id?: string }[]
  ): Promise<void> {
    guardReorderLimit(updates.length);
    for (const update of updates) {
      const patch: Record<string, unknown> = {
        sort_order: update.sort_order,
        updated_at: nowIso(),
      };
      if (update.stage_id !== undefined) {
        patch.stage_id = update.stage_id;
      }
      const { error } = await this.supabase
        .from("items")
        .update(patch)
        .eq("id", update.id)
        .eq("user_id", this.userId);
      if (error) {
        throw new Error(error.message);
      }
    }
  }

  async listNotes(): Promise<NoteListRow[]> {
    const { data, error } = await this.supabase
      .from("notes")
      .select(E2EE_LIST_COLUMNS.notes)
      .eq("user_id", this.userId)
      .order("sort_order", { ascending: true })
      .limit(LIST_LIMIT);
    if (error) {
      throw new Error(error.message);
    }
    return Promise.all(
      (data ?? []).map((row) => toNoteListItem(row, this.masterKey))
    );
  }

  async getNote(id: string): Promise<Note> {
    const { data, error } = await this.supabase
      .from("notes")
      .select(E2EE_DETAIL_COLUMNS.notes)
      .eq("id", id)
      .eq("user_id", this.userId)
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return decryptNoteRow(data, this.masterKey);
  }

  async createNote(input: NoteInput, clientRecordId?: string): Promise<string> {
    const encrypted = await encryptNoteCreate(
      input,
      this.masterKey,
      clientRecordId
    );
    const payload = { ...encrypted, user_id: this.userId };
    guardEncryptedWrite(payload);
    const { error } = await this.supabase.from("notes").insert(payload);
    if (error) {
      throw new Error(error.message);
    }
    return encrypted.id;
  }

  async updateNote(id: string, input: Partial<NoteInput>): Promise<void> {
    const encrypted = await encryptNoteUpdate(id, input, this.masterKey);
    const payload = { ...encrypted, updated_at: nowIso() };
    guardEncryptedWrite(payload);
    const { error } = await this.supabase
      .from("notes")
      .update(payload)
      .eq("id", id)
      .eq("user_id", this.userId);
    if (error) {
      throw new Error(error.message);
    }
  }

  async deleteNote(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("notes")
      .delete()
      .eq("id", id)
      .eq("user_id", this.userId);
    if (error) {
      throw new Error(error.message);
    }
  }

  async reorderNotes(
    updates: { id: string; sort_order: number; category_id?: string }[]
  ): Promise<void> {
    guardReorderLimit(updates.length);
    for (const update of updates) {
      const patch: Record<string, unknown> = {
        sort_order: update.sort_order,
        updated_at: nowIso(),
      };
      if (update.category_id !== undefined) {
        patch.category_id = update.category_id;
      }
      const { error } = await this.supabase
        .from("notes")
        .update(patch)
        .eq("id", update.id)
        .eq("user_id", this.userId);
      if (error) {
        throw new Error(error.message);
      }
    }
  }

  async listContacts(): Promise<ContactListRow[]> {
    const { data, error } = await this.supabase
      .from("contacts")
      .select(E2EE_LIST_COLUMNS.contacts)
      .eq("user_id", this.userId)
      .order("sort_order", { ascending: true })
      .limit(LIST_LIMIT);
    if (error) {
      throw new Error(error.message);
    }
    return Promise.all(
      (data ?? []).map((row) => toContactListItem(row, this.masterKey))
    );
  }

  async getContact(id: string): Promise<Contact> {
    const { data, error } = await this.supabase
      .from("contacts")
      .select(E2EE_DETAIL_COLUMNS.contacts)
      .eq("id", id)
      .eq("user_id", this.userId)
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return decryptContactRow(data, this.masterKey);
  }

  async createContact(
    input: ContactInput,
    clientRecordId?: string
  ): Promise<string> {
    const encrypted = await encryptContactCreate(
      input,
      this.masterKey,
      clientRecordId
    );
    const payload = { ...encrypted, user_id: this.userId };
    guardEncryptedWrite(payload);
    const { error } = await this.supabase.from("contacts").insert(payload);
    if (error) {
      throw new Error(error.message);
    }
    return encrypted.id;
  }

  async updateContact(id: string, input: Partial<ContactInput>): Promise<void> {
    const encrypted = await encryptContactUpdate(id, input, this.masterKey);
    const payload = { ...encrypted, updated_at: nowIso() };
    guardEncryptedWrite(payload);
    const { error } = await this.supabase
      .from("contacts")
      .update(payload)
      .eq("id", id)
      .eq("user_id", this.userId);
    if (error) {
      throw new Error(error.message);
    }
  }

  async deleteContact(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("contacts")
      .delete()
      .eq("id", id)
      .eq("user_id", this.userId);
    if (error) {
      throw new Error(error.message);
    }
  }

  async reorderContacts(
    updates: { id: string; sort_order: number; category_id?: string }[]
  ): Promise<void> {
    guardReorderLimit(updates.length);
    for (const update of updates) {
      const patch: Record<string, unknown> = {
        sort_order: update.sort_order,
        updated_at: nowIso(),
      };
      if (update.category_id !== undefined) {
        patch.category_id = update.category_id;
      }
      const { error } = await this.supabase
        .from("contacts")
        .update(patch)
        .eq("id", update.id)
        .eq("user_id", this.userId);
      if (error) {
        throw new Error(error.message);
      }
    }
  }

  async listLinks(): Promise<LinkListRow[]> {
    const { data, error } = await this.supabase
      .from("links")
      .select(E2EE_LIST_COLUMNS.links)
      .eq("user_id", this.userId)
      .order("sort_order", { ascending: true })
      .limit(LIST_LIMIT);
    if (error) {
      throw new Error(error.message);
    }
    return Promise.all(
      (data ?? []).map((row) => toLinkListItem(row, this.masterKey))
    );
  }

  async getLink(id: string): Promise<Link> {
    const { data, error } = await this.supabase
      .from("links")
      .select(E2EE_DETAIL_COLUMNS.links)
      .eq("id", id)
      .eq("user_id", this.userId)
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return decryptLinkRow(data, this.masterKey);
  }

  async createLink(input: LinkInput, clientRecordId?: string): Promise<string> {
    if (input.folder_id != null && input.folder_id !== "") {
      await this.assertFolderOwned(input.folder_id);
    }
    const encrypted = await encryptLinkCreate(
      input,
      this.masterKey,
      clientRecordId
    );
    const payload = { ...encrypted, user_id: this.userId };
    guardEncryptedWrite(payload);
    const { error } = await this.supabase.from("links").insert(payload);
    if (error) {
      throw new Error(error.message);
    }
    return encrypted.id;
  }

  async updateLink(id: string, input: Partial<LinkInput>): Promise<void> {
    if (input.folder_id != null && input.folder_id !== "") {
      await this.assertFolderOwned(input.folder_id);
    }
    const encrypted = await encryptLinkUpdate(id, input, this.masterKey);
    const payload = { ...encrypted, updated_at: nowIso() };
    guardEncryptedWrite(payload);
    const { error } = await this.supabase
      .from("links")
      .update(payload)
      .eq("id", id)
      .eq("user_id", this.userId);
    if (error) {
      throw new Error(error.message);
    }
  }

  async deleteLink(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("links")
      .delete()
      .eq("id", id)
      .eq("user_id", this.userId);
    if (error) {
      throw new Error(error.message);
    }
  }

  async reorderLinks(
    updates: { id: string; sort_order: number }[]
  ): Promise<void> {
    guardReorderLimit(updates.length);
    for (const update of updates) {
      const { error } = await this.supabase
        .from("links")
        .update({ sort_order: update.sort_order, updated_at: nowIso() })
        .eq("id", update.id)
        .eq("user_id", this.userId);
      if (error) {
        throw new Error(error.message);
      }
    }
  }

  async listLinkFolders(): Promise<LinkFolderListRow[]> {
    const { data, error } = await this.supabase
      .from("link_folders")
      .select(E2EE_LIST_COLUMNS.link_folders)
      .eq("user_id", this.userId)
      .order("sort_order", { ascending: true })
      .limit(LIST_LIMIT);
    if (error) {
      throw new Error(error.message);
    }
    return Promise.all(
      (data ?? []).map((row) => toLinkFolderListItem(row, this.masterKey))
    );
  }

  /** Flat folder names for link form parent picker. */
  async listLinkFolderPickerItems(): Promise<EntityListItem[]> {
    const { data, error } = await this.supabase
      .from("link_folders")
      .select(E2EE_LIST_COLUMNS.link_folders)
      .eq("user_id", this.userId)
      .order("sort_order", { ascending: true })
      .limit(LIST_LIMIT);
    if (error) {
      throw new Error(error.message);
    }
    return Promise.all(
      (data ?? []).map((row) => toLinkFolderPickerItem(row, this.masterKey))
    );
  }

  async reorderLinkFolders(
    updates: { id: string; sort_order: number }[]
  ): Promise<void> {
    guardReorderLimit(updates.length);
    for (const update of updates) {
      const { error } = await this.supabase
        .from("link_folders")
        .update({ sort_order: update.sort_order, updated_at: nowIso() })
        .eq("id", update.id)
        .eq("user_id", this.userId);
      if (error) {
        throw new Error(error.message);
      }
    }
  }

  async getLinkFolder(id: string): Promise<LinkFolder> {
    const { data, error } = await this.supabase
      .from("link_folders")
      .select(E2EE_DETAIL_COLUMNS.link_folders)
      .eq("id", id)
      .eq("user_id", this.userId)
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return decryptLinkFolderRow(data, this.masterKey);
  }

  async createLinkFolder(
    input: LinkFolderInput,
    clientRecordId?: string
  ): Promise<string> {
    if (input.parent_folder_id) {
      await this.assertFolderOwned(input.parent_folder_id);
    }
    const encrypted = await encryptLinkFolderCreate(
      input,
      this.masterKey,
      clientRecordId
    );
    const payload = { ...encrypted, user_id: this.userId };
    guardEncryptedWrite(payload);
    const { error } = await this.supabase.from("link_folders").insert(payload);
    if (error) {
      throw new Error(error.message);
    }
    return encrypted.id;
  }

  async updateLinkFolder(
    id: string,
    input: Partial<LinkFolderInput>
  ): Promise<void> {
    if (input.parent_folder_id === id) {
      throw new Error("A folder cannot be its own parent.");
    }
    if (input.parent_folder_id) {
      await this.assertFolderOwned(input.parent_folder_id);
    }
    const encrypted = await encryptLinkFolderUpdate(id, input, this.masterKey);
    const payload = { ...encrypted, updated_at: nowIso() };
    guardEncryptedWrite(payload);
    const { error } = await this.supabase
      .from("link_folders")
      .update(payload)
      .eq("id", id)
      .eq("user_id", this.userId);
    if (error) {
      throw new Error(error.message);
    }
  }

  async deleteLinkFolder(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("link_folders")
      .delete()
      .eq("id", id)
      .eq("user_id", this.userId);
    if (error) {
      throw new Error(error.message);
    }
  }

  private async assertFolderOwned(folderId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from("link_folders")
      .select("id")
      .eq("id", folderId)
      .eq("user_id", this.userId)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    if (!data) {
      throw new Error("Folder not found.");
    }
  }
}
