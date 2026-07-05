import {
  encryptEntityField,
  serializeEncryptedData,
} from "@helvety/shared/crypto/encryption";
import { describe, expect, it } from "vitest";

import {
  decryptContactLabel,
  decryptContactRow,
  decryptLinkFolderRow,
  decryptLinkName,
  decryptNoteRow,
  decryptNoteTitle,
  decryptTaskRow,
  decryptTaskTitle,
  toLinkFolderListItem,
} from "./decrypt-entities";

const TASK_ID = "11111111-1111-4111-8111-111111111111";
const NOTE_ID = "22222222-2222-4222-8222-222222222222";
const CONTACT_ID = "33333333-3333-4333-8333-333333333333";
const LINK_ID = "44444444-4444-4444-8444-444444444444";
const FOLDER_ID = "55555555-5555-4555-8555-555555555555";

/** AES-256-GCM test key for encrypt/decrypt roundtrips. */
async function aes256GcmKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

const LIST_META = {
  stage_id: "default-item-backlog",
  category_id: "personal",
  sort_order: 0,
  created_at: "2020-01-01T00:00:00.000Z",
  folder_id: null as string | null,
  encrypted_url: "",
};

describe("decrypt-entities (client-side roundtrip)", () => {
  it("decryptTaskTitle reverses field-bound encrypt", async () => {
    const key = await aes256GcmKey();
    const plaintext = "Buy oat milk";
    const enc = await encryptEntityField(plaintext, key, {
      table: "items",
      recordId: TASK_ID,
      column: "encrypted_title",
    });
    const row = {
      id: TASK_ID,
      encrypted_title: serializeEncryptedData(enc),
      stage_id: LIST_META.stage_id,
      sort_order: LIST_META.sort_order,
      created_at: LIST_META.created_at,
    };
    await expect(decryptTaskTitle(row, key)).resolves.toBe(plaintext);
  });

  it("decryptNoteTitle uses notes table field context", async () => {
    const key = await aes256GcmKey();
    const plaintext = "Meeting notes";
    const enc = await encryptEntityField(plaintext, key, {
      table: "notes",
      recordId: NOTE_ID,
      column: "encrypted_title",
    });
    const row = {
      id: NOTE_ID,
      encrypted_title: serializeEncryptedData(enc),
      category_id: LIST_META.category_id,
      sort_order: LIST_META.sort_order,
      created_at: LIST_META.created_at,
    };
    await expect(decryptNoteTitle(row, key)).resolves.toBe(plaintext);
  });

  it("decryptContactLabel decrypts first and last", async () => {
    const key = await aes256GcmKey();
    const ctx = { table: "contacts", recordId: CONTACT_ID };
    const encFirst = await encryptEntityField("Ada", key, {
      ...ctx,
      column: "encrypted_first_name",
    });
    const encLast = await encryptEntityField("Lovelace", key, {
      ...ctx,
      column: "encrypted_last_name",
    });
    const row = {
      id: CONTACT_ID,
      encrypted_first_name: serializeEncryptedData(encFirst),
      encrypted_last_name: serializeEncryptedData(encLast),
      category_id: LIST_META.category_id,
      sort_order: LIST_META.sort_order,
      created_at: LIST_META.created_at,
    };
    await expect(decryptContactLabel(row, key)).resolves.toBe("Ada Lovelace");
  });

  it("decryptContactLabel trims when last name decrypts empty", async () => {
    const key = await aes256GcmKey();
    const ctx = { table: "contacts", recordId: CONTACT_ID };
    const encFirst = await encryptEntityField("Madonna", key, {
      ...ctx,
      column: "encrypted_first_name",
    });
    const encLast = await encryptEntityField("", key, {
      ...ctx,
      column: "encrypted_last_name",
    });
    const row = {
      id: CONTACT_ID,
      encrypted_first_name: serializeEncryptedData(encFirst),
      encrypted_last_name: serializeEncryptedData(encLast),
      category_id: LIST_META.category_id,
      sort_order: LIST_META.sort_order,
      created_at: LIST_META.created_at,
    };
    await expect(decryptContactLabel(row, key)).resolves.toBe("Madonna");
  });

  it("decryptLinkName decrypts bookmark title", async () => {
    const key = await aes256GcmKey();
    const plaintext = "Helvety home page";
    const ctx = { table: "links", recordId: LINK_ID };
    const enc = await encryptEntityField(plaintext, key, {
      ...ctx,
      column: "encrypted_name",
    });
    const row = {
      id: LINK_ID,
      encrypted_name: serializeEncryptedData(enc),
      encrypted_url: serializeEncryptedData(
        await encryptEntityField("https://helvety.com", key, {
          ...ctx,
          column: "encrypted_url",
        })
      ),
      folder_id: LIST_META.folder_id,
      sort_order: LIST_META.sort_order,
      created_at: LIST_META.created_at,
    };
    await expect(decryptLinkName(row, key)).resolves.toBe(plaintext);
  });

  it("fails when ciphertext is decrypted with the wrong column context", async () => {
    const key = await aes256GcmKey();
    const enc = await encryptEntityField("555-0100", key, {
      table: "contacts",
      recordId: CONTACT_ID,
      column: "encrypted_phone",
    });
    const row = {
      id: CONTACT_ID,
      encrypted_first_name: serializeEncryptedData(enc),
      encrypted_last_name: serializeEncryptedData(
        await encryptEntityField("", key, {
          table: "contacts",
          recordId: CONTACT_ID,
          column: "encrypted_last_name",
        })
      ),
      category_id: LIST_META.category_id,
      sort_order: LIST_META.sort_order,
      created_at: LIST_META.created_at,
    };
    await expect(decryptContactLabel(row, key)).rejects.toThrow();
  });

  it("fails when ciphertext was sealed with a different field AAD", async () => {
    const key = await aes256GcmKey();
    const enc = await encryptEntityField("secret", key, {
      table: "notes",
      recordId: NOTE_ID,
      column: "encrypted_title",
    });
    const row = {
      id: NOTE_ID,
      encrypted_title: serializeEncryptedData(enc),
      stage_id: LIST_META.stage_id,
      sort_order: LIST_META.sort_order,
      created_at: LIST_META.created_at,
    };
    await expect(decryptTaskTitle(row, key)).rejects.toThrow();
  });

  it("fails when decrypting with the wrong key", async () => {
    const keyA = await aes256GcmKey();
    const keyB = await aes256GcmKey();
    const enc = await encryptEntityField("x", keyA, {
      table: "items",
      recordId: TASK_ID,
      column: "encrypted_title",
    });
    const row = {
      id: TASK_ID,
      encrypted_title: serializeEncryptedData(enc),
      stage_id: LIST_META.stage_id,
      sort_order: LIST_META.sort_order,
      created_at: LIST_META.created_at,
    };
    await expect(decryptTaskTitle(row, keyB)).rejects.toThrow();
  });
});

