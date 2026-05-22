/**
 * Client-side encryption for Supabase entity writes.
 *
 * Invariant: returned payloads use `encrypted_*` columns only for human-readable
 * content. Plaintext never appears in insert/update objects from this module.
 */
import {
  buildAAD,
  encrypt,
  serializeEncryptedData,
} from "@helvety/shared/crypto/encryption";

import {
  DEFAULT_CONTACT_CATEGORY_ID,
  DEFAULT_NOTE_CATEGORY_ID,
  DEFAULT_TASK_LABEL_ID,
  DEFAULT_TASK_PRIORITY,
  DEFAULT_TASK_STAGE_ID,
} from "./entity-defaults";
import {
  normalizeBookmarkUrl,
  resolveLinkDisplayName,
} from "./link-url-normalize";

import type {
  ContactInput,
  LinkFolderInput,
  LinkInput,
  NoteInput,
  TaskInput,
} from "./entity-types";

/**
 *
 */
function prepareLinkNameAndUrl(
  name: string,
  url: string
): {
  name: string;
  url: string;
} {
  const urlResult = normalizeBookmarkUrl(url);
  if (!urlResult.ok) {
    throw new Error(urlResult.error);
  }
  return {
    url: urlResult.url,
    name: resolveLinkDisplayName(name, urlResult.url),
  };
}

/**
 *
 */
async function encryptRequired(
  plaintext: string,
  key: CryptoKey,
  aad: string
): Promise<string> {
  return serializeEncryptedData(await encrypt(plaintext, key, aad));
}

/**
 *
 */
async function encryptOptional(
  value: string | null | undefined,
  key: CryptoKey,
  aad: string
): Promise<string | null> {
  if (value === undefined) {
    return null;
  }
  if (value === null || value.trim() === "") {
    return null;
  }
  return serializeEncryptedData(await encrypt(value, key, aad));
}

/**
 *
 */
export async function encryptContactCreate(
  input: ContactInput,
  key: CryptoKey
): Promise<{
  id: string;
  encrypted_first_name: string;
  encrypted_last_name: string;
  encrypted_description: string | null;
  encrypted_email: string | null;
  encrypted_phone: string | null;
  encrypted_birthday: string | null;
  encrypted_notes: string | null;
  category_id: string;
}> {
  const id = crypto.randomUUID();
  const aad = buildAAD("contacts", id);
  return {
    id,
    encrypted_first_name: await encryptRequired(input.first_name, key, aad),
    encrypted_last_name: await encryptRequired(input.last_name, key, aad),
    encrypted_description: await encryptOptional(input.description, key, aad),
    encrypted_email: await encryptOptional(input.email, key, aad),
    encrypted_phone: await encryptOptional(input.phone, key, aad),
    encrypted_birthday: await encryptOptional(input.birthday, key, aad),
    encrypted_notes: await encryptOptional(input.notes, key, aad),
    category_id: input.category_id ?? DEFAULT_CONTACT_CATEGORY_ID,
  };
}

/**
 *
 */
export async function encryptContactUpdate(
  id: string,
  input: Partial<ContactInput>,
  key: CryptoKey
): Promise<{
  encrypted_first_name?: string;
  encrypted_last_name?: string;
  encrypted_description?: string | null;
  encrypted_email?: string | null;
  encrypted_phone?: string | null;
  encrypted_birthday?: string | null;
  encrypted_notes?: string | null;
  category_id?: string;
}> {
  const aad = buildAAD("contacts", id);
  const patch: {
    encrypted_first_name?: string;
    encrypted_last_name?: string;
    encrypted_description?: string | null;
    encrypted_email?: string | null;
    encrypted_phone?: string | null;
    encrypted_birthday?: string | null;
    encrypted_notes?: string | null;
    category_id?: string;
  } = {};

  if (input.first_name !== undefined) {
    patch.encrypted_first_name = await encryptRequired(
      input.first_name,
      key,
      aad
    );
  }
  if (input.last_name !== undefined) {
    patch.encrypted_last_name = await encryptRequired(
      input.last_name,
      key,
      aad
    );
  }
  if (input.description !== undefined) {
    patch.encrypted_description = await encryptOptional(
      input.description,
      key,
      aad
    );
  }
  if (input.email !== undefined) {
    patch.encrypted_email = await encryptOptional(input.email, key, aad);
  }
  if (input.phone !== undefined) {
    patch.encrypted_phone = await encryptOptional(input.phone, key, aad);
  }
  if (input.birthday !== undefined) {
    patch.encrypted_birthday = await encryptOptional(input.birthday, key, aad);
  }
  if (input.notes !== undefined) {
    patch.encrypted_notes = await encryptOptional(input.notes, key, aad);
  }
  if (input.category_id !== undefined) {
    patch.category_id = input.category_id;
  }

  return patch;
}

/**
 *
 */
export async function encryptNoteCreate(
  input: NoteInput,
  key: CryptoKey
): Promise<{
  id: string;
  encrypted_title: string;
  encrypted_description: string | null;
  category_id: string;
}> {
  const id = crypto.randomUUID();
  const aad = buildAAD("notes", id);
  return {
    id,
    encrypted_title: await encryptRequired(input.title, key, aad),
    encrypted_description: await encryptOptional(input.description, key, aad),
    category_id: input.category_id ?? DEFAULT_NOTE_CATEGORY_ID,
  };
}

/**
 *
 */
