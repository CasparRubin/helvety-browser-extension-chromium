import {
  ListEmptyState,
  ListErrorState,
  ListLoadingState,
} from "@helvety/ui/list-states";
import { ChevronRight, Folder, Link2, Pencil } from "lucide-react";
import { useCallback, useState } from "react";

import { getLinkTreeChildren } from "../../../lib/link-tree";
import { IconTooltipButton } from "../IconTooltipButton";

import type { LinkFolderListRow, LinkListRow } from "../../../lib/entity-types";

/**
 *
 */
function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 *
 */
export function LinksTreeList({
  folders,
  links,
  isLoading,
  error,
  emptyTitle,
  emptyDescription,
  onRetry,
  onLinkEdit,
  onFolderEdit,
}: {
  folders: LinkFolderListRow[];
  links: LinkListRow[];
  isLoading: boolean;
  error: string | null;
  emptyTitle: string;
  emptyDescription: string;
  onRetry?: () => void;
  onLinkEdit: (link: LinkListRow) => void;
  onFolderEdit: (folder: LinkFolderListRow) => void;
}): React.JSX.Element {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const toggleExpanded = useCallback((folderId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  if (isLoading) {
    return <ListLoadingState message="Loading…" />;
  }
  if (error) {
    return <ListErrorState message={error} onRetry={onRetry} />;
  }
  if (folders.length === 0 && links.length === 0) {
    return <ListEmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const renderLevel = (
    parentId: string | null,
    depth: number
  ): React.ReactNode => {
    const { folders: childFolders, links: childLinks } = getLinkTreeChildren(
      folders,
      links,
      parentId
    );
    return (
      <>
        {childFolders.map((folder) => {
          const isOpen = expanded.has(folder.id);
          const hasChildren =
            getLinkTreeChildren(folders, links, folder.id).folders.length > 0 ||
            getLinkTreeChildren(folders, links, folder.id).links.length > 0;
          return (
            <div key={folder.id}>
              <div
                className="border-border flex items-center gap-1 border-b px-2 py-2.5 sm:px-3"
                style={{ paddingLeft: `${8 + depth * 12}px` }}
              >
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground flex size-7 shrink-0 items-center justify-center"
                  aria-label={isOpen ? "Collapse folder" : "Expand folder"}
                  onClick={() => toggleExpanded(folder.id)}
                  disabled={!hasChildren}
                >
                  {hasChildren ? (
                    <ChevronRight
                      className={`size-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
                    />
                  ) : (
                    <span className="size-4" />
                  )}
                </button>
                <Folder className="text-muted-foreground size-4 shrink-0" />
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-sm font-medium hover:underline"
                  onClick={() => onFolderEdit(folder)}
                >
                  {folder.name}
                </button>
                <IconTooltipButton
                  label="Edit folder"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground size-7 shrink-0"
                  onClick={() => onFolderEdit(folder)}
                >
                  <Pencil className="size-3.5" />
                </IconTooltipButton>
              </div>
              {isOpen ? renderLevel(folder.id, depth + 1) : null}
            </div>
          );
        })}
        {childLinks.map((link) => (
          <div
            key={link.id}
            className="border-border flex items-center gap-2 border-b px-2 py-2.5 sm:px-3"
            style={{ paddingLeft: `${8 + depth * 12 + 28}px` }}
          >
            <Link2 className="text-muted-foreground size-4 shrink-0" />
            <IconTooltipButton
              label="Open link"
              variant="ghost"
              size="sm"
              className="min-w-0 flex-1 justify-start truncate px-0 text-left text-sm font-medium hover:underline"
              onClick={() => {
                void chrome.tabs.create({ url: normalizeUrl(link.url) });
              }}
            >
              <span className="truncate">{link.name}</span>
            </IconTooltipButton>
            <IconTooltipButton
              label="Edit link"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground size-7 shrink-0"
              onClick={() => onLinkEdit(link)}
            >
              <Pencil className="size-3.5" />
            </IconTooltipButton>
          </div>
        ))}
      </>
    );
  };

  return (
    <div className="border-border overflow-hidden rounded-none border">
      {renderLevel(null, 0)}
    </div>
  );
}
