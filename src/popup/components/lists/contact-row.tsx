import {
  ChevronDownIcon,
  ChevronUpIcon,
  TrashIcon,
  UserIcon,
} from "lucide-react";
import { memo } from "react";

import { IconTooltipButton } from "../IconTooltipButton";

/** Single contact row (mobile layout). */
export const ContactRow = memo(
  ({
    firstName,
    lastName,
    accentColor,
    isFirst,
    isLast,
    onClick,
    onDelete,
    onMoveUp,
    onMoveDown,
  }: {
    firstName: string;
    lastName: string;
    accentColor?: string;
    isFirst?: boolean;
    isLast?: boolean;
    onClick?: () => void;
    onDelete?: () => void;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
  }): React.JSX.Element => {
    const displayName = `${firstName} ${lastName}`.trim() || "Contact";
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
        <UserIcon
          className="size-4 shrink-0"
          style={accentColor ? { color: accentColor } : undefined}
        />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {displayName}
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
                <ChevronUpIcon className="size-4" />
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
                <ChevronDownIcon className="size-4" />
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
              <TrashIcon className="size-4" />
            </IconTooltipButton>
          ) : null}
        </div>
      </div>
    );
  }
);
