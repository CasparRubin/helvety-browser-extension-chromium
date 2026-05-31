import { renderIcon } from "@helvety/ui/icon-renderer";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import React, { useState } from "react";

import type { CatalogEntry } from "../../../lib/entity-catalogs";

/** Collapsible stage group header (extension side panel, no DnD). */
export function StageGroup({
  stage,
  count,
  children,
}: {
  stage: CatalogEntry;
  count: number;
  children: React.ReactNode;
}): React.JSX.Element {
  const [isCollapsed, setIsCollapsed] = useState(
    stage.default_rows_shown === 0
  );
  const [isShowingAll, setIsShowingAll] = useState(false);

  const childrenArray = React.Children.toArray(children);
  const shouldLimitRows =
    stage.default_rows_shown > 0 &&
    count > stage.default_rows_shown &&
    !isShowingAll;
  const visibleChildren = shouldLimitRows
    ? childrenArray.slice(0, stage.default_rows_shown)
    : childrenArray;
  const hiddenCount = shouldLimitRows ? count - stage.default_rows_shown : 0;

  return (
    <div className="mb-2">
      <button
        type="button"
        className="hover:bg-muted/40 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors"
        style={{ backgroundColor: `${stage.color}14` }}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? (
          <ChevronRightIcon className="text-muted-foreground size-4 shrink-0" />
        ) : (
          <ChevronDownIcon className="text-muted-foreground size-4 shrink-0" />
        )}
        {renderIcon(stage.icon, "size-4 shrink-0", {
          color: stage.color ?? "var(--muted-foreground)",
        })}
        <span className="min-w-0 truncate text-sm font-medium">
          {stage.name}
        </span>
        <span className="text-muted-foreground text-xs">({count})</span>
      </button>
      {!isCollapsed && (
        <div
          className="border-border ml-2 min-w-0 border-l-2"
          style={{ borderLeftColor: stage.color }}
        >
          {visibleChildren}
          {shouldLimitRows ? (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground w-full py-2 pl-4 text-left text-xs transition-colors"
              onClick={() => setIsShowingAll(true)}
            >
              Show all ({hiddenCount} more)
            </button>
          ) : null}
          {isShowingAll && count > stage.default_rows_shown ? (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground w-full py-2 pl-4 text-left text-xs transition-colors"
              onClick={() => setIsShowingAll(false)}
            >
              Show less
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

/** Category group (notes + contacts). */
export function CategoryGroup({
  category,
  count,
  children,
}: {
  category: CatalogEntry;
  count: number;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <StageGroup stage={category} count={count}>
      {children}
    </StageGroup>
  );
}
