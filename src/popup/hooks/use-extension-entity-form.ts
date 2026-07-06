import {
  draftForKind,
  serializeFormDraft,
  validateE2eeDraft,
} from "@helvety/shared/validate-e2ee-draft";
import { reportE2eeHookError } from "@helvety/ui/auth-navigation";
import { E2EE_UNSAVED_CHANGES_DIALOG } from "@helvety/ui/e2ee-form-layout";
import { useCallback, useMemo, useRef, useState } from "react";

import { buildDeleteMessage } from "../../lib/entity-config";
import { entityKindForTab, type EntityScreen } from "../entity-navigation";
import {
  createEntity,
  deleteEntity,
  deleteLabelFromDraft,
  draftFromRecord,
  fetchEntity,
  updateEntity,
} from "../lib/extension-entity-mutations";

import type { EntityRepository } from "../../lib/entity-repository";
import type {
  ContactListRow,
  EntityKind,
  LinkFolderListRow,
  LinkListRow,
  NoteListRow,
  TaskListRow,
} from "../../lib/entity-types";
import type { EntityTabId } from "../views/DataTabsView";
import type { EntityFormDraft } from "../views/EntityFormView";

/**
 *
 */
export interface UseExtensionEntityFormOptions {
  repo: EntityRepository | null;
  tab: EntityTabId;
  setTab: (tab: EntityTabId) => void;
  setListError: (error: string | null) => void;
  reloadCurrentTab: () => Promise<void>;
  touchVaultActivity: () => Promise<void>;
  setTasks: (tasks: TaskListRow[]) => void;
  setNotes: (notes: NoteListRow[]) => void;
  setContacts: (contacts: ContactListRow[]) => void;
  setLinks: (links: LinkListRow[]) => void;
  setLinkFolders: (folders: LinkFolderListRow[]) => void;
}

/**
 *
 */
export interface UseExtensionEntityFormResult {
  screen: EntityScreen;
  formDraft: EntityFormDraft | null;
  setFormDraft: (draft: EntityFormDraft | null) => void;
  unsavedDialogOpen: boolean;
  setUnsavedDialogOpen: (open: boolean) => void;
  mutationBusy: boolean;
  mutationError: string | null;
  deleteOpen: boolean;
  setDeleteOpen: (open: boolean) => void;
  deleteDialogCopy: { title: string; description: string };
  isFormDraftDirty: () => boolean;
  clearEntityFormState: () => void;
  confirmDiscardUnsaved: () => void;
  handleTabChange: (next: EntityTabId) => void;
  handleCancelForm: () => void;
  handleAdd: () => void;
  handleAddFolder: () => void;
  handleSave: () => Promise<void>;
  openEdit: (kind: EntityKind, id: string) => Promise<void>;
  retryFormLoad: () => void;
  requestDelete: (kind: EntityKind, id: string, label: string) => void;
  confirmDelete: () => Promise<void>;
  requestDeleteFromForm: () => void;
  handleReorderTasks: (
    updates: { id: string; sort_order: number; stage_id?: string }[]
  ) => Promise<void>;
  handleReorderNotes: (
    updates: { id: string; sort_order: number; category_id?: string }[]
  ) => Promise<void>;
  handleReorderContacts: (
    updates: { id: string; sort_order: number; category_id?: string }[]
  ) => Promise<void>;
  handleReorderLinks: (
    updates: { id: string; sort_order: number }[]
  ) => Promise<void>;
  handleReorderLinkFolders: (
    updates: { id: string; sort_order: number }[]
  ) => Promise<void>;
}

/**
 *
 */
