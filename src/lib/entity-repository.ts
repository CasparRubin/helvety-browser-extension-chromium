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

function assertOwnedRowUpdated(
  data: { id: string } | null,
  entityLabel: string
): void {
  if (!data) {
    throw new Error(`${entityLabel} not found`);
  }
}

export class EntityRepository {
  constructor(
    private readonly supabase: ExtensionSupabaseClient,
    private readonly userId: string,
    private readonly masterKey: CryptoKey
  ) {}

  private async listOwnedRows<TRow, TResult>({
    tableName,
    selectColumns,
    mapRow,
  }: {
    tableName: string;
    selectColumns: string;
    mapRow: (row: TRow) => Promise<TResult>;
  }): Promise<TResult[]> {
    const { data, error } = await this.supabase
      .from(tableName)
      .select(selectColumns)
      .eq("user_id", this.userId)
      .order("sort_order", { ascending: true })
      .limit(LIST_LIMIT);
    if (error) {
      throw new Error(error.message);
    }
    return Promise.all((data ?? []).map((row) => mapRow(row as TRow)));
  }

  private async getOwnedRow<TRow, TResult>({
    tableName,
    selectColumns,
    id,
    mapRow,
  }: {
    tableName: string;
    selectColumns: string;
    id: string;
    mapRow: (row: TRow) => TResult;
  }): Promise<TResult> {
    const { data, error } = await this.supabase
      .from(tableName)
      .select(selectColumns)
      .eq("id", id)
      .eq("user_id", this.userId)
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return mapRow(data as TRow);
  }

  private async insertOwnedEncryptedRow(
    tableName: string,
    encrypted: Record<string, unknown>
  ): Promise<void> {
    const payload = { ...encrypted, user_id: this.userId };
    guardEncryptedWrite(payload);
    const { error } = await this.supabase.from(tableName).insert(payload);
    if (error) {
      throw new Error(error.message);
    }
  }

  private async updateOwnedEncryptedRow(
    tableName: string,
    id: string,
    payload: Record<string, unknown>,
    entityLabel: string
  ): Promise<void> {
    guardEncryptedWrite(payload);
    const { data, error } = await this.supabase
      .from(tableName)
      .update(payload)
      .eq("id", id)
      .eq("user_id", this.userId)
      .select("id")
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    assertOwnedRowUpdated(data, entityLabel);
  }

  private async deleteOwnedRow(tableName: string, id: string): Promise<void> {
    const { error } = await this.supabase
      .from(tableName)
      .delete()
      .eq("id", id)
      .eq("user_id", this.userId);
    if (error) {
      throw new Error(error.message);
    }
  }

  private async reorderOwnedRows<TUpdate extends { id: string }>({
    tableName,
    updates,
    buildPatch,
  }: {
    tableName: string;
    updates: TUpdate[];
    buildPatch: (update: TUpdate, nowIso: string) => Record<string, unknown>;
  }): Promise<void> {
    guardReorderLimit(updates.length);
    for (const update of updates) {
      const { error } = await this.supabase
        .from(tableName)
        .update(buildPatch(update, nowIso()))
        .eq("id", update.id)
        .eq("user_id", this.userId);
      if (error) {
        throw new Error(error.message);
      }
    }
  }

  async listTasks(): Promise<TaskListRow[]> {
    return this.listOwnedRows({
      tableName: "items",
      selectColumns: E2EE_LIST_COLUMNS.items,
      mapRow: (row: Parameters<typeof toTaskListItem>[0]) =>
        toTaskListItem(row, this.masterKey),
    });
  }

  async getTask(id: string): Promise<Task> {
    return this.getOwnedRow({
      tableName: "items",
      selectColumns: E2EE_DETAIL_COLUMNS.items,
      id,
      mapRow: (row: Parameters<typeof decryptTaskRow>[0]) =>
        decryptTaskRow(row, this.masterKey),
    });
  }

