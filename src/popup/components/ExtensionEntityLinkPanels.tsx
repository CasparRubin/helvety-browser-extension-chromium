import { buildE2eeDeepLink } from "@helvety/shared/e2ee-deep-link";
import { E2EE_APP_LINK_UI } from "@helvety/ui/e2ee-app-link-ui";
import {
  EntityLinksPanel,
  type EntityLinkRow,
  type EntityLinksHookResult,
} from "@helvety/ui/entity-links-panel";
import { useCallback } from "react";

import {
  createExtensionEntityLinksHook,
  useExtensionLinksRepo,
} from "../../lib/extension-entity-links-hooks";

import type {
  LinkedContact,
  LinkedLink,
  LinkedNote,
  LinkedTask,
} from "../../lib/entity-link-repository";
import type {
  ContactListRow,
  LinkListRow,
  NoteListRow,
  TaskListRow,
} from "../../lib/entity-types";

/** Linked row shape used by entity link panel hooks. */
type LinkedCatalogRow = { id: string; link_id: string; linked_at: string };

/** Binds repository loaders to `EntityLinksPanel` hook signatures. */
function bindEntityLinksHook<
  TCatalog extends { id: string },
  TLinked extends LinkedCatalogRow,
>(
  loadLinks: Parameters<typeof createExtensionEntityLinksHook>[0],
  sourceType: "items" | "notes" | "contacts" | "links",
  targetType: "items" | "notes" | "contacts" | "links"
) {
  const useBase = createExtensionEntityLinksHook(loadLinks);
  return function useBoundEntityLinks(
    entityId: string,
    options?: { enabled?: boolean }
  ) {
    const base = useBase(entityId, options);
    const link = useCallback(
      async (targetId: string) => base.link(targetId, sourceType, targetType),
      [base]
    );
    return {
      allItems: base.allItems as TCatalog[],
      linkedItems: base.linkedItems as TLinked[],
      isLoading: base.isLoading,
      link,
      unlink: base.unlink,
    };
  };
}

const useTaskContactLinks = bindEntityLinksHook<ContactListRow, LinkedContact>(
  (repo, id) => repo.loadTaskContactLinks(id),
  "items",
  "contacts"
);
const useTaskNoteLinks = bindEntityLinksHook<NoteListRow, LinkedNote>(
  (repo, id) => repo.loadTaskNoteLinks(id),
  "items",
  "notes"
);
const useTaskLinkEntityLinks = bindEntityLinksHook<LinkListRow, LinkedLink>(
  (repo, id) => repo.loadTaskLinkLinks(id),
  "items",
  "links"
);

const useNoteTaskLinks = bindEntityLinksHook<TaskListRow, LinkedTask>(
  (repo, id) => repo.loadNoteTaskLinks(id),
  "notes",
  "items"
);
const useNoteContactLinks = bindEntityLinksHook<ContactListRow, LinkedContact>(
  (repo, id) => repo.loadNoteContactLinks(id),
  "notes",
  "contacts"
);
const useNoteLinkEntityLinks = bindEntityLinksHook<LinkListRow, LinkedLink>(
  (repo, id) => repo.loadNoteLinkLinks(id),
  "notes",
  "links"
);

const useContactTaskLinks = bindEntityLinksHook<TaskListRow, LinkedTask>(
  (repo, id) => repo.loadContactTaskLinks(id),
  "contacts",
  "items"
);
const useContactNoteLinks = bindEntityLinksHook<NoteListRow, LinkedNote>(
  (repo, id) => repo.loadContactNoteLinks(id),
  "contacts",
  "notes"
);
const useContactLinkEntityLinks = bindEntityLinksHook<LinkListRow, LinkedLink>(
  (repo, id) => repo.loadContactLinkLinks(id),
  "contacts",
  "links"
);

const useLinkTaskLinks = bindEntityLinksHook<TaskListRow, LinkedTask>(
  (repo, id) => repo.loadLinkTaskLinks(id),
  "links",
  "items"
);
const useLinkNoteLinks = bindEntityLinksHook<NoteListRow, LinkedNote>(
  (repo, id) => repo.loadLinkNoteLinks(id),
  "links",
  "notes"
);
const useLinkContactLinks = bindEntityLinksHook<ContactListRow, LinkedContact>(
  (repo, id) => repo.loadLinkContactLinks(id),
  "links",
  "contacts"
);

/** Formats a task title for link panels. */
function formatTaskName(item: TaskListRow | LinkedTask): string {
  return item.title;
}

/** Formats a note title for link panels. */
function formatNoteName(item: NoteListRow | LinkedNote): string {
  return item.title;
}

/** Formats a contact name for link panels. */
function formatContactName(item: ContactListRow | LinkedContact): string {
  return `${item.first_name} ${item.last_name}`.trim();
}

/** Formats a link name for link panels. */
function formatLinkName(item: LinkListRow | LinkedLink): string {
  return item.name;
}

