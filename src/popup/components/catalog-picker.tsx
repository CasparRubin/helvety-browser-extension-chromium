import {
  PRIORITY_COLORS,
  TASK_LABELS,
  TASK_PRIORITIES,
  TASK_STAGES,
  type CatalogEntry,
} from "@helvety/shared/e2ee-entity-catalogs";
import { cn } from "@helvety/shared/utils";
import { Button } from "@helvety/ui/button";
import { renderIcon } from "@helvety/ui/icon-renderer";
import {
  ArrowDownIcon,
  AlertTriangleIcon,
  ArrowUpIcon,
  MinusIcon,
} from "lucide-react";

const PRIORITY_ICONS = [
  ArrowDownIcon,
  MinusIcon,
  ArrowUpIcon,
  AlertTriangleIcon,
] as const;

/**
 *
 */
type CatalogPickerEntry = Pick<CatalogEntry, "id" | "name" | "color" | "icon">;

/**
 *
 */
function CatalogPicker({
  label,
  entries,
  value,
  onChange,
}: {
  label: string;
  entries: readonly CatalogPickerEntry[];
  value: string;
  onChange: (id: string) => void;
}): React.JSX.Element {
  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {entries.map((entry) => {
          const selected = entry.id === value;
          return (
            <Button
              key={entry.id}
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "h-auto gap-1.5 px-2 py-1 text-xs font-medium",
                selected ? "border-transparent" : ""
              )}
              style={
                selected
                  ? { backgroundColor: `${entry.color}18`, color: entry.color }
                  : undefined
              }
              onClick={() => onChange(entry.id)}
            >
              {renderIcon(entry.icon, "size-3.5 shrink-0", {
                color: entry.color,
              })}
              {entry.name}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

/**
 *
 */
export function TaskStagePicker(props: {
  value: string;
  onChange: (id: string) => void;
}): React.JSX.Element {
  return <CatalogPicker label="Stage" entries={TASK_STAGES} {...props} />;
}

/**
 *
 */
export function TaskLabelPicker(props: {
  value: string;
  onChange: (id: string) => void;
}): React.JSX.Element {
  return <CatalogPicker label="Label" entries={TASK_LABELS} {...props} />;
}

/**
 *
 */
export function CategoryPicker(props: {
  label?: string;
  entries: CatalogEntry[];
  value: string;
  onChange: (id: string) => void;
}): React.JSX.Element {
  return (
    <CatalogPicker
      label={props.label ?? "Category"}
      entries={props.entries}
      value={props.value}
      onChange={props.onChange}
    />
  );
}

/**
 *
 */
export function PriorityPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (priority: number) => void;
}): React.JSX.Element {
  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground text-xs font-medium">Priority</p>
      <div className="flex flex-wrap gap-1.5">
        {TASK_PRIORITIES.map((p, index) => {
          const priority = Number.parseInt(p.id, 10);
          const selected = value === priority;
          const color = PRIORITY_COLORS[priority] ?? "#6b7280";
          const Icon = PRIORITY_ICONS[index] ?? MinusIcon;
          return (
            <Button
              key={p.id}
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "h-auto gap-1.5 px-2 py-1 text-xs font-medium",
                selected ? "border-transparent" : ""
              )}
              style={
                selected ? { backgroundColor: `${color}18`, color } : undefined
              }
              onClick={() => onChange(priority)}
            >
              <Icon className="size-3.5 shrink-0" style={{ color }} />
              {p.name}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