  async createTask(input: TaskInput, clientRecordId?: string): Promise<string> {
    const encrypted = await encryptTaskCreate(
      input,
      this.masterKey,
      clientRecordId
    );
    await this.insertOwnedEncryptedRow("items", encrypted);
    return encrypted.id;
  }

  async updateTask(id: string, input: Partial<TaskInput>): Promise<void> {
    const encrypted = await encryptTaskUpdate(id, input, this.masterKey);
    await this.updateOwnedEncryptedRow(
      "items",
      id,
      { ...encrypted, updated_at: nowIso() },
      "Task"
    );
  }

  async deleteTask(id: string): Promise<void> {
    await this.deleteOwnedRow("items", id);
  }

  async reorderTasks(
    updates: { id: string; sort_order: number; stage_id?: string }[]
  ): Promise<void> {
    await this.reorderOwnedRows({
      tableName: "items",
      updates,
      buildPatch: (update, updatedAt) => ({
        sort_order: update.sort_order,
        updated_at: updatedAt,
        ...(update.stage_id !== undefined ? { stage_id: update.stage_id } : {}),
      }),
    });
  }

  async listNotes(): Promise<NoteListRow[]> {
    return this.listOwnedRows({
      tableName: "notes",
      selectColumns: E2EE_LIST_COLUMNS.notes,
      mapRow: (row: Parameters<typeof toNoteListItem>[0]) =>
        toNoteListItem(row, this.masterKey),
    });
  }

  async getNote(id: string): Promise<Note> {
    return this.getOwnedRow({
      tableName: "notes",
      selectColumns: E2EE_DETAIL_COLUMNS.notes,
      id,
      mapRow: (row: Parameters<typeof decryptNoteRow>[0]) =>
        decryptNoteRow(row, this.masterKey),
    });
  }

  async createNote(input: NoteInput, clientRecordId?: string): Promise<string> {
    const encrypted = await encryptNoteCreate(
      input,
      this.masterKey,
      clientRecordId
    );
    await this.insertOwnedEncryptedRow("notes", encrypted);
    return encrypted.id;
  }

  async updateNote(id: string, input: Partial<NoteInput>): Promise<void> {
    const encrypted = await encryptNoteUpdate(id, input, this.masterKey);
    await this.updateOwnedEncryptedRow(
      "notes",
      id,
      { ...encrypted, updated_at: nowIso() },
      "Note"
    );
  }

  async deleteNote(id: string): Promise<void> {
    await this.deleteOwnedRow("notes", id);
  }

  async reorderNotes(
    updates: { id: string; sort_order: number; category_id?: string }[]
  ): Promise<void> {
    await this.reorderOwnedRows({
      tableName: "notes",
      updates,
      buildPatch: (update, updatedAt) => ({
        sort_order: update.sort_order,
        updated_at: updatedAt,
        ...(update.category_id !== undefined
          ? { category_id: update.category_id }
          : {}),
      }),
    });
  }

  async listContacts(): Promise<ContactListRow[]> {
    return this.listOwnedRows({
      tableName: "contacts",
      selectColumns: E2EE_LIST_COLUMNS.contacts,
      mapRow: (row: Parameters<typeof toContactListItem>[0]) =>
        toContactListItem(row, this.masterKey),
    });
  }

  async getContact(id: string): Promise<Contact> {
    return this.getOwnedRow({
      tableName: "contacts",
      selectColumns: E2EE_DETAIL_COLUMNS.contacts,
      id,
      mapRow: (row: Parameters<typeof decryptContactRow>[0]) =>
        decryptContactRow(row, this.masterKey),
    });
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
    await this.insertOwnedEncryptedRow("contacts", encrypted);
    return encrypted.id;
  }

  async updateContact(id: string, input: Partial<ContactInput>): Promise<void> {
    const encrypted = await encryptContactUpdate(id, input, this.masterKey);
    await this.updateOwnedEncryptedRow(
      "contacts",
      id,
      { ...encrypted, updated_at: nowIso() },
      "Contact"
    );
  }

