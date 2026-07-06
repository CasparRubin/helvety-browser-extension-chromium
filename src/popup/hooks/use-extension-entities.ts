import { reportE2eeHookError } from "@helvety/ui/auth-navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { EntityLinkRepository } from "../../lib/entity-link-repository";
import { EntityRepository } from "../../lib/entity-repository";

import type {
  ContactListRow,
  EntityListItem,
  LinkFolderListRow,
  LinkListRow,
  NoteListRow,
  TaskListRow,
} from "../../lib/entity-types";
import type { ExtensionSupabaseClient } from "../../lib/extension-supabase";
import type { EntityTabId } from "../views/DataTabsView";

/**
 *
 */
export interface UseExtensionEntitiesOptions {
  supabase: ExtensionSupabaseClient;
  userId: string | null;
  masterKey: CryptoKey | null;
  touchVaultActivity: () => Promise<void>;
}

/**
 *
 */
export interface UseExtensionEntitiesResult {
  repo: EntityRepository | null;
  linkRepo: EntityLinkRepository | null;
  tab: EntityTabId;
  setTab: (tab: EntityTabId) => void;
  listBusy: boolean;
  listError: string | null;
  setListError: (error: string | null) => void;
  tasks: TaskListRow[];
  notes: NoteListRow[];
  contacts: ContactListRow[];
  links: LinkListRow[];
  linkFolders: LinkFolderListRow[];
  linkFolderPickerItems: EntityListItem[];
  loadedTabs: Set<EntityTabId>;
  setTasks: (tasks: TaskListRow[]) => void;
  setNotes: (notes: NoteListRow[]) => void;
  setContacts: (contacts: ContactListRow[]) => void;
  setLinks: (links: LinkListRow[]) => void;
  setLinkFolders: (folders: LinkFolderListRow[]) => void;
  loadTab: (target: EntityTabId) => Promise<void>;
  invalidateTab: (target: EntityTabId) => void;
  reloadCurrentTab: () => Promise<void>;
  clearDecryptedEntityState: () => void;
  handleRetryList: () => void;
}

/** Owns decrypted entity repositories, tab state, and list loading. */
export function useExtensionEntities({
  supabase,
  userId,
  masterKey,
  touchVaultActivity,
}: UseExtensionEntitiesOptions): UseExtensionEntitiesResult {
  const [tab, setTab] = useState<EntityTabId>("links");
  const [listBusy, setListBusy] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskListRow[]>([]);
  const [notes, setNotes] = useState<NoteListRow[]>([]);
  const [contacts, setContacts] = useState<ContactListRow[]>([]);
  const [links, setLinks] = useState<LinkListRow[]>([]);
  const [linkFolders, setLinkFolders] = useState<LinkFolderListRow[]>([]);
  const [linkFolderPickerItems, setLinkFolderPickerItems] = useState<
    EntityListItem[]
  >([]);
  const [loadedTabs, setLoadedTabs] = useState<Set<EntityTabId>>(new Set());

  const repo = useMemo(() => {
    if (!masterKey || !userId) {
      return null;
    }
    return new EntityRepository(supabase, userId, masterKey);
  }, [masterKey, supabase, userId]);

  const linkRepo = useMemo(() => {
    if (!repo || !userId) {
      return null;
    }
    return new EntityLinkRepository(supabase, userId, repo);
  }, [repo, supabase, userId]);

  const clearDecryptedEntityState = useCallback(() => {
    setTasks([]);
    setNotes([]);
    setContacts([]);
    setLinks([]);
    setLinkFolders([]);
    setLinkFolderPickerItems([]);
    setListError(null);
    setLoadedTabs(new Set());
  }, []);

  const loadTab = useCallback(
    async (target: EntityTabId) => {
      if (!repo || target === "about") {
        return;
      }
      setListBusy(true);
      setListError(null);
      try {
        await touchVaultActivity();
        if (target === "tasks") {
          setTasks(await repo.listTasks());
        } else if (target === "notes") {
          setNotes(await repo.listNotes());
        } else if (target === "contacts") {
          setContacts(await repo.listContacts());
        } else if (target === "links") {
          setLinks(await repo.listLinks());
          setLinkFolders(await repo.listLinkFolders());
          setLinkFolderPickerItems(await repo.listLinkFolderPickerItems());
        }
        setLoadedTabs((prev) => new Set(prev).add(target));
      } catch (err) {
        reportE2eeHookError(err, {
          source: "extension-list-load",
          fallback: "Failed to load data",
          setError: setListError,
        });
      } finally {
        setListBusy(false);
      }
    },
    [repo, touchVaultActivity]
  );

  const invalidateTab = useCallback((target: EntityTabId) => {
    setLoadedTabs((prev) => {
      const next = new Set(prev);
      next.delete(target);
      return next;
    });
  }, []);

  const reloadCurrentTab = useCallback(async () => {
    if (tab === "about") {
      return;
    }
    invalidateTab(tab);
    await loadTab(tab);
  }, [invalidateTab, loadTab, tab]);

  const handleRetryList = useCallback(() => {
    if (tab !== "about") {
      void loadTab(tab);
    }
  }, [loadTab, tab]);

  useEffect(() => {
    clearDecryptedEntityState();
  }, [clearDecryptedEntityState, userId, masterKey]);

  useEffect(() => {
    if (!repo || tab === "about") {
      return;
    }
    if (!loadedTabs.has(tab)) {
      void loadTab(tab);
    }
  }, [loadTab, loadedTabs, repo, tab]);

  return {
    repo,
    linkRepo,
    tab,
    setTab,
    listBusy,
    listError,
    setListError,
    tasks,
    notes,
    contacts,
    links,
    linkFolders,
    linkFolderPickerItems,
    loadedTabs,
    setTasks,
    setNotes,
    setContacts,
    setLinks,
    setLinkFolders,
    loadTab,
    invalidateTab,
    reloadCurrentTab,
    clearDecryptedEntityState,
    handleRetryList,
  };
}
