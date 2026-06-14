import {
  ListEmptyState,
  ListErrorState,
  ListLoadingState,
} from "@helvety/ui/list-states";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Folder,
  Link2,
  Pencil,
} from "lucide-react";
import { useCallback, useState } from "react";

import { getLinkTreeChildren } from "../../../lib/link-tree";
import { normalizeBookmarkUrl } from "../../../lib/link-url-normalize";
import { IconTooltipButton } from "../IconTooltipButton";

import { swapSiblingSortOrder } from "./list-group-utils";

import type { LinkFolderListRow, LinkListRow } from "../../../lib/entity-types";

/**
 *
 */
function openNormalizedLink(url: string): void {
  const result = normalizeBookmarkUrl(url);
  if (!result.ok) {
    return;
  }
  void chrome.tabs.create({ url: result.url });
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
  onReorderLinks,
  onReorderFolders,
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
  onReorderLinks: (
    updates: { id: string; sort_order: number }[]
  ) => void | Promise<void>;
  onReorderFolders: (
    updates: { id: string; sort_order: number }[]
  ) => void | Promise<void>;
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
        {childFolders.map((folder, folderIndex) => {
          const isOpen = expanded.has(folder.id);
          const hasChildren =
            getLinkTreeChildren(folders, links, folder.id).folders.length > 0 ||
            getLinkTreeChildren(folders, links, folder.id).links.length > 0;
          const isFirstFolder = folderIndex === 0;
          const isLastFolder = folderIndex === childFolders.length - 1;
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
                <div className="flex shrink-0 items-center gap-0.5">
                  {childFolders.length > 1 ? (
                    <>
                      <IconTooltipButton
                        label="Move up"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground size-7"
                        disabled={isFirstFolder}
                        onClick={() => {
                          const updates = swapSiblingSortOrder(
                            childFolders,
                            folder.id,
                            "up"
                          );
                          if (updates.length > 0) {
                            void onReorderFolders(updates);
                          }
                        }}
                      >
                        <ChevronUp className="size-4" />
                      </IconTooltipButton>
                      <IconTooltipButton
                        label="Move down"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground size-7"
                        disabled={isLastFolder}
                        onClick={() => {
                          const updates = swapSiblingSortOrder(
                            childFolders,
                            folder.id,
                            "down"
                          );
                          if (updates.length > 0) {
                            void onReorderFolders(updates);
                          }
                        }}
                      >
                        <ChevronDown className="size-4" />
                      </IconTooltipButton>
                    </>
                  ) : null}
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
              </div>
              {isOpen ? renderLevel(folder.id, depth + 1) : null}
            </div>
          );
        })}
        {childLinks.map((link, linkIndex) => {
          const isFirstLink = linkIndex === 0;
          const isLastLink = linkIndex === childLinks.length - 1;
          return (
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
                onClick={() => openNormalizedLink(link.url)}
              >
                <span className="truncate">{link.name}</span>
              </IconTooltipButton>
              <div className="flex shrink-0 items-center gap-0.5">
                {childLinks.length > 1 ? (
                  <>
                    <IconTooltipButton
                      label="Move up"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground size-7"
                      disabled={isFirstLink}
                      onClick={() => {
                        const updates = swapSiblingSortOrder(
                          childLinks,
                          link.id,
                          "up"
                        );
                        if (updates.length > 0) {
                          void onReorderLinks(updates);
                        }
                      }}
                    >
                      <ChevronUp className="size-4" />
                    </IconTooltipButton>
                    <IconTooltipButton
                      label="Move down"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground size-7"
                      disabled={isLastLink}
                      onClick={() => {
                        const updates = swapSiblingSortOrder(
                          childLinks,
                          link.id,
                          "down"
                        );
                        if (updates.length > 0) {
                          void onReorderLinks(updates);
                        }
                      }}
                    >
                      <ChevronDown className="size-4" />
                    </IconTooltipButton>
                  </>
                ) : null}
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
            </div>
          );
        })}
      </>
    );
  };

  return (
    <div className="border-border overflow-hidden rounded-none border">
      {renderLevel(null, 0)}
    </div>
  );
}
