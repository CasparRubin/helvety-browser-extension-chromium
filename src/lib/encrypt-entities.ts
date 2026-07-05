/**
 * Client-side encryption for Supabase entity writes.
 *
 * Invariant: returned payloads use `encrypted_*` columns only for human-readable
 * content. Plaintext never appears in insert/update objects from this module.
 */
import {
  encryptEntityField,
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

async function encryptRequired(
  plaintext: string,
  key: CryptoKey,
  ctx: FieldContext
): Promise<string> {
  return serializeEncryptedData(await encryptEntityField(plaintext, key, ctx));
}

async function encryptOptional(
  value: string | null | undefined,
  key: CryptoKey,
  ctx: FieldContext
): Promise<string | null> {
  if (value === undefined) {
    return null;
  }
  if (value === null || value.trim() === "") {
    return null;
  }
  return serializeEncryptedData(await encryptEntityField(value, key, ctx));
}

export async function encryptContactCreate(
  input: ContactInput,
  key: CryptoKey,
  clientRecordId?: string
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
  const recordId = clientRecordId ?? crypto.randomUUID();
  const table = CONTACTS_TABLE;
  return {
    id: recordId,
    encrypted_first_name: await encryptRequired(input.first_name, key, {
      table,
      recordId,
      column: "encrypted_first_name",
    }),
    encrypted_last_name: await encryptRequired(input.last_name, key, {
      table,
      recordId,
      column: "encrypted_last_name",
    }),
    encrypted_description: await encryptOptional(input.description, key, {
      table,
      recordId,
      column: "encrypted_description",
    }),
    encrypted_email: await encryptOptional(input.email, key, {
      table,
      recordId,
      column: "encrypted_email",
    }),
    encrypted_phone: await encryptOptional(input.phone, key, {
      table,
      recordId,
      column: "encrypted_phone",
    }),
    encrypted_birthday: await encryptOptional(input.birthday, key, {
      table,
      recordId,
      column: "encrypted_birthday",
    }),
    encrypted_notes: await encryptOptional(input.notes, key, {
      table,
      recordId,
      column: "encrypted_notes",
    }),
    category_id: input.category_id ?? DEFAULT_CONTACT_CATEGORY_ID,
  };
}

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
  const table = CONTACTS_TABLE;
  const recordId = id;
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
    patch.encrypted_first_name = await encryptRequired(input.first_name, key, {
      table,
      recordId,
      column: "encrypted_first_name",
    });
  }
  if (input.last_name !== undefined) {
    patch.encrypted_last_name = await encryptRequired(input.last_name, key, {
      table,
      recordId,
      column: "encrypted_last_name",
    });
  }
  if (input.description !== undefined) {
    patch.encrypted_description = await encryptOptional(
      input.description,
      key,
      { table, recordId, column: "encrypted_description" }
    );
  }
  if (input.email !== undefined) {
    patch.encrypted_email = await encryptOptional(input.email, key, {
      table,
      recordId,
      column: "encrypted_email",
    });
  }
  if (input.phone !== undefined) {
    patch.encrypted_phone = await encryptOptional(input.phone, key, {
      table,
      recordId,
      column: "encrypted_phone",
    });
  }
  if (input.birthday !== undefined) {
    patch.encrypted_birthday = await encryptOptional(input.birthday, key, {
      table,
      recordId,
      column: "encrypted_birthday",
    });
  }
  if (input.notes !== undefined) {
    patch.encrypted_notes = await encryptOptional(input.notes, key, {
      table,
      recordId,
      column: "encrypted_notes",
    });
  }
  if (input.category_id !== undefined) {
    patch.category_id = input.category_id;
  }

  return patch;
}

export async function encryptNoteCreate(
  input: NoteInput,
  key: CryptoKey,
  clientRecordId?: string
): Promise<{
  id: string;
  encrypted_title: string;
  encrypted_description: string | null;
  category_id: string;
}> {
  const recordId = clientRecordId ?? crypto.randomUUID();
  const table = NOTES_TABLE;
  return {
    id: recordId,
    encrypted_title: await encryptRequired(input.title, key, {
      table,
      recordId,
      column: "encrypted_title",
    }),
    encrypted_description: await encryptOptional(input.description, key, {
      table,
      recordId,
      column: "encrypted_description",
    }),
    category_id: input.category_id ?? DEFAULT_NOTE_CATEGORY_ID,
  };
}

export async function encryptNoteUpdate(
  id: string,
  input: Partial<NoteInput>,
  key: CryptoKey
): Promise<{
  encrypted_title?: string;
  encrypted_description?: string | null;
  category_id?: string;
}> {
  const table = NOTES_TABLE;
  const recordId = id;
  const patch: {
    encrypted_title?: string;
    encrypted_description?: string | null;
    category_id?: string;
  } = {};

  if (input.title !== undefined) {
    patch.encrypted_title = await encryptRequired(input.title, key, {
      table,
      recordId,
      column: "encrypted_title",
    });
  }
  if (input.description !== undefined) {
    patch.encrypted_description = await encryptOptional(
      input.description,
      key,
      { table, recordId, column: "encrypted_description" }
    );
  }
  if (input.category_id !== undefined) {
    patch.category_id = input.category_id;
  }

  return patch;
}

