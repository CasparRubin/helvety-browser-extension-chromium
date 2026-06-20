import type { LinkFolderListRow, LinkListRow } from "./entity-types";

function sortByOrder<T extends { sort_order: number; created_at: string }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    if (a.sort_order !== b.sort_order) {
      return a.sort_order - b.sort_order;
    }
    return b.created_at.localeCompare(a.created_at);
  });
}

export function getLinkTreeChildren(
  folders: LinkFolderListRow[],
  links: LinkListRow[],
  parentFolderId: string | null
): { folders: LinkFolderListRow[]; links: LinkListRow[] } {
  const childFolders = folders.filter(
    (f) => (f.parent_folder_id ?? null) === parentFolderId
  );
  const childLinks = links.filter(
    (l) => (l.folder_id ?? null) === parentFolderId
  );
  return {
    folders: sortByOrder(childFolders),
    links: sortByOrder(childLinks),
  };
}
