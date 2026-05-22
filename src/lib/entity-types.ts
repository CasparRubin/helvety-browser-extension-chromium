/** Decrypted summary row for list UI (title/name only; full fields on detail). */
export interface EntityListItem {
  id: string;
  title: string;
}

/**
 *
 */
export interface Contact {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  description: string | null;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  notes: string | null;
  category_id: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 *
 */
export interface ContactInput {
  first_name: string;
  last_name: string;
  description?: string | null;
  email?: string | null;
  phone?: string | null;
  birthday?: string | null;
  notes?: string | null;
  category_id?: string;
}

/**
 *
 */
export interface Note {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category_id: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 *
 */
export interface NoteInput {
  title: string;
  description?: string | null;
  category_id?: string;
}

/**
 *
 */
export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
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
export interface TaskInput {
  title: string;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  stage_id?: string;
  label_id?: string;
  priority?: number;
}

/**
 *
 */
export interface Link {
  id: string;
  user_id: string;
  name: string;
  url: string;
  folder_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 *
 */
export interface LinkInput {
  name: string;
  url: string;
  folder_id?: string | null;
}

/**
 *
 */
export interface LinkFolder {
  id: string;
  user_id: string;
  name: string;
  parent_folder_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 *
 */
export interface LinkFolderInput {
  name: string;
  parent_folder_id?: string | null;
}

/**
 *
 */
export type EntityKind =
  | "tasks"
  | "notes"
  | "contacts"
  | "links"
  | "link_folder";

/**
 *
 */
export type EntityRecord = Contact | Note | Task | Link | LinkFolder;