export async function encryptTaskCreate(
  input: TaskInput,
  key: CryptoKey,
  clientRecordId?: string
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
  const recordId = clientRecordId ?? crypto.randomUUID();
  const table = ITEMS_TABLE;
  return {
    id: recordId,
    encrypted_title: await encryptRequired(input.title, key, {
      table,
      recordId,
      column: "encrypted_title",
    }),
    encrypted_description: await encryptOptional(input.description, key, {
      table,
      recordId,
      column: "encrypted_description",
    }),
    encrypted_start_date: await encryptOptional(input.start_date, key, {
      table,
      recordId,
      column: "encrypted_start_date",
    }),
    encrypted_end_date: await encryptOptional(input.end_date, key, {
      table,
      recordId,
      column: "encrypted_end_date",
    }),
    stage_id: input.stage_id ?? DEFAULT_TASK_STAGE_ID,
    label_id: input.label_id ?? DEFAULT_TASK_LABEL_ID,
    priority: input.priority ?? DEFAULT_TASK_PRIORITY,
  };
}

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
  const table = ITEMS_TABLE;
  const recordId = id;
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
    patch.encrypted_title = await encryptRequired(input.title, key, {
      table,
      recordId,
      column: "encrypted_title",
    });
  }
  if (input.description !== undefined) {
    patch.encrypted_description = await encryptOptional(
      input.description,
      key,
      { table, recordId, column: "encrypted_description" }
    );
  }
  if (input.start_date !== undefined) {
    patch.encrypted_start_date = await encryptOptional(input.start_date, key, {
      table,
      recordId,
      column: "encrypted_start_date",
    });
  }
  if (input.end_date !== undefined) {
    patch.encrypted_end_date = await encryptOptional(input.end_date, key, {
      table,
      recordId,
      column: "encrypted_end_date",
    });
  }
  if (input.stage_id !== undefined) {
    patch.stage_id = input.stage_id;
  }
  if (input.label_id !== undefined) {
    patch.label_id = input.label_id ?? DEFAULT_TASK_LABEL_ID;
  }
  if (input.priority !== undefined) {
    patch.priority = input.priority;
  }

  return patch;
}

export async function encryptLinkCreate(
  input: LinkInput,
  key: CryptoKey,
  clientRecordId?: string
): Promise<{
  id: string;
  encrypted_name: string;
  encrypted_url: string;
  folder_id: string | null;
}> {
  const recordId = clientRecordId ?? crypto.randomUUID();
  const table = LINKS_TABLE;
  const { name, url } = prepareLinkNameAndUrl(input.name, input.url);
  return {
    id: recordId,
    encrypted_name: await encryptRequired(name, key, {
      table,
      recordId,
      column: "encrypted_name",
    }),
    encrypted_url: await encryptRequired(url, key, {
      table,
      recordId,
      column: "encrypted_url",
    }),
    folder_id: input.folder_id ?? null,
  };
}

export async function encryptLinkUpdate(
  id: string,
  input: Partial<LinkInput>,
  key: CryptoKey
): Promise<{
  encrypted_name?: string;
  encrypted_url?: string;
  folder_id?: string | null;
}> {
  const table = LINKS_TABLE;
  const recordId = id;
  const patch: {
    encrypted_name?: string;
    encrypted_url?: string;
    folder_id?: string | null;
  } = {};

  if (input.url !== undefined) {
    const { name, url } = prepareLinkNameAndUrl(input.name ?? "", input.url);
    patch.encrypted_url = await encryptRequired(url, key, {
      table,
      recordId,
      column: "encrypted_url",
    });
    patch.encrypted_name = await encryptRequired(name, key, {
      table,
      recordId,
      column: "encrypted_name",
    });
  } else if (input.name !== undefined) {
    patch.encrypted_name = await encryptRequired(input.name, key, {
      table,
      recordId,
      column: "encrypted_name",
    });
  }
  if (input.folder_id !== undefined) {
    patch.folder_id = input.folder_id;
  }

  return patch;
}

export async function encryptLinkFolderCreate(
  input: LinkFolderInput,
  key: CryptoKey,
  clientRecordId?: string
): Promise<{
  id: string;
  encrypted_name: string;
  parent_folder_id: string | null;
}> {
  const recordId = clientRecordId ?? crypto.randomUUID();
  const table = LINK_FOLDERS_TABLE;
  return {
    id: recordId,
    encrypted_name: await encryptRequired(input.name, key, {
      table,
      recordId,
      column: "encrypted_name",
    }),
    parent_folder_id: input.parent_folder_id ?? null,
  };
}

export async function encryptLinkFolderUpdate(
  id: string,
  input: Partial<LinkFolderInput>,
  key: CryptoKey
): Promise<{
  encrypted_name?: string;
  parent_folder_id?: string | null;
}> {
  const table = LINK_FOLDERS_TABLE;
  const recordId = id;
  const patch: {
    encrypted_name?: string;
    parent_folder_id?: string | null;
  } = {};

  if (input.name !== undefined) {
    patch.encrypted_name = await encryptRequired(input.name, key, {
      table,
      recordId,
      column: "encrypted_name",
    });
  }
  if (input.parent_folder_id !== undefined) {
    patch.parent_folder_id = input.parent_folder_id;
  }

  return patch;
}
