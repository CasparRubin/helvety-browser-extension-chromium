/**
 * E2EE-oriented Supabase `.select(...)` projections.
 *
 * Entity content is only ever read from `encrypted_*` columns. Structural
 * metadata (category, stage, folder, priority) is plaintext by design — see
 * `e2ee-privacy.ts` and `docs/SECURITY-E2EE.md`.
 * Avoid `*` on entity tables.
 */

export const TASK_LIST_SELECT =
  "id, encrypted_title, stage_id, sort_order, created_at" as const;

export const NOTE_LIST_SELECT =
  "id, encrypted_title, category_id, sort_order, created_at" as const;

export const CONTACT_LIST_SELECT =
  "id, encrypted_first_name, encrypted_last_name, category_id, sort_order, created_at" as const;

export const LINK_LIST_SELECT =
  "id, encrypted_name, encrypted_url, folder_id, sort_order, created_at" as const;

export const LINK_FOLDER_LIST_SELECT =
  "id, encrypted_name, parent_folder_id, sort_order, created_at" as const;

/** Full-record selects for the edit form (not a separate read-only detail screen). */
export const TASK_DETAIL_SELECT =
  "id, user_id, encrypted_title, encrypted_description, encrypted_start_date, encrypted_end_date, stage_id, label_id, priority, sort_order, created_at, updated_at" as const;

export const NOTE_DETAIL_SELECT =
  "id, user_id, encrypted_title, encrypted_description, category_id, sort_order, created_at, updated_at" as const;

export const CONTACT_DETAIL_SELECT =
  "id, user_id, encrypted_first_name, encrypted_last_name, encrypted_description, encrypted_email, encrypted_phone, encrypted_birthday, encrypted_notes, category_id, sort_order, created_at, updated_at" as const;

export const LINK_DETAIL_SELECT =
  "id, user_id, encrypted_name, encrypted_url, folder_id, sort_order, created_at, updated_at" as const;

export const LINK_FOLDER_DETAIL_SELECT =
  "id, user_id, encrypted_name, parent_folder_id, sort_order, created_at, updated_at" as const;
