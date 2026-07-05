import { cn } from "@helvety/shared/utils";
import { ICON_SIZE_CLASS } from "@helvety/ui/icon-size";
import {
  BoxIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Trash2Icon,
} from "lucide-react";
import { memo } from "react";

import { IconTooltipButton } from "../IconTooltipButton";

/** Single task/note row (mobile layout, matches web apps). */
export const EntityRow = memo(
  ({
    title,
    accentColor,
    isFirst,
    isLast,
    onClick,
    onDelete,
    onMoveUp,
    onMoveDown,
  }: {
    title: string;
    accentColor?: string;
    isFirst?: boolean;
    isLast?: boolean;
    onClick?: () => void;
    onDelete?: () => void;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
  }): React.JSX.Element => {
    return (
      <div
        role="button"
        tabIndex={0}
        className="group border-border hover:bg-muted/40 flex cursor-pointer items-center gap-2 overflow-hidden border-b px-3 py-2.5 transition-colors [contain-intrinsic-size:auto_52px] last:border-b-0"
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick?.();
          }
        }}
      >
        <BoxIcon
          className={cn(ICON_SIZE_CLASS, "shrink-0")}
          style={accentColor ? { color: accentColor } : undefined}
        />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {title}
        </span>
        <div className="flex shrink-0 items-center gap-0.5">
          {(onMoveUp ?? onMoveDown) && (
            <div className="flex items-center gap-0.5">
              <IconTooltipButton
                label="Move up"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground size-7"
                disabled={isFirst}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp?.();
                }}
              >
                <ChevronUpIcon className={ICON_SIZE_CLASS} />
              </IconTooltipButton>
              <IconTooltipButton
                label="Move down"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground size-7"
                disabled={isLast}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown?.();
                }}
              >
                <ChevronDownIcon className={ICON_SIZE_CLASS} />
              </IconTooltipButton>
            </div>
          )}
          {onDelete ? (
            <IconTooltipButton
              label="Delete"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2Icon className={ICON_SIZE_CLASS} />
            </IconTooltipButton>
          ) : null}
        </div>
      </div>
    );
  }
);