/** One static `EntityLinksPanel` section for a target app. */
function ExtensionEntityLinksSection<
  TCatalog extends { id: string },
  TLinked extends EntityLinkRow,
>({
  entityId,
  targetApp,
  useLinks,
  formatName,
  labels,
}: {
  entityId: string;
  targetApp: keyof typeof E2EE_APP_LINK_UI;
  useLinks: (
    entityId: string,
    options: { enabled: boolean }
  ) => EntityLinksHookResult<TCatalog, TLinked>;
  formatName: (item: TCatalog | TLinked) => string;
  labels: {
    searchPlaceholder: string;
    emptyCatalog: string;
    emptySearch: string;
    allLinked: string;
    noLinkedYet: string;
    unlinkTitle: string;
    unlinkDescription: (name: string) => string;
  };
}): React.JSX.Element | null {
  const repo = useExtensionLinksRepo();
  if (!repo) {
    return null;
  }

  const ui = E2EE_APP_LINK_UI[targetApp];
  const zone =
    targetApp === "tasks"
      ? "tasks"
      : targetApp === "notes"
        ? "notes"
        : targetApp === "contacts"
          ? "contacts"
          : "links";

  return (
    <EntityLinksPanel
      entityId={entityId}
      variant="static"
      labels={{
        sectionTitle: ui.sectionTitle,
        ...labels,
      }}
      sectionIcon={ui.sectionIcon}
      pickerItemIcon={ui.pickerItemIcon}
      getDeepLink={(targetId) => buildE2eeDeepLink(zone, targetId)}
      formatName={formatName}
      useLinks={useLinks}
    />
  );
}

