import { readExtensionVersion } from "@helvety/extension-chrome/extension-version";
import { POPUP_SHELL_CLASS } from "@helvety/extension-chrome/popup-shell";
import { usePopupTheme } from "@helvety/extension-chrome/use-popup-theme";
import {
  deleteMasterKey,
  getMasterKey,
} from "@helvety/shared/crypto/key-storage";
import { DeleteConfirmationDialog } from "@helvety/ui/delete-confirmation-dialog";
import { TooltipProvider } from "@helvety/ui/tooltip";
import { useCallback, useEffect, useMemo, useState } from "react";

import { HELVETY_GATEWAY } from "../lib/config";
import { EntityRepository } from "../lib/entity-repository";
import { fetchPasskeyParamsForUser } from "../lib/extension-passkey-params";
import { createExtensionSupabaseClient } from "../lib/extension-supabase";
import { unlockEncryptionWithPasskey } from "../lib/passkey-unlock";
import {
  clearPendingOtp,
  readPendingOtp,
  writePendingOtp,
} from "../lib/pending-otp-storage";

import { STORAGE_KEY_POPUP_THEME } from "./constants";
import {
  contactToInput,
  emptyContactInput,
  emptyLinkFolderInput,
  emptyLinkInput,
  emptyNoteInput,
  emptyTaskInput,
  linkFolderToInput,
  linkToInput,
  noteToInput,
  taskToInput,
} from "./entity-drafts";
import { entityKindForTab, type EntityScreen } from "./entity-navigation";
import { DataTabsView, type EntityTabId } from "./views/DataTabsView";
import { SignInView } from "./views/SignInView";
import { UnlockView, type ParamsPreflight } from "./views/UnlockView";

import type { EntityFormDraft } from "./views/EntityFormView";
import type {
  Contact,
  ContactListRow,
  EntityListItem,
  EntityRecord,
  Link,
  LinkFolder,
  LinkFolderListRow,
  LinkListRow,
  Note,
  NoteListRow,
  Task,
  TaskListRow,
  EntityKind,
} from "../lib/entity-types";