function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/** Owns entity form draft, unsaved/delete dialogs, mutations, and reorders. */
export function useExtensionEntityForm({
  repo,
  tab,
  setTab,
  setListError,
  reloadCurrentTab,
  touchVaultActivity,
  setTasks,
  setNotes,
  setContacts,
  setLinks,
  setLinkFolders,
}: UseExtensionEntityFormOptions): UseExtensionEntityFormResult {
  const [screen, setScreen] = useState<EntityScreen>({ mode: "list" });
  const [formDraft, setFormDraft] = useState<EntityFormDraft | null>(null);
  const baselineDraftRef = useRef<string | null>(null);
  const pendingTabChangeRef = useRef<EntityTabId | null>(null);
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);
  const [mutationBusy, setMutationBusy] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: EntityKind;
    id: string;
    label: string;
  } | null>(null);

  const deleteDialogCopy = useMemo(() => {
    if (!deleteTarget) {
      return { title: "", description: "" };
    }
    return buildDeleteMessage(deleteTarget.kind, deleteTarget.label);
  }, [deleteTarget]);

  const setDraftWithBaseline = useCallback((draft: EntityFormDraft | null) => {
    setFormDraft(draft);
    baselineDraftRef.current = draft ? serializeFormDraft(draft) : null;
  }, []);

  const isFormDraftDirty = useCallback((): boolean => {
    if (!formDraft || !baselineDraftRef.current) {
      return false;
    }
    return serializeFormDraft(formDraft) !== baselineDraftRef.current;
  }, [formDraft]);

  const clearEntityFormState = useCallback(() => {
    setFormDraft(null);
    baselineDraftRef.current = null;
    setMutationError(null);
    setDeleteOpen(false);
    setDeleteTarget(null);
    setUnsavedDialogOpen(false);
    setScreen({ mode: "list" });
  }, []);

  const goToList = useCallback(() => {
    clearEntityFormState();
  }, [clearEntityFormState]);

  const applyTabChange = useCallback(
    (next: EntityTabId) => {
      setTab(next);
      setListError(null);
      clearEntityFormState();
    },
    [clearEntityFormState, setListError, setTab]
  );

  const confirmDiscardUnsaved = useCallback(() => {
    const pendingTab = pendingTabChangeRef.current;
    pendingTabChangeRef.current = null;
    goToList();
    if (pendingTab) {
      setTab(pendingTab);
      setListError(null);
      setMutationError(null);
    }
  }, [goToList, setListError, setTab]);

  const handleTabChange = useCallback(
    (next: EntityTabId) => {
      void touchVaultActivity();
      if (screen.mode === "form" && isFormDraftDirty() && next !== tab) {
        pendingTabChangeRef.current = next;
        setUnsavedDialogOpen(true);
        return;
      }
      applyTabChange(next);
    },
    [applyTabChange, isFormDraftDirty, screen.mode, tab, touchVaultActivity]
  );

  const handleCancelForm = useCallback(() => {
    if (isFormDraftDirty()) {
      pendingTabChangeRef.current = null;
      setUnsavedDialogOpen(true);
      return;
    }
    goToList();
  }, [goToList, isFormDraftDirty]);

  const openCreate = useCallback(
    (kind: EntityKind) => {
      setDraftWithBaseline(draftForKind(kind));
      setScreen({ mode: "form", kind, formMode: "create" });
      setMutationError(null);
    },
    [setDraftWithBaseline]
  );

  const openEdit = useCallback(
    async (kind: EntityKind, id: string) => {
      if (!repo) {
        return;
      }
      setScreen({
        mode: "form",
        kind,
        formMode: "edit",
        id,
        loading: true,
        loadError: null,
      });
      setFormDraft(null);
      setMutationError(null);
      try {
        const record = await fetchEntity(repo, kind, id);
        const draft = draftFromRecord(kind, record);
        setDraftWithBaseline(draft);
        setScreen({
          mode: "form",
          kind,
          formMode: "edit",
          id,
          loading: false,
        });
      } catch (err) {
        reportE2eeHookError(err, {
          source: "extension-form-load",
          fallback: "Failed to load for editing",
        });
        setScreen({
          mode: "form",
          kind,
          formMode: "edit",
          id,
          loading: false,
          loadError: errorMessage(err, "Failed to load for editing"),
        });
      }
    },
    [repo, setDraftWithBaseline]
  );

  const retryFormLoad = useCallback(() => {
    if (screen.mode !== "form" || !screen.id || !repo) {
      return;
    }
    void openEdit(screen.kind, screen.id);
  }, [openEdit, repo, screen]);

  const handleSave = useCallback(async () => {
    if (!repo || screen.mode !== "form" || !formDraft) {
      return;
    }
    const validationError = validateE2eeDraft(formDraft);
    if (validationError) {
      setMutationError(validationError);
      return;
    }
    setMutationBusy(true);
    setMutationError(null);
    try {
      await touchVaultActivity();
      if (screen.formMode === "create") {
        const id = crypto.randomUUID();
        await createEntity(repo, formDraft, id);
        await reloadCurrentTab();
        await openEdit(screen.kind, id);
      } else if (screen.id) {
        await updateEntity(repo, screen.kind, screen.id, formDraft);
        await reloadCurrentTab();
        const record = await fetchEntity(repo, screen.kind, screen.id);
        setDraftWithBaseline(draftFromRecord(screen.kind, record));
        setScreen({
          mode: "form",
          kind: screen.kind,
          formMode: "edit",
          id: screen.id,
        });
      }
    } catch (err) {
      reportE2eeHookError(err, {
        source: "extension-form-save",
        fallback: "Save failed",
        setError: setMutationError,
      });
    } finally {
      setMutationBusy(false);
    }
  }, [
    formDraft,
    openEdit,
    reloadCurrentTab,
    repo,
    screen,
    setDraftWithBaseline,
    touchVaultActivity,
  ]);

  const requestDelete = useCallback(
    (kind: EntityKind, id: string, label: string) => {
      setDeleteTarget({ kind, id, label });
      setDeleteOpen(true);
    },
    []
  );

  const confirmDelete = useCallback(async () => {
    if (!repo || !deleteTarget) {
      return;
    }
    setMutationBusy(true);
    try {
      await touchVaultActivity();
      await deleteEntity(repo, deleteTarget.kind, deleteTarget.id);
      await reloadCurrentTab();
      setDeleteOpen(false);
      setDeleteTarget(null);
      goToList();
    } catch (err) {
      setDeleteOpen(false);
      reportE2eeHookError(err, {
        source: "extension-form-delete",
        fallback: "Delete failed",
        setError: setMutationError,
      });
    } finally {
      setMutationBusy(false);
    }
  }, [deleteTarget, goToList, reloadCurrentTab, repo, touchVaultActivity]);

  const handleAdd = useCallback(() => {
    if (tab === "links") {
      openCreate("links");
      return;
    }
    const kind = entityKindForTab(tab);
    if (kind) {
      openCreate(kind);
    }
  }, [openCreate, tab]);

  const handleAddFolder = useCallback(() => {
    openCreate("link_folder");
  }, [openCreate]);

  const handleReorderTasks = useCallback(
    async (
      updates: { id: string; sort_order: number; stage_id?: string }[]
    ) => {
      if (!repo || updates.length === 0) {
        return;
      }
      try {
        await repo.reorderTasks(updates);
        setTasks(await repo.listTasks());
      } catch (err) {
        reportE2eeHookError(err, {
          source: "extension-task-reorder",
          fallback: "Failed to reorder tasks",
          setError: setListError,
        });
      }
    },
    [repo, setListError, setTasks]
  );

  const handleReorderNotes = useCallback(
    async (
      updates: { id: string; sort_order: number; category_id?: string }[]
    ) => {
      if (!repo || updates.length === 0) {
        return;
      }
      try {
        await repo.reorderNotes(updates);
        setNotes(await repo.listNotes());
      } catch (err) {
        reportE2eeHookError(err, {
          source: "extension-note-reorder",
          fallback: "Failed to reorder notes",
          setError: setListError,
        });
      }
    },
    [repo, setListError, setNotes]
  );

  const handleReorderContacts = useCallback(
    async (
      updates: { id: string; sort_order: number; category_id?: string }[]
    ) => {
      if (!repo || updates.length === 0) {
        return;
      }
      try {
        await repo.reorderContacts(updates);
        setContacts(await repo.listContacts());
      } catch (err) {
        reportE2eeHookError(err, {
          source: "extension-contact-reorder",
          fallback: "Failed to reorder contacts",
          setError: setListError,
        });
      }
    },
    [repo, setContacts, setListError]
  );

  const handleReorderLinks = useCallback(
    async (updates: { id: string; sort_order: number }[]) => {
      if (!repo || updates.length === 0) {
        return;
      }
      try {
        await repo.reorderLinks(updates);
        setLinks(await repo.listLinks());
      } catch (err) {
        reportE2eeHookError(err, {
          source: "extension-link-reorder",
          fallback: "Failed to reorder links",
          setError: setListError,
        });
      }
    },
    [repo, setLinks, setListError]
  );

  const handleReorderLinkFolders = useCallback(
    async (updates: { id: string; sort_order: number }[]) => {
      if (!repo || updates.length === 0) {
        return;
      }
      try {
        await repo.reorderLinkFolders(updates);
        setLinkFolders(await repo.listLinkFolders());
      } catch (err) {
        reportE2eeHookError(err, {
          source: "extension-folder-reorder",
          fallback: "Failed to reorder folders",
          setError: setListError,
        });
      }
    },
    [repo, setLinkFolders, setListError]
  );

  const requestDeleteFromForm = useCallback(() => {
    if (screen.mode !== "form" || screen.formMode !== "edit" || !screen.id) {
      return;
    }
    const label = deleteLabelFromDraft(screen.kind, formDraft);
    if (!label) {
      return;
    }
    requestDelete(screen.kind, screen.id, label);
  }, [formDraft, requestDelete, screen]);

  return {
    screen,
    formDraft,
    setFormDraft,
    unsavedDialogOpen,
    setUnsavedDialogOpen,
    mutationBusy,
    mutationError,
    deleteOpen,
    setDeleteOpen,
    deleteDialogCopy,
    isFormDraftDirty,
    clearEntityFormState,
    confirmDiscardUnsaved,
    handleTabChange,
    handleCancelForm,
    handleAdd,
    handleAddFolder,
    handleSave,
    openEdit,
    retryFormLoad,
    requestDelete,
    confirmDelete,
    requestDeleteFromForm,
    handleReorderTasks,
    handleReorderNotes,
    handleReorderContacts,
    handleReorderLinks,
    handleReorderLinkFolders,
  };
}

export { E2EE_UNSAVED_CHANGES_DIALOG };
