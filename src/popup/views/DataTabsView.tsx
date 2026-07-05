import { POPUP_TAB_TRIGGER_ICON_CLASS } from "@helvety/extension-chrome/popup-shell";
import { Button } from "@helvety/ui/button";
import { ListErrorState, ListLoadingState } from "@helvety/ui/list-states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@helvety/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@helvety/ui/tooltip";
import {
  ArrowLeft,
  BadgeInfo,
  ExternalLink,
  FolderPlus,
  Link2,
  ListTodo,
  LogOut,
  NotebookPen,
  Plus,
  Users,
} from "lucide-react";

import { EntityScreenLayout } from "../components/EntityScreenLayout";
import { IconTooltipButton } from "../components/IconTooltipButton";
import { ContactEntityList } from "../components/lists/contact-entity-list";
import { LinksTreeList } from "../components/lists/links-tree-list";
import { NoteEntityList } from "../components/lists/note-entity-list";
import { TaskEntityList } from "../components/lists/task-entity-list";
import { PopupHeader } from "../components/PopupHeader";
import { entityFormSessionKey, type EntityScreen } from "../entity-navigation";
import { sectionTitle } from "../section-title";

import { AboutTab } from "./AboutTab";
import { EntityFormView, type EntityFormDraft } from "./EntityFormView";

import type { ParamsPreflight } from "./UnlockView";
import type {
  ContactListRow,
  EntityListItem,
  LinkFolderListRow,
  LinkListRow,
  NoteListRow,
  TaskListRow,
} from "../../lib/entity-types";
import type { ThemePreference } from "@helvety/extension-chrome/theme-preference";

/** Main entity tabs after unlock (links, tasks, notes, contacts, about). */
export type EntityTabId = "links" | "tasks" | "notes" | "contacts" | "about";

/**
 *
 */
