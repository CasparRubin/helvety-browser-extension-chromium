import {
  decryptEntityField,
  parseEncryptedData,
} from "@helvety/shared/crypto/encryption";

import { DEFAULT_CONTACT_CATEGORY_ID } from "./entity-defaults";

import type {
  Contact,
  ContactListRow,
  EntityListItem,
  Link,
  LinkFolder,
  LinkFolderListRow,
  LinkListRow,
  Note,
  NoteListRow,
  Task,
  TaskListRow,
} from "./entity-types";

/**
 * Decryption for extension reads (Web Crypto via @helvety/shared).
 * Plaintext exists in extension memory while unlocked only.
 */

const CONTACTS_TABLE = "contacts" as const;
const NOTES_TABLE = "notes" as const;
const ITEMS_TABLE = "items" as const;
const LINKS_TABLE = "links" as const;
const LINK_FOLDERS_TABLE = "link_folders" as const;

/** Field-bound AAD context (`table`, `recordId`, `column`). */
type FieldContext = {
  table: string;
  recordId: string;
  column: string;
};

export interface TaskEncryptedRow {
  id: string;
  encrypted_title: string;
  stage_id: string;
  sort_order: number;
  created_at: string;
}

export interface TaskDetailRow extends TaskEncryptedRow {
  user_id: string;
  encrypted_description: string | null;
  encrypted_start_date: string | null;
  encrypted_end_date: string | null;
  stage_id: string;
  label_id: string;
  priority: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface NoteEncryptedRow {
  id: string;
  encrypted_title: string;
  category_id: string;
  sort_order: number;
  created_at: string;
}

export interface NoteDetailRow extends NoteEncryptedRow {
  user_id: string;
  encrypted_description: string | null;
  category_id: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ContactEncryptedRow {
  id: string;
  encrypted_first_name: string;
  encrypted_last_name: string;
  category_id: string;
  sort_order: number;
  created_at: string;
}

export interface ContactDetailRow extends ContactEncryptedRow {
  user_id: string;
  encrypted_description: string | null;
  encrypted_email: string | null;
  encrypted_phone: string | null;
  encrypted_birthday: string | null;
  encrypted_notes: string | null;
  category_id: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface LinkEncryptedRow {
  id: string;
  encrypted_name: string;
  encrypted_url: string;
  folder_id: string | null;
  sort_order: number;
  created_at: string;
}

export interface LinkDetailRow extends LinkEncryptedRow {
  user_id: string;
  encrypted_url: string;
  folder_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface LinkFolderEncryptedRow {
  id: string;
  encrypted_name: string;
  parent_folder_id: string | null;
  sort_order: number;
  created_at: string;
}

export interface LinkFolderDetailRow extends LinkFolderEncryptedRow {
  user_id: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

async function decryptOptionalField(
  serialized: string | null,
  key: CryptoKey,
  ctx: FieldContext
): Promise<string | null> {
  if (!serialized) {
    return null;
  }
  return decryptEntityField(parseEncryptedData(serialized), key, ctx);
}

export async function decryptTaskTitle(
  row: TaskEncryptedRow,
  key: CryptoKey
): Promise<string> {
  return decryptEntityField(parseEncryptedData(row.encrypted_title), key, {
    table: ITEMS_TABLE,
    recordId: row.id,
    column: "encrypted_title",
  });
}

export async function decryptTaskRow(
  row: TaskDetailRow,
  key: CryptoKey
): Promise<Task> {
  const ctx = { table: ITEMS_TABLE, recordId: row.id };
  return {
    id: row.id,
    user_id: row.user_id,
    title: await decryptEntityField(
      parseEncryptedData(row.encrypted_title),
      key,
      { ...ctx, column: "encrypted_title" }
    ),
    description: await decryptOptionalField(row.encrypted_description, key, {
      ...ctx,
      column: "encrypted_description",
    }),
    start_date: await decryptOptionalField(row.encrypted_start_date, key, {
      ...ctx,
      column: "encrypted_start_date",
    }),
    end_date: await decryptOptionalField(row.encrypted_end_date, key, {
      ...ctx,
      column: "encrypted_end_date",
    }),
    stage_id: row.stage_id,
    label_id: row.label_id,
    priority: row.priority,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function decryptNoteTitle(
  row: NoteEncryptedRow,
  key: CryptoKey
): Promise<string> {
  return decryptEntityField(parseEncryptedData(row.encrypted_title), key, {
    table: NOTES_TABLE,
    recordId: row.id,
    column: "encrypted_title",
  });
}

export async function decryptNoteRow(
  row: NoteDetailRow,
  key: CryptoKey
): Promise<Note> {
  const ctx = { table: NOTES_TABLE, recordId: row.id };
  return {
    id: row.id,
    user_id: row.user_id,
    title: await decryptEntityField(
      parseEncryptedData(row.encrypted_title),
      key,
      { ...ctx, column: "encrypted_title" }
    ),
    description: await decryptOptionalField(row.encrypted_description, key, {
      ...ctx,
      column: "encrypted_description",
    }),
    category_id: row.category_id,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** Decrypts contact first and last names for list rows and labels. */
async function decryptContactNames(
  row: ContactEncryptedRow,
  key: CryptoKey
): Promise<{ first: string; last: string }> {
  const ctx = { table: CONTACTS_TABLE, recordId: row.id };
  const first = await decryptEntityField(
    parseEncryptedData(row.encrypted_first_name),
    key,
    { ...ctx, column: "encrypted_first_name" }
  );
  const last = await decryptEntityField(
    parseEncryptedData(row.encrypted_last_name),
    key,
    { ...ctx, column: "encrypted_last_name" }
  );
  return { first, last };
}

export async function decryptContactLabel(
  row: ContactEncryptedRow,
  key: CryptoKey
): Promise<string> {
  const { first, last } = await decryptContactNames(row, key);
  return `${first} ${last}`.trim();
}

export async function decryptContactRow(
  row: ContactDetailRow,
  key: CryptoKey
): Promise<Contact> {
  const ctx = { table: CONTACTS_TABLE, recordId: row.id };
  return {
    id: row.id,
    user_id: row.user_id,
    first_name: await decryptEntityField(
      parseEncryptedData(row.encrypted_first_name),
      key,
      { ...ctx, column: "encrypted_first_name" }
    ),
    last_name: await decryptEntityField(
      parseEncryptedData(row.encrypted_last_name),
      key,
      { ...ctx, column: "encrypted_last_name" }
    ),
    description: await decryptOptionalField(row.encrypted_description, key, {
      ...ctx,
      column: "encrypted_description",
    }),
    email: await decryptOptionalField(row.encrypted_email, key, {
      ...ctx,
      column: "encrypted_email",
    }),
    phone: await decryptOptionalField(row.encrypted_phone, key, {
      ...ctx,
      column: "encrypted_phone",
    }),
    birthday: await decryptOptionalField(row.encrypted_birthday, key, {
      ...ctx,
      column: "encrypted_birthday",
    }),
    notes: await decryptOptionalField(row.encrypted_notes, key, {
      ...ctx,
      column: "encrypted_notes",
    }),
    category_id: row.category_id ?? DEFAULT_CONTACT_CATEGORY_ID,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function decryptLinkName(
  row: LinkEncryptedRow,
  key: CryptoKey
): Promise<string> {
  return decryptEntityField(parseEncryptedData(row.encrypted_name), key, {
    table: LINKS_TABLE,
    recordId: row.id,
    column: "encrypted_name",
  });
}

export async function decryptLinkRow(
  row: LinkDetailRow,
  key: CryptoKey
): Promise<Link> {
  const ctx = { table: LINKS_TABLE, recordId: row.id };
  return {
    id: row.id,
    user_id: row.user_id,
    name: await decryptEntityField(
      parseEncryptedData(row.encrypted_name),
      key,
      { ...ctx, column: "encrypted_name" }
    ),
    url: await decryptEntityField(parseEncryptedData(row.encrypted_url), key, {
      ...ctx,
      column: "encrypted_url",
    }),
    folder_id: row.folder_id,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function decryptLinkFolderName(
  row: LinkFolderEncryptedRow,
  key: CryptoKey
): Promise<string> {
  return decryptEntityField(parseEncryptedData(row.encrypted_name), key, {
    table: LINK_FOLDERS_TABLE,
    recordId: row.id,
    column: "encrypted_name",
  });
}

export async function decryptLinkFolderRow(
  row: LinkFolderDetailRow,
  key: CryptoKey
): Promise<LinkFolder> {
  return {
    id: row.id,
    user_id: row.user_id,
    name: await decryptEntityField(
      parseEncryptedData(row.encrypted_name),
      key,
      {
        table: LINK_FOLDERS_TABLE,
        recordId: row.id,
        column: "encrypted_name",
      }
    ),
    parent_folder_id: row.parent_folder_id,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function toTaskListItem(
  row: TaskEncryptedRow,
  key: CryptoKey
): Promise<TaskListRow> {
  return {
    id: row.id,
    title: await decryptTaskTitle(row, key),
    stage_id: row.stage_id,
    sort_order: row.sort_order,
    created_at: row.created_at,
  };
}

export async function toNoteListItem(
  row: NoteEncryptedRow,
  key: CryptoKey
): Promise<NoteListRow> {
  return {
    id: row.id,
    title: await decryptNoteTitle(row, key),
    category_id: row.category_id,
    sort_order: row.sort_order,
    created_at: row.created_at,
  };
}

export async function toContactListItem(
  row: ContactEncryptedRow,
  key: CryptoKey
): Promise<ContactListRow> {
  const { first, last } = await decryptContactNames(row, key);
  return {
    id: row.id,
    first_name: first,
    last_name: last,
    category_id: row.category_id,
    sort_order: row.sort_order,
    created_at: row.created_at,
  };
}

export async function toLinkListItem(
  row: LinkEncryptedRow,
  key: CryptoKey
): Promise<LinkListRow> {
  return {
    id: row.id,
    name: await decryptLinkName(row, key),
    url: await decryptEntityField(parseEncryptedData(row.encrypted_url), key, {
      table: LINKS_TABLE,
      recordId: row.id,
      column: "encrypted_url",
    }),
    folder_id: row.folder_id,
    sort_order: row.sort_order,
    created_at: row.created_at,
  };
}

export async function toLinkFolderListItem(
  row: LinkFolderEncryptedRow,
  key: CryptoKey
): Promise<LinkFolderListRow> {
  return {
    id: row.id,
    name: await decryptLinkFolderName(row, key),
    parent_folder_id: row.parent_folder_id,
    sort_order: row.sort_order,
    created_at: row.created_at,
  };
}

/** Folder picker label ({ id, title }). */
export async function toLinkFolderPickerItem(
  row: LinkFolderEncryptedRow,
  key: CryptoKey
): Promise<EntityListItem> {
  return {
    id: row.id,
    title: await decryptLinkFolderName(row, key),
  };
}
