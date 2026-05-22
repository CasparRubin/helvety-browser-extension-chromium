import type { EntityKind } from "../lib/entity-types";
import type { EntityTabId } from "./views/DataTabsView";

/**
 *
 */
export type EntityScreen =
  | { mode: "list" }
  | { mode: "detail"; kind: EntityKind; id: string }
  | {
      mode: "form";
      kind: EntityKind;
      formMode: "create" | "edit";
      id?: string;
    };

/**
 *
 */
export type LinksSection = "links" | "folders";

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

/**
 *
 */
