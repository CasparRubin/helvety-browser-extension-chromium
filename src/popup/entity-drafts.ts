import {
  emptyContactInput,
  emptyLinkFolderInput,
  emptyLinkInput,
  emptyNoteInput,
  emptyTaskInput,
} from "@helvety/shared/e2ee-create-inputs";

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

export {
  emptyContactInput,
  emptyLinkFolderInput,
  emptyLinkInput,
  emptyNoteInput,
  emptyTaskInput,
};

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
export function linkFolderToInput(folder: LinkFolder): LinkFolderInput {
  return {
    name: folder.name,
    parent_folder_id: folder.parent_folder_id,
  };
}
