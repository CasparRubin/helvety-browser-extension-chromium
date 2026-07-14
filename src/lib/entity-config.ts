/**
 * Entity delete messaging for the Chromium extension.
 * Mirrors per-zone `entity-config.ts` registries in the monorepo E2EE apps.
 */

import { defineEntityDeleteRegistry } from "@helvety/shared/entity-delete-message";

/** Entity kinds used in extension CRUD and delete flows. */
type EntityTypeId = "tasks" | "notes" | "contacts" | "links" | "link_folder";

const { buildDeleteMessage } = defineEntityDeleteRegistry<EntityTypeId>({
  tasks: {
    name: "task",
    plural: "tasks",
    hasChildren: false,
  },
  notes: {
    name: "note",
    plural: "notes",
    hasChildren: false,
  },
  contacts: {
    name: "contact",
    plural: "contacts",
    hasChildren: false,
  },
  links: {
    name: "link",
    plural: "links",
    hasChildren: false,
  },
  link_folder: {
    name: "folder",
    plural: "folders",
    hasChildren: true,
    childExamples: ["links", "subfolders"],
  },
});

export { buildDeleteMessage };
