import {
  buildAAD,
  decrypt,
  parseEncryptedData,
} from "@helvety/shared/crypto/encryption";

/**
 * Decryption for list previews in the extension (Web Crypto via @helvety/shared).
 *
 * Callers should pass ciphertext-shaped rows from Supabase. Plaintext exists in
 * extension memory while unlocked; do not send it to Helvety app APIs or
 * PostgREST as plaintext — future writes should use ciphertext (or a reviewed API).
 */

/** Minimal encrypted row shapes for list rendering (matches Helvety DB). */
export interface TaskEncryptedRow {
  id: string;
  encrypted_title: string;
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
export interface ContactEncryptedRow {
  id: string;
  encrypted_first_name: string;
  encrypted_last_name: string;
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
export async function decryptLinkName(
  row: LinkEncryptedRow,
  key: CryptoKey
): Promise<string> {
  const aad = buildAAD("links", row.id);
  return decrypt(parseEncryptedData(row.encrypted_name), key, aad);
}