/** Root side panel: OTP sign-in, passkey unlock, E2EE CRUD for Helvety entities. */
export default function App() {
  const supabase = useMemo(() => createExtensionSupabaseClient(), []);
  const { themePreference, saveTheme } = usePopupTheme(STORAGE_KEY_POPUP_THEME);
  const extensionVersion = useMemo(() => readExtensionVersion(), []);

  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [cryptoBusy, setCryptoBusy] = useState(false);
  const [cryptoError, setCryptoError] = useState<string | null>(null);
  const [paramsPreflight, setParamsPreflight] =
    useState<ParamsPreflight | null>(null);

  const [tab, setTab] = useState<EntityTabId>("tasks");
  const [screen, setScreen] = useState<EntityScreen>({ mode: "list" });

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

  const [formDraft, setFormDraft] = useState<EntityFormDraft | null>(null);
  const [mutationBusy, setMutationBusy] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: EntityKind;
    id: string;
    label: string;
  } | null>(null);

  const repo = useMemo(() => {
    if (!masterKey || !userId) {
      return null;
    }
    return new EntityRepository(supabase, userId, masterKey);
  }, [masterKey, supabase, userId]);

  /** Drop decrypted entity data from React state (sign-out / account switch). */
  const clearDecryptedEntityState = useCallback(() => {
    setTasks([]);
    setNotes([]);
    setContacts([]);
    setLinks([]);
    setLinkFolders([]);
    setLinkFolderPickerItems([]);
    setFormDraft(null);
    setListError(null);
    setDeleteOpen(false);
    setDeleteTarget(null);
    setScreen({ mode: "list" });
  }, []);

  const shellClass = `flex h-full min-h-0 w-full flex-col ${POPUP_SHELL_CLASS} text-foreground`;

  const refreshSession = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session?.user) {
      setSessionEmail(null);
      setUserId(null);
      setAccessToken(null);
      return;
    }
    setSessionEmail(session.user.email ?? null);
    setUserId(session.user.id);
    setAccessToken(session.access_token);
  }, [supabase]);

  useEffect(() => {
    void refreshSession();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshSession();
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [refreshSession, supabase]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled || data.session?.user) {
        return;
      }
      const record = await readPendingOtp();
      if (cancelled || !record) {
        return;
      }
      setEmailInput(record.email);
      setOtpSent(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    setLoadedTabs(new Set());
    clearDecryptedEntityState();
    setMasterKey(null);
    if (!userId) {
      return;
    }
    void (async () => {
      const key = await getMasterKey(userId);
      setMasterKey(key);
    })();
  }, [userId, clearDecryptedEntityState]);

  useEffect(() => {
    if (!userId || !accessToken || masterKey) {
      setParamsPreflight(null);
      return;
    }
    let cancelled = false;
    setParamsPreflight({ status: "loading" });
    void (async () => {
      const result = await fetchPasskeyParamsForUser(supabase, userId);
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setParamsPreflight({ status: "error", message: result.error });
        return;
      }
      if (!result.params) {
        setParamsPreflight({ status: "not_setup" });
        return;
      }
      setParamsPreflight({ status: "ready" });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, accessToken, masterKey, supabase]);

  const loadTab = useCallback(
    async (target: EntityTabId) => {
      if (!repo || target === "about") {
        return;
      }
      setListBusy(true);
      setListError(null);
      try {
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
      } catch (e) {
        setListError(e instanceof Error ? e.message : "Failed to load data");
      } finally {
        setListBusy(false);
      }
    },
    [repo]
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

  useEffect(() => {
    if (!repo || tab === "about") {
      return;
    }
    if (!loadedTabs.has(tab)) {
      void loadTab(tab);
    }
  }, [loadTab, loadedTabs, repo, tab]);

  const handleSendOtp = async () => {
    setAuthError(null);
    setAuthBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: emailInput.trim(),
        options: { shouldCreateUser: true },
      });
      if (error) {
        setAuthError(error.message);
        return;
      }
      setOtpSent(true);
      await writePendingOtp(emailInput.trim());
    } finally {
      setAuthBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    setAuthError(null);
    setAuthBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: emailInput.trim(),
        token: otpInput.trim(),
        type: "email",
      });
      if (error) {
        setAuthError(error.message);
        return;
      }
      setOtpInput("");
      setOtpSent(false);
      await clearPendingOtp();
      await refreshSession();
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    if (userId) {
      await deleteMasterKey(userId);
    }
    clearDecryptedEntityState();
    setMasterKey(null);
    setLoadedTabs(new Set());
    setEmailInput("");
    setOtpInput("");
    setOtpSent(false);
    setAuthError(null);
    await clearPendingOtp();
    await supabase.auth.signOut();
    await refreshSession();
  };

  const handleUnlock = async () => {
    if (!accessToken || !userId) {
      setCryptoError("Not signed in.");
      return;
    }
    setCryptoError(null);
    setCryptoBusy(true);
    setParamsPreflight({ status: "loading" });
    try {
      const preflight = await fetchPasskeyParamsForUser(supabase, userId);
      if (!preflight.ok) {
        setParamsPreflight({ status: "error", message: preflight.error });
        setCryptoError(preflight.error);
        return;
      }
      if (!preflight.params) {
        setParamsPreflight({ status: "not_setup" });
        setCryptoError("Encryption is not set up for this account.");
        return;
      }
      setParamsPreflight({ status: "ready" });

      const result = await unlockEncryptionWithPasskey({
        supabase,
        accessToken,
        userId,
      });
      if (!result.ok) {
        setCryptoError(result.error);
        return;
      }
      const key = await getMasterKey(userId);
      setMasterKey(key);
      setLoadedTabs(new Set());
      setScreen({ mode: "list" });
    } finally {
      setCryptoBusy(false);
    }
  };

  const handleTabChange = (next: EntityTabId) => {
    setTab(next);
    setListError(null);
    setScreen({ mode: "list" });
    setMutationError(null);
    setFormDraft(null);
  };

  const handleRetryList = () => {
    if (tab !== "about") {
      void loadTab(tab);
    }
  };

  const goToList = () => {
    setScreen({ mode: "list" });
    setMutationError(null);
    setFormDraft(null);
  };

  const openCreate = (kind: EntityKind) => {
    setFormDraft(draftForKind(kind));
    setScreen({ mode: "form", kind, formMode: "create" });
    setMutationError(null);
  };

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
        setFormDraft(draftFromRecord(kind, record));
        setScreen({
          mode: "form",
          kind,
          formMode: "edit",
          id,
          loading: false,
        });
      } catch (e) {
        setScreen({
          mode: "form",
          kind,
          formMode: "edit",
          id,
          loading: false,
          loadError:
            e instanceof Error ? e.message : "Failed to load for editing",
        });
      }
    },
    [repo]
  );

  const retryFormLoad = useCallback(() => {
    if (screen.mode !== "form" || !screen.id || !repo) {
      return;
    }
    void openEdit(screen.kind, screen.id);
  }, [openEdit, repo, screen]);

  const handleSave = async () => {
    if (!repo || screen.mode !== "form" || !formDraft) {
      return;
    }
    const validationError = validateDraft(formDraft);
    if (validationError) {
      setMutationError(validationError);
      return;
    }
    setMutationBusy(true);
    setMutationError(null);
    try {
      if (screen.formMode === "create") {
        const id = await createEntity(repo, formDraft);
        await reloadCurrentTab();
        await openEdit(screen.kind, id);
      } else if (screen.id) {
        await updateEntity(repo, screen.kind, screen.id, formDraft);
        await reloadCurrentTab();
        const record = await fetchEntity(repo, screen.kind, screen.id);
        setFormDraft(draftFromRecord(screen.kind, record));
        setScreen({
          mode: "form",
          kind: screen.kind,
          formMode: "edit",
          id: screen.id,
        });
      }
    } catch (e) {
      setMutationError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setMutationBusy(false);
    }
  };

  const requestDelete = (kind: EntityKind, id: string, label: string) => {
    setDeleteTarget({ kind, id, label });
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!repo || !deleteTarget) {
      return;
    }
    setMutationBusy(true);
    try {
      await deleteEntity(repo, deleteTarget.kind, deleteTarget.id);
      await reloadCurrentTab();
      setDeleteOpen(false);
      setDeleteTarget(null);
      goToList();
    } catch (e) {
      setDeleteOpen(false);
      setMutationError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setMutationBusy(false);
    }
  };

  const openInApp = () => {
    const path =
      tab === "tasks"
        ? "/tasks"
        : tab === "notes"
          ? "/notes"
          : tab === "contacts"
            ? "/contacts"
            : "/links";
    void chrome.tabs.create({ url: `${HELVETY_GATEWAY}${path}` });
  };

  const handleAdd = () => {
    if (tab === "links") {
      openCreate("links");
      return;
    }
    const kind = entityKindForTab(tab);
    if (kind) {
      openCreate(kind);
    }
  };

  const handleAddFolder = () => {
    openCreate("link_folder");
  };

  const handleReorderTasks = async (
    updates: { id: string; sort_order: number; stage_id?: string }[]
  ) => {
    if (!repo || updates.length === 0) {
      return;
    }
    try {
      await repo.reorderTasks(updates);
      setTasks(await repo.listTasks());
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to reorder tasks");
    }
  };

  const handleReorderNotes = async (
    updates: { id: string; sort_order: number; category_id?: string }[]
  ) => {
    if (!repo || updates.length === 0) {
      return;
    }
    try {
      await repo.reorderNotes(updates);
      setNotes(await repo.listNotes());
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to reorder notes");
    }
  };

  const handleReorderContacts = async (
    updates: { id: string; sort_order: number; category_id?: string }[]
  ) => {
    if (!repo || updates.length === 0) {
      return;
    }
    try {
      await repo.reorderContacts(updates);
      setContacts(await repo.listContacts());
    } catch (e) {
      setListError(
        e instanceof Error ? e.message : "Failed to reorder contacts"
      );
    }
  };

  const requestDeleteFromForm = useCallback(() => {
    if (screen.mode !== "form" || screen.formMode !== "edit" || !screen.id) {
      return;
    }
    const label = deleteLabelFromDraft(screen.kind, formDraft);
    if (!label) {
      return;
    }
    requestDelete(screen.kind, screen.id, label);
  }, [formDraft, screen]);

  if (!sessionEmail || !userId || !accessToken) {
    return (
      <div className={shellClass}>
        <SignInView
          version={extensionVersion}
          emailInput={emailInput}
          otpInput={otpInput}
          otpSent={otpSent}
          authBusy={authBusy}
          authError={authError}
          onEmailChange={setEmailInput}
          onOtpChange={setOtpInput}
          onSendOtp={() => void handleSendOtp()}
          onVerifyOtp={() => void handleVerifyOtp()}
          onUseDifferentEmail={() => {
            setOtpSent(false);
            setOtpInput("");
            void clearPendingOtp();
          }}
        />
      </div>
    );
  }

  if (!masterKey) {
    return (
      <TooltipProvider delayDuration={300}>
        <div className={shellClass}>
          <UnlockView
            version={extensionVersion}
            sessionEmail={sessionEmail}
            paramsPreflight={paramsPreflight}
            cryptoBusy={cryptoBusy}
            cryptoError={cryptoError}
            onUnlock={() => void handleUnlock()}
            onLogout={() => void handleLogout()}
          />
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className={shellClass}>
        <div className="flex min-h-0 flex-1 flex-col">
          <DataTabsView
            version={extensionVersion}
            sessionEmail={sessionEmail}
            tab={tab}
            onTabChange={handleTabChange}
            screen={screen}
            listBusy={tab !== "about" && (listBusy || !loadedTabs.has(tab))}
            listError={listError}
            tasks={tasks}
            notes={notes}
            contacts={contacts}
            links={links}
            linkFolders={linkFolders}
            linkFolderPickerItems={linkFolderPickerItems}
            formDraft={formDraft}
            onFormDraftChange={setFormDraft}
            mutationBusy={mutationBusy}
            mutationError={mutationError}
            themePreference={themePreference}
            onSaveTheme={saveTheme}
            paramsPreflight={paramsPreflight}
            onOpenInApp={openInApp}
            onLogout={() => void handleLogout()}
            onRetryList={handleRetryList}
            onAdd={handleAdd}
            onAddFolder={handleAddFolder}
            onCancelForm={goToList}
            onSave={() => void handleSave()}
            onTaskClick={(task) => void openEdit("tasks", task.id)}
            onNoteClick={(note) => void openEdit("notes", note.id)}
            onContactClick={(contact) => void openEdit("contacts", contact.id)}
            onLinkEdit={(link) => void openEdit("links", link.id)}
            onFolderEdit={(folder) => void openEdit("link_folder", folder.id)}
            onTaskDelete={(task) => requestDelete("tasks", task.id, task.title)}
            onNoteDelete={(note) => requestDelete("notes", note.id, note.title)}
            onContactDelete={(contact) =>
              requestDelete(
                "contacts",
                contact.id,
                `${contact.first_name} ${contact.last_name}`.trim()
              )
            }
            onReorderTasks={handleReorderTasks}
            onReorderNotes={handleReorderNotes}
            onReorderContacts={handleReorderContacts}
            onRetryFormLoad={retryFormLoad}
            onDeleteForm={requestDeleteFromForm}
          />
        </div>
        <DeleteConfirmationDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete permanently?"
          description={
            deleteTarget
              ? `"${deleteTarget.label}" will be removed. This cannot be undone.`
              : ""
          }
          onConfirm={() => confirmDelete()}
          isDeleting={mutationBusy}
        />
      </div>
    </TooltipProvider>
  );
}

