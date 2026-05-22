import {
  POPUP_TAB_TRIGGER_ICON_CLASS,
  TAB_PANEL_CLASS,
} from "@helvety/extension-chrome/popup-shell";
import { Button } from "@helvety/ui/button";
import { Card, CardContent } from "@helvety/ui/card";
import {
  ListEmptyState,
  ListErrorState,
  ListLoadingState,
} from "@helvety/ui/list-states";
import { ScrollArea } from "@helvety/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@helvety/ui/tabs";
import {
  BadgeInfo,
  ExternalLink,
  Link2,
  ListTodo,
  LogOut,
  StickyNote,
  Users,
} from "lucide-react";

import { PopupHeader } from "../components/PopupHeader";

import { AboutTab } from "./AboutTab";

import type { ParamsPreflight } from "./UnlockView";
import type { ThemePreference } from "@helvety/extension-chrome/theme-preference";

/**
 *
 */
export type EntityTabId = "tasks" | "notes" | "contacts" | "links" | "about";

/**
 *
 */
export function DataTabsView({
  version,
  sessionEmail,
  tab,
  onTabChange,
  listBusy,
  listError,
  currentList,
  themePreference,
  onSaveTheme,
  paramsPreflight,
  onOpenInApp,
  onLogout,
  onRetryList,
}: {
  version: string;
  sessionEmail: string;
  tab: EntityTabId;
  onTabChange: (tab: EntityTabId) => void;
  listBusy: boolean;
  listError: string | null;
  currentList: { id: string; title: string }[];
  themePreference: ThemePreference;
  onSaveTheme: (next: ThemePreference) => void;
  paramsPreflight: ParamsPreflight | null;
  onOpenInApp: () => void;
  onLogout: () => void;
  onRetryList: () => void;
}): React.JSX.Element {
  const emptyTitle =
    tab === "tasks"
      ? "No tasks yet"
      : tab === "notes"
        ? "No notes yet"
        : tab === "contacts"
          ? "No contacts yet"
          : "No links yet";

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
      className="flex flex-col gap-0"
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <PopupHeader version={version} />
          <p className="text-muted-foreground -mt-1 truncate px-0.5 text-xs">
            {sessionEmail}
          </p>
        </div>
        <div className="flex shrink-0 gap-1 pt-0.5">
          {tab !== "about" ? (
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

      <TabsContent value="tasks" className="mt-2 outline-none">
        <EntityListPanel
          listBusy={listBusy}
          listError={listError}
          currentList={currentList}
          emptyTitle={emptyTitle}
          onRetryList={onRetryList}
        />
      </TabsContent>
      <TabsContent value="notes" className="mt-2 outline-none">
        <EntityListPanel
          listBusy={listBusy}
          listError={listError}
          currentList={currentList}
          emptyTitle={emptyTitle}
          onRetryList={onRetryList}
        />
      </TabsContent>
      <TabsContent value="contacts" className="mt-2 outline-none">
        <EntityListPanel
          listBusy={listBusy}
          listError={listError}
          currentList={currentList}
          emptyTitle={emptyTitle}
          onRetryList={onRetryList}
        />
      </TabsContent>
      <TabsContent value="links" className="mt-2 outline-none">
        <EntityListPanel
          listBusy={listBusy}
          listError={listError}
          currentList={currentList}
          emptyTitle={emptyTitle}
          onRetryList={onRetryList}
        />
      </TabsContent>
      <TabsContent value="about" className="mt-2 outline-none">
        <AboutTab
          themePreference={themePreference}
          onSaveTheme={onSaveTheme}
          paramsPreflight={paramsPreflight}
        />
      </TabsContent>
    </Tabs>
  );
}

/**
 *
 */
function EntityListPanel({
  listBusy,
  listError,
  currentList,
  emptyTitle,
  onRetryList,
}: {
  listBusy: boolean;
  listError: string | null;
  currentList: { id: string; title: string }[];
  emptyTitle: string;
  onRetryList: () => void;
}): React.JSX.Element {
  return (
    <div className={TAB_PANEL_CLASS}>
      {listBusy ? (
        <ListLoadingState message="Loading…" />
      ) : listError ? (
        <ListErrorState message={listError} onRetry={onRetryList} />
      ) : currentList.length === 0 ? (
        <ListEmptyState
          title={emptyTitle}
          description="Create records in the web app, then open this tab again."
        />
      ) : (
        <ScrollArea className="h-full pr-1">
          <ul className="flex flex-col gap-1 pb-2">
            {currentList.map((row) => (
              <li key={row.id}>
                <Card className="border-0 shadow-none">
                  <CardContent className="px-3 py-2">
                    <p className="text-sm leading-snug">{row.title}</p>
                    <p className="text-muted-foreground font-mono text-[10px]">
                      {row.id}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
    </div>
  );
}
