import {
  DEFAULT_CONTACT_CATEGORY_ID,
  DEFAULT_NOTE_CATEGORY_ID,
  DEFAULT_TASK_LABEL_ID,
  DEFAULT_TASK_PRIORITY,
  DEFAULT_TASK_STAGE_ID,
} from "../lib/entity-defaults";

import type {
  Contact,
  ContactInput,
  Link,
  LinkFolder,
  LinkFolderInput,
  LinkInput,
  Note,
  NoteInput,
  Task,
  TaskInput,
} from "../lib/entity-types";

/**
 *
 */
export function emptyContactInput(): ContactInput {
  return {
    first_name: "",
    last_name: "",
    description: null,
    email: null,
    phone: null,
    birthday: null,
    notes: null,
    category_id: DEFAULT_CONTACT_CATEGORY_ID,
  };
}

/**
 *
 */
export function contactToInput(contact: Contact): ContactInput {
  return {
    first_name: contact.first_name,
    last_name: contact.last_name,
    description: contact.description,
    email: contact.email,
    phone: contact.phone,
    birthday: contact.birthday,
    notes: contact.notes,
    category_id: contact.category_id,
  };
}

/**
 *
 */
export function emptyNoteInput(): NoteInput {
  return {
    title: "",
    description: null,
    category_id: DEFAULT_NOTE_CATEGORY_ID,
  };
}

/**
 *
 */
export function noteToInput(note: Note): NoteInput {
  return {
    title: note.title,
    description: note.description,
    category_id: note.category_id,
  };
}

/**
 *
 */
export function emptyTaskInput(): TaskInput {
  return {
    title: "",
    description: null,
    start_date: null,
    end_date: null,
    stage_id: DEFAULT_TASK_STAGE_ID,
    label_id: DEFAULT_TASK_LABEL_ID,
    priority: DEFAULT_TASK_PRIORITY,
  };
}

/**
 *
 */
export function taskToInput(task: Task): TaskInput {
  return {
    title: task.title,
    description: task.description,
    start_date: task.start_date,
    end_date: task.end_date,
    stage_id: task.stage_id,
    label_id: task.label_id,
    priority: task.priority,
  };
}

/**
 *
 */
export function emptyLinkInput(): LinkInput {
  return { name: "", url: "", folder_id: null };
}

/**
 *
 */
export function linkToInput(link: Link): LinkInput {
  return {
    name: link.name,
    url: link.url,
    folder_id: link.folder_id,
  };
}

/**
 *
 */
export function emptyLinkFolderInput(): LinkFolderInput {
  return { name: "", parent_folder_id: null };
}

/**
 *
 */
export function linkFolderToInput(folder: LinkFolder): LinkFolderInput {
  return {
    name: folder.name,
    parent_folder_id: folder.parent_folder_id,
  };
}
