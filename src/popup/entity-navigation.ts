import type { EntityKind } from "../lib/entity-types";
import type { EntityTabId } from "./views/DataTabsView";

/** List vs create/edit form routing for one entity kind in the side panel. */
export type EntityScreen =
  | { mode: "list" }
  | {
      mode: "form";
      kind: EntityKind;
      formMode: "create" | "edit";
      id?: string;
      loading?: boolean;
      loadError?: string | null;
    };

/** React key for TipTap in entity forms; stable while editing one record. */
export function entityFormSessionKey(screen: EntityScreen): string {
  if (screen.mode !== "form") {
    return "";
  }
  const id = screen.formMode === "edit" && screen.id ? screen.id : "new";
  return `${screen.kind}-${screen.formMode}-${id}`;
}

/** Map a main tab id to its entity kind (`about` → null). */
export function entityKindForTab(
  tab: EntityTabId
): Exclude<EntityTabId, "about"> | null {
  if (tab === "about") {
    return null;
  }
  return tab;
}
