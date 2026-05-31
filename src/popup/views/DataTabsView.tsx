import { POPUP_TAB_TRIGGER_ICON_CLASS } from "@helvety/extension-chrome/popup-shell";
import { Button } from "@helvety/ui/button";
import {
  ListEmptyState,
  ListErrorState,
  ListLoadingState,
} from "@helvety/ui/list-states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@helvety/ui/tabs";
import {
  BadgeInfo,
  ExternalLink,
  Folder,
  Link2,
  ListTodo,
  LogOut,
  Plus,
  StickyNote,
  Users,
} from "lucide-react";

import { EntityScreenLayout } from "../components/EntityScreenLayout";
import { PopupHeader } from "../components/PopupHeader";

import { AboutTab } from "./AboutTab";
import { EntityDetailView } from "./EntityDetailView";
import { EntityFormView, type EntityFormDraft } from "./EntityFormView";

import type { ParamsPreflight } from "./UnlockView";
import type { EntityListItem, EntityRecord } from "../../lib/entity-types";
import type { EntityScreen, LinksSection } from "../entity-navigation";
import type { ThemePreference } from "@helvety/extension-chrome/theme-preference";

/** Main entity tabs after unlock (tasks, notes, contacts, links, about). */
export type EntityTabId = "tasks" | "notes" | "contacts" | "links" | "about";