/**
 *
 */
async function fetchEntity(
  repo: EntityRepository,
  kind: EntityKind,
  id: string
): Promise<EntityRecord> {
  switch (kind) {
    case "tasks":
      return repo.getTask(id);
    case "notes":
      return repo.getNote(id);
    case "contacts":
      return repo.getContact(id);
    case "links":
      return repo.getLink(id);
    case "link_folder":
      return repo.getLinkFolder(id);
  }
}

/**
 *
 */
function draftForKind(kind: EntityKind): EntityFormDraft {
  switch (kind) {
    case "tasks":
      return { kind: "tasks", value: emptyTaskInput() };
    case "notes":
      return { kind: "notes", value: emptyNoteInput() };
    case "contacts":
      return { kind: "contacts", value: emptyContactInput() };
    case "links":
      return { kind: "links", value: emptyLinkInput() };
    case "link_folder":
      return { kind: "link_folder", value: emptyLinkFolderInput() };
  }
}

/**
 *
 */
function draftFromRecord(
  kind: EntityKind,
  record: EntityRecord
): EntityFormDraft {
  switch (kind) {
    case "tasks":
      return { kind: "tasks", value: taskToInput(record as Task) };
    case "notes":
      return { kind: "notes", value: noteToInput(record as Note) };
    case "contacts":
      return { kind: "contacts", value: contactToInput(record as Contact) };
    case "links":
      return { kind: "links", value: linkToInput(record as Link) };
    case "link_folder":
      return {
        kind: "link_folder",
        value: linkFolderToInput(record as LinkFolder),
      };
  }
}

