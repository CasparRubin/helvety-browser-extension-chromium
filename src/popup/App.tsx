import { readExtensionVersion } from "@helvety/extension-chrome/extension-version";
import { POPUP_SHELL_CLASS } from "@helvety/extension-chrome/popup-shell";
import { usePopupTheme } from "@helvety/extension-chrome/use-popup-theme";
import {
  buildE2eeDeepLink,
  type E2eeDeepLinkZone,
} from "@helvety/shared/e2ee-deep-link";
import { DeleteConfirmationDialog } from "@helvety/ui/delete-confirmation-dialog";
import { Toaster } from "@helvety/ui/sonner";
import { TooltipProvider } from "@helvety/ui/tooltip";
import { useCallback, useMemo, useRef } from "react";

import { HELVETY_AUTH_ORIGIN, HELVETY_GATEWAY } from "../lib/config";
import { ExtensionLinksProvider } from "../lib/extension-entity-links-hooks";
import { createExtensionSupabaseClient } from "../lib/extension-supabase";

import { STORAGE_KEY_POPUP_THEME } from "./constants";
import { useExtensionAuth } from "./hooks/use-extension-auth";
import { useExtensionEntities } from "./hooks/use-extension-entities";
import {
  E2EE_UNSAVED_CHANGES_DIALOG,
  useExtensionEntityForm,
} from "./hooks/use-extension-entity-form";
import { useExtensionVault } from "./hooks/use-extension-vault";
import { DataTabsView, type EntityTabId } from "./views/DataTabsView";
import { SignInView } from "./views/SignInView";
import { UnlockView } from "./views/UnlockView";

import type { EntityScreen } from "./entity-navigation";
import type { EntityKind } from "../lib/entity-types";

const TAB_WEB_PATH: Partial<Record<EntityTabId, string>> = {
  tasks: "/tasks",
  notes: "/notes",
  contacts: "/contacts",
};
const DEEP_LINK_ZONE_BY_KIND: Partial<Record<EntityKind, E2eeDeepLinkZone>> = {
  tasks: "tasks",
  notes: "notes",
  contacts: "contacts",
  links: "links",
};

/**
 *
 */
function deepLinkZoneForScreen(screen: EntityScreen): E2eeDeepLinkZone | null {
  if (screen.mode !== "form" || screen.formMode !== "edit" || !screen.id) {
    return null;
  }
  return DEEP_LINK_ZONE_BY_KIND[screen.kind] ?? null;
}

