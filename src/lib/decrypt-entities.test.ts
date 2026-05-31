import {
  buildAAD,
  encrypt,
  serializeEncryptedData,
} from "@helvety/shared/crypto/encryption";
import { describe, expect, it } from "vitest";

import {
  decryptContactLabel,
  decryptLinkName,
  decryptNoteTitle,
  decryptTaskTitle,
} from "./decrypt-entities";

const TASK_ID = "11111111-1111-4111-8111-111111111111";
const NOTE_ID = "22222222-2222-4222-8222-222222222222";
const CONTACT_ID = "33333333-3333-4333-8333-333333333333";
const LINK_ID = "44444444-4444-4444-8444-444444444444";

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
  it("decryptTaskTitle reverses encrypt with items AAD", async () => {
    const key = await aes256GcmKey();
    const plaintext = "Buy oat milk";
    const enc = await encrypt(plaintext, key, buildAAD("items", TASK_ID));
    const row = {
      id: TASK_ID,
      encrypted_title: serializeEncryptedData(enc),
      stage_id: LIST_META.stage_id,
      sort_order: LIST_META.sort_order,
      created_at: LIST_META.created_at,
    };
    await expect(decryptTaskTitle(row, key)).resolves.toBe(plaintext);
  });

  it("decryptNoteTitle uses notes table AAD", async () => {
    const key = await aes256GcmKey();
    const plaintext = "Meeting notes";
    const enc = await encrypt(plaintext, key, buildAAD("notes", NOTE_ID));
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
    const aad = buildAAD("contacts", CONTACT_ID);
    const encFirst = await encrypt("Ada", key, aad);
    const encLast = await encrypt("Lovelace", key, aad);
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
    const aad = buildAAD("contacts", CONTACT_ID);
    const encFirst = await encrypt("Madonna", key, aad);
    const encLast = await encrypt("", key, aad);
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
    const plaintext = "Helvety docs";
    const enc = await encrypt(plaintext, key, buildAAD("links", LINK_ID));
    const row = {
      id: LINK_ID,
      encrypted_name: serializeEncryptedData(enc),
      encrypted_url: serializeEncryptedData(
        await encrypt("https://helvety.com", key, buildAAD("links", LINK_ID))
      ),
      folder_id: LIST_META.folder_id,
      sort_order: LIST_META.sort_order,
      created_at: LIST_META.created_at,
    };
    await expect(decryptLinkName(row, key)).resolves.toBe(plaintext);
  });

  it("fails when ciphertext was sealed with a different AAD (wrong table)", async () => {
    const key = await aes256GcmKey();
    const enc = await encrypt("secret", key, buildAAD("notes", NOTE_ID));
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
    const enc = await encrypt("x", keyA, buildAAD("items", TASK_ID));
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
