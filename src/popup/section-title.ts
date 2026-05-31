import type { EntityScreen } from "./entity-navigation";
import type { EntityKind } from "../lib/entity-types";
import type { EntityTabId } from "./views/DataTabsView";

/**
 *
 */
export function sectionTitle(input: {
  tab: EntityTabId;
  screen: EntityScreen;
}): string {
  const { tab, screen } = input;
  if (tab === "about") {
    return "About";
  }
  if (screen.mode === "form") {
    const kind = screen.kind;
    if (screen.formMode === "create") {
      if (kind === "link_folder") {
        return "New folder";
      }
      if (kind === "tasks") {
        return "New task";
      }
      if (kind === "notes") {
        return "New note";
      }
      if (kind === "contacts") {
        return "New contact";
      }
      if (kind === "links") {
        return "New link";
      }
    }
    return editTitle(kind);
  }
  if (tab === "tasks") {
    return "Tasks";
  }
  if (tab === "notes") {
    return "Notes";
  }
  if (tab === "contacts") {
    return "Contacts";
  }
  if (tab === "links") {
    return "Links";
  }
  return "Helvety";
}

/**
 *
 */
function editTitle(kind: EntityKind): string {
  switch (kind) {
    case "tasks":
      return "Edit task";
    case "notes":
      return "Edit note";
    case "contacts":
      return "Edit contact";
    case "links":
      return "Edit link";
    case "link_folder":
      return "Edit folder";
  }
}