describe("decrypt-entities (detail rows)", () => {
  it("decryptTaskRow decrypts description and date fields", async () => {
    const key = await aes256GcmKey();
    const ctx = { table: "items", recordId: TASK_ID };
    const encTitle = await encryptEntityField("Ship release", key, {
      ...ctx,
      column: "encrypted_title",
    });
    const encDescription = await encryptEntityField("Final QA pass", key, {
      ...ctx,
      column: "encrypted_description",
    });
    const row = {
      id: TASK_ID,
      user_id: "user-1",
      encrypted_title: serializeEncryptedData(encTitle),
      encrypted_description: serializeEncryptedData(encDescription),
      encrypted_start_date: null,
      encrypted_end_date: null,
      stage_id: LIST_META.stage_id,
      label_id: "default-item-label",
      priority: 0,
      sort_order: LIST_META.sort_order,
      created_at: LIST_META.created_at,
      updated_at: LIST_META.created_at,
    };
    const task = await decryptTaskRow(row, key);
    expect(task.title).toBe("Ship release");
    expect(task.description).toBe("Final QA pass");
  });

  it("decryptContactRow decrypts email and phone detail fields", async () => {
    const key = await aes256GcmKey();
    const ctx = { table: "contacts", recordId: CONTACT_ID };
    const encFirst = await encryptEntityField("Grace", key, {
      ...ctx,
      column: "encrypted_first_name",
    });
    const encLast = await encryptEntityField("Hopper", key, {
      ...ctx,
      column: "encrypted_last_name",
    });
    const encEmail = await encryptEntityField("grace@example.com", key, {
      ...ctx,
      column: "encrypted_email",
    });
    const encPhone = await encryptEntityField("555-0100", key, {
      ...ctx,
      column: "encrypted_phone",
    });
    const row = {
      id: CONTACT_ID,
      user_id: "user-1",
      encrypted_first_name: serializeEncryptedData(encFirst),
      encrypted_last_name: serializeEncryptedData(encLast),
      encrypted_description: null,
      encrypted_email: serializeEncryptedData(encEmail),
      encrypted_phone: serializeEncryptedData(encPhone),
      encrypted_birthday: null,
      encrypted_notes: null,
      category_id: LIST_META.category_id,
      sort_order: LIST_META.sort_order,
      created_at: LIST_META.created_at,
      updated_at: LIST_META.created_at,
    };
    const contact = await decryptContactRow(row, key);
    expect(contact.first_name).toBe("Grace");
    expect(contact.email).toBe("grace@example.com");
    expect(contact.phone).toBe("555-0100");
  });

  it("decryptNoteRow decrypts description", async () => {
    const key = await aes256GcmKey();
    const ctx = { table: "notes", recordId: NOTE_ID };
    const encTitle = await encryptEntityField("Ideas", key, {
      ...ctx,
      column: "encrypted_title",
    });
    const encDescription = await encryptEntityField("Buy milk", key, {
      ...ctx,
      column: "encrypted_description",
    });
    const row = {
      id: NOTE_ID,
      user_id: "user-1",
      encrypted_title: serializeEncryptedData(encTitle),
      encrypted_description: serializeEncryptedData(encDescription),
      category_id: LIST_META.category_id,
      sort_order: LIST_META.sort_order,
      created_at: LIST_META.created_at,
      updated_at: LIST_META.created_at,
    };
    const note = await decryptNoteRow(row, key);
    expect(note.title).toBe("Ideas");
    expect(note.description).toBe("Buy milk");
  });

  it("decryptLinkFolderRow decrypts folder name with link_folders AAD", async () => {
    const key = await aes256GcmKey();
    const enc = await encryptEntityField("Reading list", key, {
      table: "link_folders",
      recordId: FOLDER_ID,
      column: "encrypted_name",
    });
    const row = {
      id: FOLDER_ID,
      user_id: "user-1",
      encrypted_name: serializeEncryptedData(enc),
      parent_folder_id: null,
      sort_order: 0,
      created_at: LIST_META.created_at,
      updated_at: LIST_META.created_at,
    };
    const folder = await decryptLinkFolderRow(row, key);
    expect(folder.name).toBe("Reading list");
  });

  it("toLinkFolderListItem maps decrypted folder name for list rows", async () => {
    const key = await aes256GcmKey();
    const enc = await encryptEntityField("Archive", key, {
      table: "link_folders",
      recordId: FOLDER_ID,
      column: "encrypted_name",
    });
    const row = {
      id: FOLDER_ID,
      encrypted_name: serializeEncryptedData(enc),
      parent_folder_id: null,
      sort_order: 1,
      created_at: LIST_META.created_at,
    };
    const item = await toLinkFolderListItem(row, key);
    expect(item.name).toBe("Archive");
    expect(item.sort_order).toBe(1);
  });
});