/** Tabbed shell: entity lists, detail, forms, and about/settings. */
export function DataTabsView({
  version,
  sessionEmail,
  tab,
  onTabChange,
  linksSection,
  onLinksSectionChange,
  screen,
  listBusy,
  listError,
  currentList,
  linkFolders,
  detailRecord,
  detailBusy,
  detailError,
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
  onRowClick,
  onBack,
  onRetryDetail,
  onEdit,
  onDelete,
  onOpenInAppDetail,
  onSave,
  onCancelForm,
}: {
  version: string;
  sessionEmail: string;
  tab: EntityTabId;
  onTabChange: (tab: EntityTabId) => void;
  linksSection: LinksSection;
  onLinksSectionChange: (section: LinksSection) => void;
  screen: EntityScreen;
  listBusy: boolean;
  listError: string | null;
  currentList: EntityListItem[];
  linkFolders: EntityListItem[];
  detailRecord: EntityRecord | null;
  detailBusy: boolean;
  detailError: string | null;
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
  onRowClick: (id: string) => void;
  onBack: () => void;
  onRetryDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenInAppDetail: () => void;
  onSave: () => void;
  onCancelForm: () => void;
}): React.JSX.Element {
  const emptyTitle =
    tab === "tasks"
      ? "No tasks yet"
      : tab === "notes"
        ? "No notes yet"
        : tab === "contacts"
          ? "No contacts yet"
          : tab === "links" && linksSection === "folders"
            ? "No folders yet"
            : "No links yet";

  const emptyDescription = "Add one with the button below, or use the web app.";

  const entityPanel = (entityTab: Exclude<EntityTabId, "about">) => {
    const showDetail =
      screen.mode === "detail" &&
      tab === entityTab &&
      (entityTab !== "links" ||
        (screen.kind === "link_folder"
          ? linksSection === "folders"
          : linksSection === "links"));
    const showForm =
      screen.mode === "form" &&
      tab === entityTab &&
      (entityTab !== "links" ||
        (screen.kind === "link_folder"
          ? linksSection === "folders"
          : linksSection === "links"));

    if (showForm && formDraft) {
      return (
        <EntityFormView
          kind={screen.kind}
          formMode={screen.formMode}
          draft={formDraft}
          onDraftChange={onFormDraftChange}
          linkFolders={linkFolders}
          editingFolderId={
            screen.kind === "link_folder" ? screen.id : undefined
          }
          mutationBusy={mutationBusy}
          mutationError={mutationError}
          onSave={onSave}
          onCancel={onCancelForm}
        />
      );
    }

    if (showDetail) {
      if (detailBusy || (!detailRecord && !detailError)) {
        return (
          <EntityScreenLayout>
            <div aria-live="polite">
              <ListLoadingState message="Loading…" />
            </div>
          </EntityScreenLayout>
        );
      }
      if (detailError) {
        return (
          <EntityScreenLayout>
            <ListErrorState message={detailError} onRetry={onRetryDetail} />
          </EntityScreenLayout>
        );
      }
      if (!detailRecord) {
        return null;
      }
      return (
        <EntityDetailView
          kind={screen.kind}
          record={detailRecord}
          linkFolders={linkFolders}
          mutationError={mutationError}
          onBack={onBack}
          onEdit={onEdit}
          onDelete={onDelete}
          onOpenInApp={onOpenInAppDetail}
        />
      );
    }

    return (
      <EntityListPanel
        listBusy={listBusy}
        listError={listError}
        currentList={currentList}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        onRetryList={onRetryList}
        onAdd={onAdd}
        onRowClick={onRowClick}
        linksSection={entityTab === "links" ? linksSection : undefined}
        onLinksSectionChange={
          entityTab === "links" ? onLinksSectionChange : undefined
        }
      />
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
          <p className="text-muted-foreground -mt-1 truncate px-0.5 text-xs">
            {sessionEmail}
          </p>
        </div>
        <div className="flex shrink-0 gap-1 pt-0.5">
          {tab !== "about" && screen.mode === "list" ? (
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={onOpenInApp}
            >
              <ExternalLink className="size-4" />
              <span className="sr-only">Open in web app</span>
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" type="button" onClick={onLogout}>
            <LogOut className="size-4" />
            <span className="sr-only">Sign out</span>
          </Button>
        </div>
      </div>

      <TabsList className="bg-muted grid h-auto w-full grid-cols-5 gap-0.5 p-1 text-xs">
        <TabsTrigger
          value="tasks"
          className={POPUP_TAB_TRIGGER_ICON_CLASS}
          aria-label="Tasks"
        >
          <ListTodo className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="sr-only">Tasks</span>
        </TabsTrigger>
        <TabsTrigger
          value="notes"
          className={POPUP_TAB_TRIGGER_ICON_CLASS}
          aria-label="Notes"
        >
          <StickyNote className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="sr-only">Notes</span>
        </TabsTrigger>
        <TabsTrigger
          value="contacts"
          className={POPUP_TAB_TRIGGER_ICON_CLASS}
          aria-label="Contacts"
        >
          <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="sr-only">Contacts</span>
        </TabsTrigger>
        <TabsTrigger
          value="links"
          className={POPUP_TAB_TRIGGER_ICON_CLASS}
          aria-label="Links"
        >
          <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="sr-only">Links</span>
        </TabsTrigger>
        <TabsTrigger
          value="about"
          className={POPUP_TAB_TRIGGER_ICON_CLASS}
          aria-label="About"
        >
          <BadgeInfo className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="sr-only">About</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value="tasks"
        className="mt-2 flex min-h-0 flex-1 flex-col outline-none"
      >
        {entityPanel("tasks")}
      </TabsContent>
      <TabsContent
        value="notes"
        className="mt-2 flex min-h-0 flex-1 flex-col outline-none"
      >
        {entityPanel("notes")}
      </TabsContent>
      <TabsContent
        value="contacts"
        className="mt-2 flex min-h-0 flex-1 flex-col outline-none"
      >
        {entityPanel("contacts")}
      </TabsContent>
      <TabsContent
        value="links"
        className="mt-2 flex min-h-0 flex-1 flex-col outline-none"
      >
        {entityPanel("links")}
      </TabsContent>
      <TabsContent
        value="about"
        className="mt-2 flex min-h-0 flex-1 flex-col outline-none"
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

/** Scrollable list with optional links/folders toggle and Add action. */
function EntityListPanel({
  listBusy,
  listError,
  currentList,
  emptyTitle,
  emptyDescription,
  onRetryList,
  onAdd,
  onRowClick,
  linksSection,
  onLinksSectionChange,
}: {
  listBusy: boolean;
  listError: string | null;
  currentList: EntityListItem[];
  emptyTitle: string;
  emptyDescription: string;
  onRetryList: () => void;
  onAdd: () => void;
  onRowClick: (id: string) => void;
  linksSection?: LinksSection;
  onLinksSectionChange?: (section: LinksSection) => void;
}): React.JSX.Element {
  const linksToggle =
    linksSection !== undefined && onLinksSectionChange ? (
      <div className="bg-muted flex gap-0.5 rounded-none p-0.5">
        <Button
          type="button"
          size="sm"
          variant={linksSection === "links" ? "default" : "ghost"}
          className="h-7 flex-1 rounded-none text-xs"
          aria-pressed={linksSection === "links"}
          onClick={() => onLinksSectionChange("links")}
        >
          <Link2 className="size-3.5" />
          Links
        </Button>
        <Button
          type="button"
          size="sm"
          variant={linksSection === "folders" ? "default" : "ghost"}
          className="h-7 flex-1 rounded-none text-xs"
          aria-pressed={linksSection === "folders"}
          onClick={() => onLinksSectionChange("folders")}
        >
          <Folder className="size-3.5" />
          Folders
        </Button>
      </div>
    ) : null;

  return (
    <EntityScreenLayout
      header={
        linksToggle ? <div className="pb-2">{linksToggle}</div> : undefined
      }
      footer={
        <Button type="button" size="sm" className="w-full" onClick={onAdd}>
          <Plus className="size-4" />
          Add
        </Button>
      }
    >
      <div aria-live="polite">
        {listBusy ? (
          <ListLoadingState message="Loading…" />
        ) : listError ? (
          <ListErrorState message={listError} onRetry={onRetryList} />
        ) : currentList.length === 0 ? (
          <ListEmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          <div className="border-border overflow-hidden rounded-none border">
            <ul>
              {currentList.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className="hover:bg-muted/60 border-border w-full rounded-none border-b px-3 py-2.5 text-left transition-colors last:border-b-0"
                    aria-label={row.title}
                    onClick={() => onRowClick(row.id)}
                  >
                    <p className="truncate text-sm font-medium">{row.title}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </EntityScreenLayout>
  );
}
