/**
 * Privacy invariants for Helvety extension E2EE.
 *
 * Entity *content* (titles, bodies, names, contact fields, URLs) is encrypted
 * client-side before any Supabase write and decrypted only after passkey unlock.
 * These column names must never appear in PostgREST `.select()` or mutation payloads.
 */
export const PLAINTEXT_CONTENT_FIELD_NAMES = [
  "title",
  "description",
  "first_name",
  "last_name",
  "name",
  "url",
  "email",
  "phone",
  "birthday",
  "notes",
] as const;

/**
 * Structural fields stored in plaintext on Supabase (same as helvety.com web apps).
 * They describe organization, not human-readable record content.
 */
export const PLAINTEXT_STRUCTURAL_FIELD_NAMES = [
  "category_id",
  "stage_id",
  "label_id",
  "priority",
  "folder_id",
  "parent_folder_id",
  "sort_order",
] as const;
