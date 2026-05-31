/** Fixed catalog entry for selects in the extension side panel. */
export interface CatalogEntry {
  id: string;
  name: string;
}

export const CONTACT_CATEGORIES: CatalogEntry[] = [
  { id: "personal", name: "Personal" },
  { id: "work", name: "Work" },
  { id: "other", name: "Other" },
];

export const NOTE_CATEGORIES: CatalogEntry[] = [
  { id: "personal", name: "Personal" },
  { id: "work", name: "Work" },
  { id: "other", name: "Other" },
];

export const TASK_STAGES: CatalogEntry[] = [
  { id: "default-item-backlog", name: "Backlog" },
  { id: "default-item-discovery", name: "Discovery" },
  { id: "default-item-ready", name: "Ready" },
  { id: "default-item-progress", name: "In Progress" },
  { id: "default-item-testing", name: "Testing" },
  { id: "default-item-acceptance", name: "Acceptance" },
  { id: "default-item-completed", name: "Completed" },
  { id: "default-item-void", name: "The Void" },
];

export const TASK_LABELS: CatalogEntry[] = [
  { id: "default-label-bug", name: "Bug" },
  { id: "default-label-change-request", name: "Change Request" },
  { id: "default-label-feature", name: "Feature" },
  { id: "default-label-improvement", name: "Improvement" },
  { id: "default-label-internal-task", name: "Internal Task" },
  { id: "default-item-label", name: "Default" },
];

export const TASK_PRIORITIES: CatalogEntry[] = [
  { id: "0", name: "None" },
  { id: "1", name: "Low" },
  { id: "2", name: "Medium" },
  { id: "3", name: "High" },
];

/**
 *
 */
export function catalogName(entries: CatalogEntry[], id: string): string {
  return entries.find((e) => e.id === id)?.name ?? id;
}
