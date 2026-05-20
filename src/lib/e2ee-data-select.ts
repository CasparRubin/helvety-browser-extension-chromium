/**
 * E2EE-oriented list reads
 *
 * Keep Supabase `.select(...)` limited to ciphertext fields needed for the UI plus
 * stable row ids. Avoid widening to `*` — schema changes could add non-E2EE columns.
 *
 * List decryption runs in the extension (`decrypt-entities.ts`) after unlock.
 */
export const TASK_LIST_SELECT = "id, encrypted_title" as const;
export const NOTE_LIST_SELECT = "id, encrypted_title" as const;
export const CONTACT_LIST_SELECT =
  "id, encrypted_first_name, encrypted_last_name" as const;
export const LINK_LIST_SELECT = "id, encrypted_name" as const;
