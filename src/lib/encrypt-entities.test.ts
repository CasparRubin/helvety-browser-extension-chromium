import {
  buildAAD,
  decrypt,
  parseEncryptedData,
} from "@helvety/shared/crypto/encryption";
import { describe, expect, it } from "vitest";

import { decryptContactRow, decryptNoteRow } from "./decrypt-entities";
import {
  encryptContactCreate,
  encryptLinkCreate,
  encryptNoteCreate,
  encryptTaskCreate,
} from "./encrypt-entities";
import { normalizeBookmarkUrl } from "./link-url-normalize";

/**
 *
 */
async function aes256GcmKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

describe("encrypt-entities roundtrip", () => {
  it("contact create encrypts only ciphertext columns", async () => {
    const key = await aes256GcmKey();
    const payload = await encryptContactCreate(
      {
        first_name: "Ada",
        last_name: "Lovelace",
        email: "ada@example.com",
      },
      key
    );
    expect(payload.encrypted_first_name).toMatch(/^\{/);
    expect(payload.encrypted_last_name).toMatch(/^\{/);
    expect(payload.encrypted_email).toMatch(/^\{/);
    expect(payload).not.toHaveProperty("first_name");
    expect(payload).not.toHaveProperty("last_name");
  });

  it("contact create decrypts to same plaintext", async () => {
    const key = await aes256GcmKey();
    const payload = await encryptContactCreate(
      { first_name: "Grace", last_name: "Hopper", description: "Admiral" },
      key
    );
    const row = {
      id: payload.id,
      user_id: "user-1",
      encrypted_first_name: payload.encrypted_first_name,
      encrypted_last_name: payload.encrypted_last_name,
      encrypted_description: payload.encrypted_description,
      encrypted_email: null,
      encrypted_phone: null,
      encrypted_birthday: null,
      encrypted_notes: null,
      category_id: payload.category_id,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const contact = await decryptContactRow(row, key);
    expect(contact.first_name).toBe("Grace");
    expect(contact.last_name).toBe("Hopper");
    expect(contact.description).toBe("Admiral");
  });

  it("task create uses items AAD", async () => {
    const key = await aes256GcmKey();
    const payload = await encryptTaskCreate({ title: "Ship feature" }, key);
    const aad = buildAAD("items", payload.id);
    const title = await decrypt(
      parseEncryptedData(payload.encrypted_title),
      key,
      aad
    );
    expect(title).toBe("Ship feature");
  });

  it("note create roundtrips through decryptNoteRow", async () => {
    const key = await aes256GcmKey();
    const payload = await encryptNoteCreate(
      { title: "Ideas", description: "E2EE extension" },
      key
    );
    const note = await decryptNoteRow(
      {
        id: payload.id,
        user_id: "u",
        encrypted_title: payload.encrypted_title,
        encrypted_description: payload.encrypted_description,
        category_id: payload.category_id,
        sort_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      key
    );
    expect(note.title).toBe("Ideas");
    expect(note.description).toBe("E2EE extension");
  });

  it("link create normalizes URL before encrypt", async () => {
    const key = await aes256GcmKey();
    const payload = await encryptLinkCreate(
      { name: "", url: "helvety.com/docs" },
      key
    );
    const normalized = normalizeBookmarkUrl("helvety.com/docs");
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }
    const aad = buildAAD("links", payload.id);
    const url = await decrypt(
      parseEncryptedData(payload.encrypted_url),
      key,
      aad
    );
    expect(url).toBe(normalized.url);
  });
});
