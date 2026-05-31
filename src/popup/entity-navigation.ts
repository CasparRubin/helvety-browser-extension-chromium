import type { EntityKind } from "../lib/entity-types";
import type { EntityTabId } from "./views/DataTabsView";

/**
 *
 */
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

/**
 *
 */
export function entityKindForTab(
  tab: EntityTabId
): Exclude<EntityTabId, "about"> | null {
  if (tab === "about") {
    return null;
  }
  return tab;
}