/** Link panels shown when editing a task. */
const PANEL_CONFIG_BY_SOURCE = {
  tasks: [
    {
      key: "contacts",
      targetApp: "contacts",
      useLinks: useTaskContactLinks,
      formatName: formatContactName,
      labels: {
        searchPlaceholder: "Search contacts…",
        emptyCatalog: "No contacts found",
        emptySearch: "No matching contacts",
        allLinked: "All contacts are already linked",
        noLinkedYet: "No contacts linked yet",
        unlinkTitle: "Unlink contact",
        unlinkDescription: (name: string) =>
          `Unlink "${name}" from this task? The contact will not be deleted.`,
      },
    },
    {
      key: "notes",
      targetApp: "notes",
      useLinks: useTaskNoteLinks,
      formatName: formatNoteName,
      labels: {
        searchPlaceholder: "Search notes…",
        emptyCatalog: "No notes found",
        emptySearch: "No matching notes",
        allLinked: "All notes are already linked",
        noLinkedYet: "No notes linked yet",
        unlinkTitle: "Unlink note",
        unlinkDescription: (name: string) =>
          `Unlink "${name}" from this task? The note will not be deleted.`,
      },
    },
    {
      key: "links",
      targetApp: "links",
      useLinks: useTaskLinkEntityLinks,
      formatName: formatLinkName,
      labels: {
        searchPlaceholder: "Search links…",
        emptyCatalog: "No links found",
        emptySearch: "No matching links",
        allLinked: "All links are already linked",
        noLinkedYet: "No links linked yet",
        unlinkTitle: "Unlink link",
        unlinkDescription: (name: string) =>
          `Unlink "${name}" from this task? The link will not be deleted.`,
      },
    },
  ],
  notes: [
    {
      key: "tasks",
      targetApp: "tasks",
      useLinks: useNoteTaskLinks,
      formatName: formatTaskName,
      labels: {
        searchPlaceholder: "Search tasks…",
        emptyCatalog: "No tasks found",
        emptySearch: "No matching tasks",
        allLinked: "All tasks are already linked",
        noLinkedYet: "No tasks linked yet",
        unlinkTitle: "Unlink task",
        unlinkDescription: (name: string) =>
          `Unlink "${name}" from this note? The task will not be deleted.`,
      },
    },
    {
      key: "contacts",
      targetApp: "contacts",
      useLinks: useNoteContactLinks,
      formatName: formatContactName,
      labels: {
        searchPlaceholder: "Search contacts…",
        emptyCatalog: "No contacts found",
        emptySearch: "No matching contacts",
        allLinked: "All contacts are already linked",
        noLinkedYet: "No contacts linked yet",
        unlinkTitle: "Unlink contact",
        unlinkDescription: (name: string) =>
          `Unlink "${name}" from this note? The contact will not be deleted.`,
      },
    },
    {
      key: "links",
      targetApp: "links",
      useLinks: useNoteLinkEntityLinks,
      formatName: formatLinkName,
      labels: {
        searchPlaceholder: "Search links…",
        emptyCatalog: "No links found",
        emptySearch: "No matching links",
        allLinked: "All links are already linked",
        noLinkedYet: "No links linked yet",
        unlinkTitle: "Unlink link",
        unlinkDescription: (name: string) =>
          `Unlink "${name}" from this note? The link will not be deleted.`,
      },
    },
  ],
  contacts: [
    {
      key: "tasks",
      targetApp: "tasks",
      useLinks: useContactTaskLinks,
      formatName: formatTaskName,
      labels: {
        searchPlaceholder: "Search tasks…",
        emptyCatalog: "No tasks found",
        emptySearch: "No matching tasks",
        allLinked: "All tasks are already linked",
        noLinkedYet: "No tasks linked yet",
        unlinkTitle: "Unlink task",
        unlinkDescription: (name: string) =>
          `Unlink "${name}" from this contact? The task will not be deleted.`,
      },
    },
    {
      key: "notes",
      targetApp: "notes",
      useLinks: useContactNoteLinks,
      formatName: formatNoteName,
      labels: {
        searchPlaceholder: "Search notes…",
        emptyCatalog: "No notes found",
        emptySearch: "No matching notes",
        allLinked: "All notes are already linked",
        noLinkedYet: "No notes linked yet",
        unlinkTitle: "Unlink note",
        unlinkDescription: (name: string) =>
          `Unlink "${name}" from this contact? The note will not be deleted.`,
      },
    },
    {
      key: "links",
      targetApp: "links",
      useLinks: useContactLinkEntityLinks,
      formatName: formatLinkName,
      labels: {
        searchPlaceholder: "Search links…",
        emptyCatalog: "No links found",
        emptySearch: "No matching links",
        allLinked: "All links are already linked",
        noLinkedYet: "No links linked yet",
        unlinkTitle: "Unlink link",
        unlinkDescription: (name: string) =>
          `Unlink "${name}" from this contact? The link will not be deleted.`,
      },
    },
  ],
  links: [
    {
      key: "tasks",
      targetApp: "tasks",
      useLinks: useLinkTaskLinks,
      formatName: formatTaskName,
      labels: {
        searchPlaceholder: "Search tasks…",
        emptyCatalog: "No tasks found",
        emptySearch: "No matching tasks",
        allLinked: "All tasks are already linked",
        noLinkedYet: "No tasks linked yet",
        unlinkTitle: "Unlink task",
        unlinkDescription: (name: string) =>
          `Unlink "${name}" from this link? The task will not be deleted.`,
      },
    },
    {
      key: "notes",
      targetApp: "notes",
      useLinks: useLinkNoteLinks,
      formatName: formatNoteName,
      labels: {
        searchPlaceholder: "Search notes…",
        emptyCatalog: "No notes found",
        emptySearch: "No matching notes",
        allLinked: "All notes are already linked",
        noLinkedYet: "No notes linked yet",
        unlinkTitle: "Unlink note",
        unlinkDescription: (name: string) =>
          `Unlink "${name}" from this link? The note will not be deleted.`,
      },
    },
    {
      key: "contacts",
      targetApp: "contacts",
      useLinks: useLinkContactLinks,
      formatName: formatContactName,
      labels: {
        searchPlaceholder: "Search contacts…",
        emptyCatalog: "No contacts found",
        emptySearch: "No matching contacts",
        allLinked: "All contacts are already linked",
        noLinkedYet: "No contacts linked yet",
        unlinkTitle: "Unlink contact",
        unlinkDescription: (name: string) =>
          `Unlink "${name}" from this link? The contact will not be deleted.`,
      },
    },
  ],
} as const;

/** Renders the configured cross-app link panel sections for one entity. */
function renderLinkPanels(
  source: keyof typeof PANEL_CONFIG_BY_SOURCE,
  entityId: string
): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4 border-t pt-4">
      {PANEL_CONFIG_BY_SOURCE[source].map((panel) => (
        <ExtensionEntityLinksSection
          key={panel.key}
          entityId={entityId}
          targetApp={panel.targetApp}
          useLinks={panel.useLinks as never}
          formatName={panel.formatName as never}
          labels={panel.labels}
        />
      ))}
    </div>
  );
}

/** Link panels shown when editing a task. */
export function TaskEntityLinkPanels({
  taskId,
}: {
  taskId: string;
}): React.JSX.Element {
  return renderLinkPanels("tasks", taskId);
}

/** Link panels shown when editing a note. */
export function NoteEntityLinkPanels({
  noteId,
}: {
  noteId: string;
}): React.JSX.Element {
  return renderLinkPanels("notes", noteId);
}

/** Link panels shown when editing a contact. */
export function ContactEntityLinkPanels({
  contactId,
}: {
  contactId: string;
}): React.JSX.Element {
  return renderLinkPanels("contacts", contactId);
}

/** Link panels shown when editing a link. */
export function LinkEntityLinkPanels({
  linkId,
}: {
  linkId: string;
}): React.JSX.Element {
  return renderLinkPanels("links", linkId);
}