export async function encryptNoteUpdate(
  id: string,
  input: Partial<NoteInput>,
  key: CryptoKey
): Promise<{
  encrypted_title?: string;
  encrypted_description?: string | null;
  category_id?: string;
}> {
  const aad = buildAAD("notes", id);
  const patch: {
    encrypted_title?: string;
    encrypted_description?: string | null;
    category_id?: string;
  } = {};

  if (input.title !== undefined) {
    patch.encrypted_title = await encryptRequired(input.title, key, aad);
  }
  if (input.description !== undefined) {
    patch.encrypted_description = await encryptOptional(
      input.description,
      key,
      aad
    );
  }
  if (input.category_id !== undefined) {
    patch.category_id = input.category_id;
  }

  return patch;
}

/**
 *
 */
export async function encryptTaskCreate(
  input: TaskInput,
  key: CryptoKey
): Promise<{
  id: string;
  encrypted_title: string;
  encrypted_description: string | null;
  encrypted_start_date: string | null;
  encrypted_end_date: string | null;
  stage_id: string;
  label_id: string;
  priority: number;
}> {
  const id = crypto.randomUUID();
  const aad = buildAAD("items", id);
  return {
    id,
    encrypted_title: await encryptRequired(input.title, key, aad),
    encrypted_description: await encryptOptional(input.description, key, aad),
    encrypted_start_date: await encryptOptional(input.start_date, key, aad),
    encrypted_end_date: await encryptOptional(input.end_date, key, aad),
    stage_id: input.stage_id ?? DEFAULT_TASK_STAGE_ID,
    label_id: input.label_id ?? DEFAULT_TASK_LABEL_ID,
    priority: input.priority ?? DEFAULT_TASK_PRIORITY,
  };
}

/**
 *
 */
export async function encryptTaskUpdate(
  id: string,
  input: Partial<TaskInput>,
  key: CryptoKey
): Promise<{
  encrypted_title?: string;
  encrypted_description?: string | null;
  encrypted_start_date?: string | null;
  encrypted_end_date?: string | null;
  stage_id?: string;
  label_id?: string;
  priority?: number;
}> {
  const aad = buildAAD("items", id);
  const patch: {
    encrypted_title?: string;
    encrypted_description?: string | null;
    encrypted_start_date?: string | null;
    encrypted_end_date?: string | null;
    stage_id?: string;
    label_id?: string;
    priority?: number;
  } = {};

  if (input.title !== undefined) {
    patch.encrypted_title = await encryptRequired(input.title, key, aad);
  }
  if (input.description !== undefined) {
    patch.encrypted_description = await encryptOptional(
      input.description,
      key,
      aad
    );
  }
  if (input.start_date !== undefined) {
    patch.encrypted_start_date = await encryptOptional(
      input.start_date,
      key,
      aad
    );
  }
  if (input.end_date !== undefined) {
    patch.encrypted_end_date = await encryptOptional(input.end_date, key, aad);
  }
  if (input.stage_id !== undefined) {
    patch.stage_id = input.stage_id;
  }
  if (input.label_id !== undefined) {
    patch.label_id = input.label_id;
  }
  if (input.priority !== undefined) {
    patch.priority = input.priority;
  }

  return patch;
}

/**
 *
 */
export async function encryptLinkCreate(
  input: LinkInput,
  key: CryptoKey
): Promise<{
  id: string;
  encrypted_name: string;
  encrypted_url: string;
  folder_id: string | null;
}> {
  const id = crypto.randomUUID();
  const aad = buildAAD("links", id);
  const { name, url } = prepareLinkNameAndUrl(input.name, input.url);
  return {
    id,
    encrypted_name: await encryptRequired(name, key, aad),
    encrypted_url: await encryptRequired(url, key, aad),
    folder_id: input.folder_id ?? null,
  };
}

/**
 *
 */
export async function encryptLinkUpdate(
  id: string,
  input: Partial<LinkInput>,
  key: CryptoKey
): Promise<{
  encrypted_name?: string;
  encrypted_url?: string;
  folder_id?: string | null;
}> {
  const aad = buildAAD("links", id);
  const patch: {
    encrypted_name?: string;
    encrypted_url?: string;
    folder_id?: string | null;
  } = {};

  if (input.url !== undefined) {
    const { name, url } = prepareLinkNameAndUrl(input.name ?? "", input.url);
    patch.encrypted_url = await encryptRequired(url, key, aad);
    patch.encrypted_name = await encryptRequired(name, key, aad);
  } else if (input.name !== undefined) {
    patch.encrypted_name = await encryptRequired(input.name, key, aad);
  }
  if (input.folder_id !== undefined) {
    patch.folder_id = input.folder_id;
  }

  return patch;
}

/**
 *
 */
export async function encryptLinkFolderCreate(
  input: LinkFolderInput,
  key: CryptoKey
): Promise<{
  id: string;
  encrypted_name: string;
  parent_folder_id: string | null;
}> {
  const id = crypto.randomUUID();
  const aad = buildAAD("link_folders", id);
  return {
    id,
    encrypted_name: await encryptRequired(input.name, key, aad),
    parent_folder_id: input.parent_folder_id ?? null,
  };
}

/**
 *
 */
export async function encryptLinkFolderUpdate(
  id: string,
  input: Partial<LinkFolderInput>,
  key: CryptoKey
): Promise<{
  encrypted_name?: string;
  parent_folder_id?: string | null;
}> {
  const aad = buildAAD("link_folders", id);
  const patch: {
    encrypted_name?: string;
    parent_folder_id?: string | null;
  } = {};

  if (input.name !== undefined) {
    patch.encrypted_name = await encryptRequired(input.name, key, aad);
  }
  if (input.parent_folder_id !== undefined) {
    patch.parent_folder_id = input.parent_folder_id;
  }

  return patch;
}