  async deleteContact(id: string): Promise<void> {
    await this.deleteOwnedRow("contacts", id);
  }

  async reorderContacts(
    updates: { id: string; sort_order: number; category_id?: string }[]
  ): Promise<void> {
    await this.reorderOwnedRows({
      tableName: "contacts",
      updates,
      buildPatch: (update, updatedAt) => ({
        sort_order: update.sort_order,
        updated_at: updatedAt,
        ...(update.category_id !== undefined
          ? { category_id: update.category_id }
          : {}),
      }),
    });
  }

  async listLinks(): Promise<LinkListRow[]> {
    return this.listOwnedRows({
      tableName: "links",
      selectColumns: E2EE_LIST_COLUMNS.links,
      mapRow: (row: Parameters<typeof toLinkListItem>[0]) =>
        toLinkListItem(row, this.masterKey),
    });
  }

  async getLink(id: string): Promise<Link> {
    return this.getOwnedRow({
      tableName: "links",
      selectColumns: E2EE_DETAIL_COLUMNS.links,
      id,
      mapRow: (row: Parameters<typeof decryptLinkRow>[0]) =>
        decryptLinkRow(row, this.masterKey),
    });
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
    await this.insertOwnedEncryptedRow("links", encrypted);
    return encrypted.id;
  }

  async updateLink(id: string, input: Partial<LinkInput>): Promise<void> {
    if (input.folder_id != null && input.folder_id !== "") {
      await this.assertFolderOwned(input.folder_id);
    }
    const encrypted = await encryptLinkUpdate(id, input, this.masterKey);
    await this.updateOwnedEncryptedRow(
      "links",
      id,
      { ...encrypted, updated_at: nowIso() },
      "Link"
    );
  }

  async deleteLink(id: string): Promise<void> {
    await this.deleteOwnedRow("links", id);
  }

  async reorderLinks(
    updates: { id: string; sort_order: number }[]
  ): Promise<void> {
    await this.reorderOwnedRows({
      tableName: "links",
      updates,
      buildPatch: (update, updatedAt) => ({
        sort_order: update.sort_order,
        updated_at: updatedAt,
      }),
    });
  }

  async listLinkFolders(): Promise<LinkFolderListRow[]> {
    return this.listOwnedRows({
      tableName: "link_folders",
      selectColumns: E2EE_LIST_COLUMNS.link_folders,
      mapRow: (row: Parameters<typeof toLinkFolderListItem>[0]) =>
        toLinkFolderListItem(row, this.masterKey),
    });
  }

  /** Flat folder names for link form parent picker. */
  async listLinkFolderPickerItems(): Promise<EntityListItem[]> {
    return this.listOwnedRows({
      tableName: "link_folders",
      selectColumns: E2EE_LIST_COLUMNS.link_folders,
      mapRow: (row: Parameters<typeof toLinkFolderPickerItem>[0]) =>
        toLinkFolderPickerItem(row, this.masterKey),
    });
  }

  async reorderLinkFolders(
    updates: { id: string; sort_order: number }[]
  ): Promise<void> {
    await this.reorderOwnedRows({
      tableName: "link_folders",
      updates,
      buildPatch: (update, updatedAt) => ({
        sort_order: update.sort_order,
        updated_at: updatedAt,
      }),
    });
  }

  async getLinkFolder(id: string): Promise<LinkFolder> {
    return this.getOwnedRow({
      tableName: "link_folders",
      selectColumns: E2EE_DETAIL_COLUMNS.link_folders,
      id,
      mapRow: (row: Parameters<typeof decryptLinkFolderRow>[0]) =>
        decryptLinkFolderRow(row, this.masterKey),
    });
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
    await this.insertOwnedEncryptedRow("link_folders", encrypted);
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
    await this.updateOwnedEncryptedRow(
      "link_folders",
      id,
      { ...encrypted, updated_at: nowIso() },
      "Folder"
    );
  }

  async deleteLinkFolder(id: string): Promise<void> {
    await this.deleteOwnedRow("link_folders", id);
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
