/** Catalog entry with display metadata (sync with monorepo default-* config files). */
export interface CatalogEntry {
  id: string;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
  default_rows_shown: number;
}

/** Simple id/name pairs for priority and other compact catalog arrays. */
export interface CatalogEntryLite {
  id: string;
  name: string;
}

export const TASK_STAGES: CatalogEntry[] = [
  {
    id: "default-item-backlog",
    name: "Backlog",
    color: "#64748b",
    icon: "inbox",
    sort_order: 0,
    default_rows_shown: 5,
  },
  {
    id: "default-item-discovery",
    name: "Discovery",
    color: "#8b5cf6",
    icon: "search",
    sort_order: 1,
    default_rows_shown: 20,
  },
  {
    id: "default-item-ready",
    name: "Ready",
    color: "#06b6d4",
    icon: "clock-arrow-down",
    sort_order: 2,
    default_rows_shown: 20,
  },
  {
    id: "default-item-progress",
    name: "In Progress",
    color: "#eab308",
    icon: "loader",
    sort_order: 3,
    default_rows_shown: 20,
  },
  {
    id: "default-item-testing",
    name: "Testing",
    color: "#d946ef",
    icon: "flask-conical",
    sort_order: 4,
    default_rows_shown: 20,
  },
  {
    id: "default-item-acceptance",
    name: "Acceptance",
    color: "#ec4899",
    icon: "thumbs-up",
    sort_order: 5,
    default_rows_shown: 20,
  },
  {
    id: "default-item-completed",
    name: "Completed",
    color: "#10b981",
    icon: "check-circle",
    sort_order: 6,
    default_rows_shown: 5,
  },
  {
    id: "default-item-void",
    name: "The Void",
    color: "#581c87",
    icon: "circle-off",
    sort_order: 7,
    default_rows_shown: 0,
  },
];

export const NOTE_CATEGORIES: CatalogEntry[] = [
  {
    id: "personal",
    name: "Personal",
    color: "#3b82f6",
    icon: "heart",
    sort_order: 0,
    default_rows_shown: 20,
  },
  {
    id: "work",
    name: "Work",
    color: "#f59e0b",
    icon: "briefcase",
    sort_order: 1,
    default_rows_shown: 20,
  },
  {
    id: "other",
    name: "Other",
    color: "#6b7280",
    icon: "tag",
    sort_order: 2,
    default_rows_shown: 20,
  },
];

export const CONTACT_CATEGORIES: CatalogEntry[] = NOTE_CATEGORIES;

export const TASK_LABELS: CatalogEntry[] = [
  {
    id: "default-label-bug",
    name: "Bug",
    color: "#f87171",
    icon: "bug",
    sort_order: 0,
    default_rows_shown: 20,
  },
  {
    id: "default-label-change-request",
    name: "Change Request",
    color: "#fb923c",
    icon: "refresh-cw",
    sort_order: 1,
    default_rows_shown: 20,
  },
  {
    id: "default-label-feature",
    name: "Feature",
    color: "#4ade80",
    icon: "star",
    sort_order: 2,
    default_rows_shown: 20,
  },
  {
    id: "default-label-improvement",
    name: "Improvement",
    color: "#60a5fa",
    icon: "trending-up",
    sort_order: 3,
    default_rows_shown: 20,
  },
  {
    id: "default-label-internal-task",
    name: "Internal Task",
    color: "#a78bfa",
    icon: "briefcase",
    sort_order: 4,
    default_rows_shown: 20,
  },
];

export const TASK_PRIORITIES: CatalogEntryLite[] = [
  { id: "0", name: "Low" },
  { id: "1", name: "Normal" },
  { id: "2", name: "High" },
  { id: "3", name: "Urgent" },
];

export const PRIORITY_COLORS: Record<number, string> = {
  0: "#4b5563",
  1: "#2563eb",
  2: "#d97706",
  3: "#dc2626",
};

/** Finds a catalog entry by id. */
function catalogById(
  entries: CatalogEntry[],
  id: string
): CatalogEntry | undefined {
  return entries.find((e) => e.id === id);
}

/** Returns a catalog entry color by id. */
export function catalogColor(
  entries: CatalogEntry[],
  id: string
): string | undefined {
  return catalogById(entries, id)?.color;
}