function TabIconTrigger({
  value,
  label,
  children,
}: {
  value: string;
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <TabsTrigger
            value={value}
            className={POPUP_TAB_TRIGGER_ICON_CLASS}
            aria-label={label}
          />
        }
      >
        {children}
        <span className="sr-only">{label}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

/** Tabbed shell: grouped entity lists, edit forms, and about/settings. */
export function DataTabsView({
  version,
  sessionEmail,
  tab,
  onTabChange,
  screen,
  listBusy,
  listError,
  tasks,
  notes,
  contacts,
  links,
  linkFolders,
  linkFolderPickerItems,
  formDraft,
  onFormDraftChange,
  mutationBusy,
  mutationError,
  themePreference,
  onSaveTheme,
  paramsPreflight,
  onOpenInApp,
  onLogout,
  onRetryList,
  onAdd,
  onAddFolder,
  onCancelForm,
  onSave,
  onTaskClick,
  onNoteClick,
  onContactClick,
  onLinkEdit,
  onFolderEdit,
  onTaskDelete,
  onNoteDelete,
  onContactDelete,
  onReorderTasks,
  onReorderNotes,
  onReorderContacts,
  onReorderLinks,
  onReorderLinkFolders,
  onRetryFormLoad,
  onDeleteForm,
}: {
  version: string;
  sessionEmail: string;
  tab: EntityTabId;
  onTabChange: (tab: EntityTabId) => void;
  screen: EntityScreen;
  listBusy: boolean;
  listError: string | null;
  tasks: TaskListRow[];
  notes: NoteListRow[];
  contacts: ContactListRow[];
  links: LinkListRow[];
  linkFolders: LinkFolderListRow[];
  linkFolderPickerItems: EntityListItem[];
  formDraft: EntityFormDraft | null;
  onFormDraftChange: (draft: EntityFormDraft) => void;
  mutationBusy: boolean;
  mutationError: string | null;
  themePreference: ThemePreference;
  onSaveTheme: (next: ThemePreference) => void;
  paramsPreflight: ParamsPreflight | null;
  onOpenInApp: () => void;
  onLogout: () => void;
  onRetryList: () => void;
  onAdd: () => void;
  onAddFolder: () => void;
  onCancelForm: () => void;
  onSave: () => void;
  onTaskClick: (task: TaskListRow) => void;
  onNoteClick: (note: NoteListRow) => void;
  onContactClick: (contact: ContactListRow) => void;
  onLinkEdit: (link: LinkListRow) => void;
  onFolderEdit: (folder: LinkFolderListRow) => void;
  onTaskDelete: (task: TaskListRow) => void;
  onNoteDelete: (note: NoteListRow) => void;
  onContactDelete: (contact: ContactListRow) => void;
  onReorderTasks: (
    updates: { id: string; sort_order: number; stage_id?: string }[]
  ) => void | Promise<void>;
  onReorderNotes: (
    updates: { id: string; sort_order: number; category_id?: string }[]
  ) => void | Promise<void>;
  onReorderContacts: (
    updates: { id: string; sort_order: number; category_id?: string }[]
  ) => void | Promise<void>;
  onReorderLinks: (
    updates: { id: string; sort_order: number }[]
  ) => void | Promise<void>;
  onReorderLinkFolders: (
    updates: { id: string; sort_order: number }[]
  ) => void | Promise<void>;
  onRetryFormLoad: () => void;
  onDeleteForm: () => void;
}): React.JSX.Element {
  const title = sectionTitle({ tab, screen });

  const entityPanel = (entityTab: Exclude<EntityTabId, "about">) => {
    const showForm =
      screen.mode === "form" &&
      tab === entityTab &&
      (entityTab !== "links" ||
        screen.kind === "links" ||
        screen.kind === "link_folder");

    if (showForm) {
      if (screen.loading || (!formDraft && !screen.loadError)) {
        return (
          <EntityScreenLayout>
            <ListLoadingState message="Loading…" />
          </EntityScreenLayout>
        );
      }
      if (screen.loadError) {
        return (
          <EntityScreenLayout>
            <ListErrorState
              message={screen.loadError}
              onRetry={onRetryFormLoad}
            />
          </EntityScreenLayout>
        );
      }
      if (!formDraft) {
        return null;
      }
      return (
        <EntityFormView
          kind={screen.kind}
          formMode={screen.formMode}
          editingEntityId={screen.formMode === "edit" ? screen.id : undefined}
          formSessionKey={entityFormSessionKey(screen)}
          draft={formDraft}
          onDraftChange={onFormDraftChange}
          linkFolders={linkFolderPickerItems}
          editingFolderId={
            screen.kind === "link_folder" ? screen.id : undefined
          }
          mutationBusy={mutationBusy}
          mutationError={mutationError}
          onSave={onSave}
          onCancel={onCancelForm}
          onDelete={
            screen.formMode === "edit" && screen.id ? onDeleteForm : undefined
          }
        />
      );
    }

    const emptyDescription =
      "Add one with the button below, or use the web app.";
    const listFooter =
      entityTab === "links" ? (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={onAddFolder}
          >
            <FolderPlus className="size-4" />
            Folder
          </Button>
          <Button type="button" size="sm" className="flex-1" onClick={onAdd}>
            <Plus className="size-4" />
            Link
          </Button>
        </div>
      ) : (
        <Button type="button" size="sm" className="w-full" onClick={onAdd}>
          <Plus className="size-4" />
          Add
        </Button>
      );

    return (
      <EntityScreenLayout footer={listFooter}>
        <div aria-live="polite">
          {entityTab === "tasks" ? (
            <TaskEntityList
              tasks={tasks}
              isLoading={listBusy}
              error={listError}
              emptyTitle="No tasks yet"
              emptyDescription={emptyDescription}
              onRetry={onRetryList}
              onTaskClick={onTaskClick}
              onTaskDelete={onTaskDelete}
              onReorder={onReorderTasks}
            />
          ) : null}
          {entityTab === "notes" ? (
            <NoteEntityList
              notes={notes}
              isLoading={listBusy}
              error={listError}
              emptyTitle="No notes yet"
              emptyDescription={emptyDescription}
              onRetry={onRetryList}
              onNoteClick={onNoteClick}
              onNoteDelete={onNoteDelete}
              onReorder={onReorderNotes}
            />
          ) : null}
          {entityTab === "contacts" ? (
            <ContactEntityList
              contacts={contacts}
              isLoading={listBusy}
              error={listError}
              emptyTitle="No contacts yet"
              emptyDescription={emptyDescription}
              onRetry={onRetryList}
              onContactClick={onContactClick}
              onContactDelete={onContactDelete}
              onReorder={onReorderContacts}
            />
          ) : null}
          {entityTab === "links" ? (
            <LinksTreeList
              folders={linkFolders}
              links={links}
              isLoading={listBusy}
              error={listError}
              emptyTitle="No links yet"
              emptyDescription={emptyDescription}
              onRetry={onRetryList}
              onLinkEdit={onLinkEdit}
              onFolderEdit={onFolderEdit}
              onReorderLinks={onReorderLinks}
              onReorderFolders={onReorderLinkFolders}
            />
          ) : null}
        </div>
      </EntityScreenLayout>
    );
  };

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => {
        if (
          v === "tasks" ||
          v === "notes" ||
          v === "contacts" ||
          v === "links" ||
          v === "about"
        ) {
          onTabChange(v);
        }
      }}
      className="flex min-h-0 flex-1 flex-col gap-0"
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <PopupHeader version={version} />
        </div>
        <div className="flex shrink-0 gap-1 pt-0.5">
          {tab !== "about" &&
          (screen.mode === "list" ||
            (screen.mode === "form" &&
              screen.formMode === "edit" &&
              screen.id)) ? (
            <IconTooltipButton
              label="Open in web app"
              variant="outline"
              size="sm"
              type="button"
              onClick={onOpenInApp}
            >
              <ExternalLink className="size-4" />
            </IconTooltipButton>
          ) : null}
          <IconTooltipButton
            label="Sign out"
            tooltip={
              <span className="block text-center">
                Sign out
                <span className="text-muted-foreground block text-xs">
                  {sessionEmail}
                </span>
              </span>
            }
            variant="ghost"
            size="sm"
            type="button"
            onClick={onLogout}
          >
            <LogOut className="size-4" />
          </IconTooltipButton>
        </div>
      </div>

      <TabsList className="bg-muted grid h-auto w-full grid-cols-5 gap-0.5 p-1 text-xs">
        <TabIconTrigger value="links" label="Links">
          <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
        </TabIconTrigger>
        <TabIconTrigger value="tasks" label="Tasks">
          <ListTodo className="h-3.5 w-3.5 shrink-0" aria-hidden />
        </TabIconTrigger>
        <TabIconTrigger value="notes" label="Notes">
          <NotebookPen className="h-3.5 w-3.5 shrink-0" aria-hidden />
        </TabIconTrigger>
        <TabIconTrigger value="contacts" label="Contacts">
          <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
        </TabIconTrigger>
        <TabIconTrigger value="about" label="About">
          <BadgeInfo className="h-3.5 w-3.5 shrink-0" aria-hidden />
        </TabIconTrigger>
      </TabsList>

      {screen.mode === "form" ? (
        <div className="flex items-center gap-1 pt-2 pb-1">
          <IconTooltipButton
            label="Back"
            variant="ghost"
            size="sm"
            type="button"
            onClick={onCancelForm}
            disabled={mutationBusy}
          >
            <ArrowLeft className="size-4 -translate-y-px" />
          </IconTooltipButton>
          <h2 className="px-0.5 text-base font-semibold">{title}</h2>
        </div>
      ) : (
        <h2 className="px-0.5 pt-2 pb-1 text-base font-semibold">{title}</h2>
      )}

      <TabsContent
        value="tasks"
        className="mt-0 flex min-h-0 flex-1 flex-col outline-none"
      >
        {entityPanel("tasks")}
      </TabsContent>
      <TabsContent
        value="notes"
        className="mt-0 flex min-h-0 flex-1 flex-col outline-none"
      >
        {entityPanel("notes")}
      </TabsContent>
      <TabsContent
        value="contacts"
        className="mt-0 flex min-h-0 flex-1 flex-col outline-none"
      >
        {entityPanel("contacts")}
      </TabsContent>
      <TabsContent
        value="links"
        className="mt-0 flex min-h-0 flex-1 flex-col outline-none"
      >
        {entityPanel("links")}
      </TabsContent>
      <TabsContent
        value="about"
        className="mt-0 flex min-h-0 flex-1 flex-col outline-none"
      >
        <AboutTab
          themePreference={themePreference}
          onSaveTheme={onSaveTheme}
          paramsPreflight={paramsPreflight}
        />
      </TabsContent>
    </Tabs>
  );
}
