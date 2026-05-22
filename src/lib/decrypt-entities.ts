import {
  buildAAD,
  decrypt,
  parseEncryptedData,
} from "@helvety/shared/crypto/encryption";

import { DEFAULT_CONTACT_CATEGORY_ID } from "./entity-defaults";

import type {
  Contact,
  EntityListItem,
  Link,
  LinkFolder,
  Note,
  Task,
} from "./entity-types";

/**
 * Decryption for extension reads (Web Crypto via @helvety/shared).
 * Plaintext exists in extension memory while unlocked only.
 */

/**
 *
 */
export interface TaskEncryptedRow {
  id: string;
  encrypted_title: string;
}

/**
 *
 */
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

/**
 *
 */
export interface NoteEncryptedRow {
  id: string;
  encrypted_title: string;
}

/**
 *
 */
export interface NoteDetailRow extends NoteEncryptedRow {
  user_id: string;
  encrypted_description: string | null;
  category_id: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 *
 */
export interface ContactEncryptedRow {
  id: string;
  encrypted_first_name: string;
  encrypted_last_name: string;
}

/**
 *
 */
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

/**
 *
 */
export interface LinkEncryptedRow {
  id: string;
  encrypted_name: string;
}

/**
 *
 */
export interface LinkDetailRow extends LinkEncryptedRow {
  user_id: string;
  encrypted_url: string;
  folder_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 *
 */
export interface LinkFolderEncryptedRow {
  id: string;
  encrypted_name: string;
  parent_folder_id: string | null;
}

/**
 *
 */
export interface LinkFolderDetailRow extends LinkFolderEncryptedRow {
  user_id: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 *
 */
async function decryptOptionalField(
  serialized: string | null,
  key: CryptoKey,
  aad: string
): Promise<string | null> {
  if (!serialized) {
    return null;
  }
  return decrypt(parseEncryptedData(serialized), key, aad);
}

/**
 *
 */
export async function decryptTaskTitle(
  row: TaskEncryptedRow,
  key: CryptoKey
): Promise<string> {
  const aad = buildAAD("items", row.id);
  return decrypt(parseEncryptedData(row.encrypted_title), key, aad);
}

/**
 *
 */
export async function decryptTaskRow(
  row: TaskDetailRow,
  key: CryptoKey
): Promise<Task> {
  const aad = buildAAD("items", row.id);
  return {
    id: row.id,
    user_id: row.user_id,
    title: await decrypt(parseEncryptedData(row.encrypted_title), key, aad),
    description: await decryptOptionalField(
      row.encrypted_description,
      key,
      aad
    ),
    start_date: await decryptOptionalField(row.encrypted_start_date, key, aad),
    end_date: await decryptOptionalField(row.encrypted_end_date, key, aad),
    stage_id: row.stage_id,
    label_id: row.label_id,
    priority: row.priority,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 *
 */
export async function decryptNoteTitle(
  row: NoteEncryptedRow,
  key: CryptoKey
): Promise<string> {
  const aad = buildAAD("notes", row.id);
  return decrypt(parseEncryptedData(row.encrypted_title), key, aad);
}

/**
 *
 */
export async function decryptNoteRow(
  row: NoteDetailRow,
  key: CryptoKey
): Promise<Note> {
  const aad = buildAAD("notes", row.id);
  return {
    id: row.id,
    user_id: row.user_id,
    title: await decrypt(parseEncryptedData(row.encrypted_title), key, aad),
    description: await decryptOptionalField(
      row.encrypted_description,
      key,
      aad
    ),
    category_id: row.category_id,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 *
 */
export async function decryptContactLabel(
  row: ContactEncryptedRow,
  key: CryptoKey
): Promise<string> {
  const aad = buildAAD("contacts", row.id);
  const first = await decrypt(
    parseEncryptedData(row.encrypted_first_name),
    key,
    aad
  );
  const last = await decrypt(
    parseEncryptedData(row.encrypted_last_name),
    key,
    aad
  );
  return `${first} ${last}`.trim();
}

/**
 *
 */
export async function decryptContactRow(
  row: ContactDetailRow,
  key: CryptoKey
): Promise<Contact> {
  const aad = buildAAD("contacts", row.id);
  return {
    id: row.id,
    user_id: row.user_id,
    first_name: await decrypt(
      parseEncryptedData(row.encrypted_first_name),
      key,
      aad
    ),
    last_name: await decrypt(
      parseEncryptedData(row.encrypted_last_name),
      key,
      aad
    ),
    description: await decryptOptionalField(
      row.encrypted_description,
      key,
      aad
    ),
    email: await decryptOptionalField(row.encrypted_email, key, aad),
    phone: await decryptOptionalField(row.encrypted_phone, key, aad),
    birthday: await decryptOptionalField(row.encrypted_birthday, key, aad),
    notes: await decryptOptionalField(row.encrypted_notes, key, aad),
    category_id: row.category_id ?? DEFAULT_CONTACT_CATEGORY_ID,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 *
 */
export async function decryptLinkName(
  row: LinkEncryptedRow,
  key: CryptoKey
): Promise<string> {
  const aad = buildAAD("links", row.id);
  return decrypt(parseEncryptedData(row.encrypted_name), key, aad);
}

/**
 *
 */
export async function decryptLinkRow(
  row: LinkDetailRow,
  key: CryptoKey
): Promise<Link> {
  const aad = buildAAD("links", row.id);
  return {
    id: row.id,
    user_id: row.user_id,
    name: await decrypt(parseEncryptedData(row.encrypted_name), key, aad),
    url: await decrypt(parseEncryptedData(row.encrypted_url), key, aad),
    folder_id: row.folder_id,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 *
 */
export async function decryptLinkFolderName(
  row: LinkFolderEncryptedRow,
  key: CryptoKey
): Promise<string> {
  const aad = buildAAD("link_folders", row.id);
  return decrypt(parseEncryptedData(row.encrypted_name), key, aad);
}

/**
 *
 */
export async function decryptLinkFolderRow(
  row: LinkFolderDetailRow,
  key: CryptoKey
): Promise<LinkFolder> {
  const aad = buildAAD("link_folders", row.id);
  return {
    id: row.id,
    user_id: row.user_id,
    name: await decrypt(parseEncryptedData(row.encrypted_name), key, aad),
    parent_folder_id: row.parent_folder_id,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 *
 */
export async function toTaskListItem(
  row: TaskEncryptedRow,
  key: CryptoKey
): Promise<EntityListItem> {
  return { id: row.id, title: await decryptTaskTitle(row, key) };
}

/**
 *
 */
export async function toNoteListItem(
  row: NoteEncryptedRow,
  key: CryptoKey
): Promise<EntityListItem> {
  return { id: row.id, title: await decryptNoteTitle(row, key) };
}

/**
 *
 */
export async function toContactListItem(
  row: ContactEncryptedRow,
  key: CryptoKey
): Promise<EntityListItem> {
  return { id: row.id, title: await decryptContactLabel(row, key) };
}

/**
 *
 */
export async function toLinkListItem(
  row: LinkEncryptedRow,
  key: CryptoKey
): Promise<EntityListItem> {
  return { id: row.id, title: await decryptLinkName(row, key) };
}

/**
 *
 */
export async function toLinkFolderListItem(
  row: LinkFolderEncryptedRow,
  key: CryptoKey
): Promise<EntityListItem> {
  return { id: row.id, title: await decryptLinkFolderName(row, key) };
}
