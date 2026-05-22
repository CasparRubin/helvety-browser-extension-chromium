import {
  decryptContactRow,
  decryptLinkFolderRow,
  decryptLinkRow,
  decryptNoteRow,
  decryptTaskRow,
  toContactListItem,
  toLinkFolderListItem,
  toLinkListItem,
  toNoteListItem,
  toTaskListItem,
} from "./decrypt-entities";
/**
 * E2EE data access: PostgREST reads use narrow selects; writes spread only
 * `encrypt*` outputs plus `user_id` / structural metadata — never form plaintext.
 */
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
  EntityListItem,
  Link,
  LinkFolder,
  LinkFolderInput,
  LinkInput,
  Note,
  NoteInput,
  Task,
  TaskInput,
} from "./entity-types";
import type { ExtensionSupabaseClient } from "./extension-supabase";

const LIST_LIMIT = 500;

/**
 *
 */
function nowIso(): string {
  return new Date().toISOString();
}

/**
 *
 */
export class EntityRepository {
  constructor(
    private readonly supabase: ExtensionSupabaseClient,
    private readonly userId: string,
    private readonly masterKey: CryptoKey
  ) {}

  async listTasks(): Promise<EntityListItem[]> {
    const { data, error } = await this.supabase
      .from("items")
      .select(TASK_LIST_SELECT)
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
      .select(TASK_DETAIL_SELECT)
      .eq("id", id)
      .eq("user_id", this.userId)
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return decryptTaskRow(data, this.masterKey);
  }

  async createTask(input: TaskInput): Promise<string> {
    const encrypted = await encryptTaskCreate(input, this.masterKey);
    const { error } = await this.supabase.from("items").insert({
      ...encrypted,
      user_id: this.userId,
    });
    if (error) {
      throw new Error(error.message);
    }
    return encrypted.id;
  }

  async updateTask(id: string, input: Partial<TaskInput>): Promise<void> {
    const encrypted = await encryptTaskUpdate(id, input, this.masterKey);
    const { error } = await this.supabase
      .from("items")
      .update({ ...encrypted, updated_at: nowIso() })
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

  async listNotes(): Promise<EntityListItem[]> {
    const { data, error } = await this.supabase
      .from("notes")
      .select(NOTE_LIST_SELECT)
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
      .select(NOTE_DETAIL_SELECT)
      .eq("id", id)
      .eq("user_id", this.userId)
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return decryptNoteRow(data, this.masterKey);
  }

  async createNote(input: NoteInput): Promise<string> {
    const encrypted = await encryptNoteCreate(input, this.masterKey);
    const { error } = await this.supabase.from("notes").insert({
      ...encrypted,
      user_id: this.userId,
    });
    if (error) {
      throw new Error(error.message);
    }
    return encrypted.id;
  }

  async updateNote(id: string, input: Partial<NoteInput>): Promise<void> {
    const encrypted = await encryptNoteUpdate(id, input, this.masterKey);
    const { error } = await this.supabase
      .from("notes")
      .update({ ...encrypted, updated_at: nowIso() })
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

  async listContacts(): Promise<EntityListItem[]> {
    const { data, error } = await this.supabase
      .from("contacts")
      .select(CONTACT_LIST_SELECT)
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
      .select(CONTACT_DETAIL_SELECT)
      .eq("id", id)
      .eq("user_id", this.userId)
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return decryptContactRow(data, this.masterKey);
  }

  async createContact(input: ContactInput): Promise<string> {
    const encrypted = await encryptContactCreate(input, this.masterKey);
    const { error } = await this.supabase.from("contacts").insert({
      ...encrypted,
      user_id: this.userId,
    });
    if (error) {
      throw new Error(error.message);
    }
    return encrypted.id;
  }

  async updateContact(id: string, input: Partial<ContactInput>): Promise<void> {
    const encrypted = await encryptContactUpdate(id, input, this.masterKey);
    const { error } = await this.supabase
      .from("contacts")
      .update({ ...encrypted, updated_at: nowIso() })
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

  async listLinks(): Promise<EntityListItem[]> {
    const { data, error } = await this.supabase
      .from("links")
      .select(LINK_LIST_SELECT)
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
      .select(LINK_DETAIL_SELECT)
      .eq("id", id)
      .eq("user_id", this.userId)
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return decryptLinkRow(data, this.masterKey);
  }

  async createLink(input: LinkInput): Promise<string> {
    if (input.folder_id != null && input.folder_id !== "") {
      await this.assertFolderOwned(input.folder_id);
    }
    const encrypted = await encryptLinkCreate(input, this.masterKey);
    const { error } = await this.supabase.from("links").insert({
      ...encrypted,
      user_id: this.userId,
    });
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
    const { error } = await this.supabase
      .from("links")
      .update({ ...encrypted, updated_at: nowIso() })
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

  async listLinkFolders(): Promise<EntityListItem[]> {
    const { data, error } = await this.supabase
      .from("link_folders")
      .select(LINK_FOLDER_LIST_SELECT)
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

  async getLinkFolder(id: string): Promise<LinkFolder> {
    const { data, error } = await this.supabase
      .from("link_folders")
      .select(LINK_FOLDER_DETAIL_SELECT)
      .eq("id", id)
      .eq("user_id", this.userId)
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return decryptLinkFolderRow(data, this.masterKey);
  }

  async createLinkFolder(input: LinkFolderInput): Promise<string> {
    if (input.parent_folder_id) {
      await this.assertFolderOwned(input.parent_folder_id);
    }
    const encrypted = await encryptLinkFolderCreate(input, this.masterKey);
    const { error } = await this.supabase.from("link_folders").insert({
      ...encrypted,
      user_id: this.userId,
    });
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
    const { error } = await this.supabase
      .from("link_folders")
      .update({ ...encrypted, updated_at: nowIso() })
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