/**
 *
 */
function validateDraft(draft: EntityFormDraft): string | null {
  switch (draft.kind) {
    case "tasks":
      return draft.value.title.trim() ? null : "Title is required.";
    case "notes":
      return draft.value.title.trim() ? null : "Title is required.";
    case "contacts":
      return draft.value.first_name.trim() ? null : "First name is required.";
    case "links":
      if (!draft.value.name.trim()) {
        return "Name is required.";
      }
      return draft.value.url.trim() ? null : "URL is required.";
    case "link_folder":
      return draft.value.name.trim() ? null : "Folder name is required.";
  }
}

/**
 *
 */
async function createEntity(
  repo: EntityRepository,
  draft: EntityFormDraft
): Promise<string> {
  switch (draft.kind) {
    case "tasks":
      return repo.createTask(draft.value);
    case "notes":
      return repo.createNote(draft.value);
    case "contacts":
      return repo.createContact(draft.value);
    case "links":
      return repo.createLink(draft.value);
    case "link_folder":
      return repo.createLinkFolder(draft.value);
  }
}

/**
 *
 */
async function updateEntity(
  repo: EntityRepository,
  kind: EntityKind,
  id: string,
  draft: EntityFormDraft
): Promise<void> {
  switch (kind) {
    case "tasks":
      if (draft.kind !== "tasks") {
        throw new Error("Form data does not match entity type.");
      }
      await repo.updateTask(id, draft.value);
      return;
    case "notes":
      if (draft.kind !== "notes") {
        throw new Error("Form data does not match entity type.");
      }
      await repo.updateNote(id, draft.value);
      return;
    case "contacts":
      if (draft.kind !== "contacts") {
        throw new Error("Form data does not match entity type.");
      }
      await repo.updateContact(id, draft.value);
      return;
    case "links":
      if (draft.kind !== "links") {
        throw new Error("Form data does not match entity type.");
      }
      await repo.updateLink(id, draft.value);
      return;
    case "link_folder":
      if (draft.kind !== "link_folder") {
        throw new Error("Form data does not match entity type.");
      }
      await repo.updateLinkFolder(id, draft.value);
      return;
  }
}

/**
 *
 */
async function deleteEntity(
  repo: EntityRepository,
  kind: EntityKind,
  id: string
): Promise<void> {
  switch (kind) {
    case "tasks":
      await repo.deleteTask(id);
      return;
    case "notes":
      await repo.deleteNote(id);
      return;
    case "contacts":
      await repo.deleteContact(id);
      return;
    case "links":
      await repo.deleteLink(id);
      return;
    case "link_folder":
      await repo.deleteLinkFolder(id);
      return;
  }
}

/**
 *
 */
function deleteLabelFromDraft(
  kind: EntityKind,
  draft: EntityFormDraft | null
): string | null {
  if (draft?.kind !== kind) {
    return null;
  }
  switch (draft.kind) {
    case "tasks":
      return draft.value.title.trim() || "Task";
    case "notes":
      return draft.value.title.trim() || "Note";
    case "contacts":
      return (
        `${draft.value.first_name} ${draft.value.last_name}`.trim() || "Contact"
      );
    case "links":
      return draft.value.name.trim() || "Link";
    case "link_folder":
      return draft.value.name.trim() || "Folder";
  }
}