/** Root side panel: OTP sign-in, passkey unlock, E2EE CRUD for Helvety entities. */
export default function App() {
  const supabase = useMemo(() => createExtensionSupabaseClient(), []);
  const { themePreference, saveTheme } = usePopupTheme(STORAGE_KEY_POPUP_THEME);
  const extensionVersion = useMemo(() => readExtensionVersion(), []);
  const clearUnlockedUiRef = useRef<() => void>(() => {});

  const auth = useExtensionAuth(supabase);
  const handleVaultLocked = useCallback(() => {
    clearUnlockedUiRef.current();
  }, []);
  const handleSessionExpired = useCallback(async () => {
    await auth.signOut();
    auth.setAuthError("Your session expired. Sign in again.");
  }, [auth]);

  const vault = useExtensionVault({
    supabase,
    userId: auth.userId,
    accessToken: auth.accessToken,
    weeklyProof: auth.weeklyProof,
    onLocked: handleVaultLocked,
    onSessionExpired: handleSessionExpired,
  });

  const entities = useExtensionEntities({
    supabase,
    userId: auth.userId,
    masterKey: vault.masterKey,
    touchVaultActivity: vault.touchVaultActivity,
  });

  const form = useExtensionEntityForm({
    repo: entities.repo,
    tab: entities.tab,
    setTab: entities.setTab,
    setListError: entities.setListError,
    reloadCurrentTab: entities.reloadCurrentTab,
    touchVaultActivity: vault.touchVaultActivity,
    setTasks: entities.setTasks,
    setNotes: entities.setNotes,
    setContacts: entities.setContacts,
    setLinks: entities.setLinks,
    setLinkFolders: entities.setLinkFolders,
  });

  clearUnlockedUiRef.current = () => {
    entities.clearDecryptedEntityState();
    form.clearEntityFormState();
  };

  const handleLogout = useCallback(async () => {
    await auth.signOut(vault.clearVaultForSignOut);
  }, [auth, vault.clearVaultForSignOut]);

  const openInApp = useCallback(() => {
    const zone = deepLinkZoneForScreen(form.screen);
    if (zone && form.screen.mode === "form" && form.screen.id) {
      void chrome.tabs.create({
        url: buildE2eeDeepLink(zone, form.screen.id),
      });
      return;
    }
    void chrome.tabs.create({
      url: `${HELVETY_GATEWAY}${TAB_WEB_PATH[entities.tab] ?? "/links"}`,
    });
  }, [entities.tab, form.screen]);

  const shellClass = `flex h-full min-h-0 w-full flex-col ${POPUP_SHELL_CLASS} text-foreground`;

  if (
    !auth.sessionEmail ||
    !auth.userId ||
    !auth.accessToken ||
    !auth.weeklyProof
  ) {
    return (
      <div className={shellClass}>
        <SignInView
          version={extensionVersion}
          emailInput={auth.emailInput}
          otpInput={auth.otpInput}
          otpSent={auth.otpSent}
          nonEUEEAConfirmed={auth.nonEUEEAConfirmed}
          authBusy={auth.authBusy}
          authError={auth.authError}
          onEmailChange={auth.setEmailInput}
          onOtpChange={auth.setOtpInput}
          onNonEUEEAConfirmedChange={auth.setNonEUEEAConfirmed}
          onSendOtp={() => void auth.handleSendOtp()}
          onVerifyOtp={() => void auth.handleVerifyOtp()}
          onUseDifferentEmail={() => void auth.handleUseDifferentEmail()}
        />
      </div>
    );
  }

  if (!vault.masterKey) {
    return (
      <TooltipProvider delayDuration={300}>
        <div className={shellClass}>
          <UnlockView
            version={extensionVersion}
            sessionEmail={auth.sessionEmail}
            paramsPreflight={vault.paramsPreflight}
            cryptoBusy={vault.cryptoBusy}
            cryptoError={vault.cryptoError}
            onUnlock={() => void vault.handleUnlock()}
            onLogout={() => void handleLogout()}
            onOpenEncryptionSetup={() => {
              void chrome.tabs.create({ url: HELVETY_AUTH_ORIGIN });
            }}
          />
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <ExtensionLinksProvider repo={entities.linkRepo}>
        <div className={shellClass}>
          <div className="flex min-h-0 flex-1 flex-col">
            <DataTabsView
              version={extensionVersion}
              sessionEmail={auth.sessionEmail}
              tab={entities.tab}
              onTabChange={form.handleTabChange}
              screen={form.screen}
              listBusy={
                entities.tab !== "about" &&
                (entities.listBusy || !entities.loadedTabs.has(entities.tab))
              }
              listError={entities.listError}
              tasks={entities.tasks}
              notes={entities.notes}
              contacts={entities.contacts}
              links={entities.links}
              linkFolders={entities.linkFolders}
              linkFolderPickerItems={entities.linkFolderPickerItems}
              formDraft={form.formDraft}
              onFormDraftChange={form.setFormDraft}
              mutationBusy={form.mutationBusy}
              mutationError={form.mutationError}
              themePreference={themePreference}
              onSaveTheme={saveTheme}
              paramsPreflight={vault.paramsPreflight}
              onOpenInApp={openInApp}
              onLogout={() => void handleLogout()}
              onRetryList={entities.handleRetryList}
              onAdd={form.handleAdd}
              onAddFolder={form.handleAddFolder}
              onCancelForm={form.handleCancelForm}
              onSave={() => void form.handleSave()}
              hasUnsavedChanges={form.isFormDraftDirty()}
              onTaskClick={(task) => void form.openEdit("tasks", task.id)}
              onNoteClick={(note) => void form.openEdit("notes", note.id)}
              onContactClick={(contact) =>
                void form.openEdit("contacts", contact.id)
              }
              onLinkEdit={(link) => void form.openEdit("links", link.id)}
              onFolderEdit={(folder) =>
                void form.openEdit("link_folder", folder.id)
              }
              onTaskDelete={(task) =>
                form.requestDelete("tasks", task.id, task.title)
              }
              onNoteDelete={(note) =>
                form.requestDelete("notes", note.id, note.title)
              }
              onContactDelete={(contact) =>
                form.requestDelete(
                  "contacts",
                  contact.id,
                  `${contact.first_name} ${contact.last_name}`.trim()
                )
              }
              onReorderTasks={form.handleReorderTasks}
              onReorderNotes={form.handleReorderNotes}
              onReorderContacts={form.handleReorderContacts}
              onReorderLinks={form.handleReorderLinks}
              onReorderLinkFolders={form.handleReorderLinkFolders}
              onRetryFormLoad={form.retryFormLoad}
              onDeleteForm={form.requestDeleteFromForm}
            />
          </div>
          <DeleteConfirmationDialog
            open={form.deleteOpen}
            onOpenChange={form.setDeleteOpen}
            title={form.deleteDialogCopy.title}
            description={form.deleteDialogCopy.description}
            onConfirm={() => void form.confirmDelete()}
            isDeleting={form.mutationBusy}
          />
          <DeleteConfirmationDialog
            open={form.unsavedDialogOpen}
            onOpenChange={form.setUnsavedDialogOpen}
            title={E2EE_UNSAVED_CHANGES_DIALOG.title}
            description={E2EE_UNSAVED_CHANGES_DIALOG.description}
            onConfirm={form.confirmDiscardUnsaved}
            isDeleting={false}
          />
          <Toaster theme={themePreference} richColors position="top-center" />
        </div>
      </ExtensionLinksProvider>
    </TooltipProvider>
  );
}
