import { getE2eeListTitle } from "@helvety/shared/e2ee-draft";
import {
  TASK_STAGES,
  catalogColor,
} from "@helvety/shared/e2ee-entity-catalogs";
import {
  ListEmptyState,
  ListErrorState,
  ListLoadingState,
} from "@helvety/ui/list-states";

import { EntityRow } from "./entity-row";
import { StageGroup } from "./group-headers";
import {
  groupEntitiesByKey,
  moveToNextGroup,
  moveToPreviousGroup,
} from "./list-group-utils";

import type { TaskListRow } from "../../../lib/entity-types";

/**
 *
 */
export function TaskEntityList({
  tasks,
  isLoading,
  error,
  emptyTitle,
  emptyDescription,
  onRetry,
  onTaskClick,
  onTaskDelete,
  onReorder,
}: {
  tasks: TaskListRow[];
  isLoading: boolean;
  error: string | null;
  emptyTitle: string;
  emptyDescription: string;
  onRetry?: () => void;
  onTaskClick: (task: TaskListRow) => void;
  onTaskDelete: (task: TaskListRow) => void;
  onReorder: (
    updates: { id: string; sort_order: number; stage_id?: string }[]
  ) => void | Promise<void>;
}): React.JSX.Element {
  if (isLoading) {
    return <ListLoadingState message="Loading…" />;
  }
  if (error) {
    return <ListErrorState message={error} onRetry={onRetry} />;
  }
  if (tasks.length === 0) {
    return <ListEmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const grouped = groupEntitiesByKey(tasks, "stage_id");
  const sortedStages = [...TASK_STAGES].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  return (
    <div className="space-y-1">
      {sortedStages.map((stage, stageIndex) => {
        const stageTasks = grouped.get(stage.id) ?? [];
        if (stageTasks.length === 0) {
          return null;
        }
        const isFirstStage = stageIndex === 0;
        const isLastStage = stageIndex === sortedStages.length - 1;
        return (
          <StageGroup key={stage.id} stage={stage} count={stageTasks.length}>
            {stageTasks.map((task) => (
              <EntityRow
                key={task.id}
                title={getE2eeListTitle(task.title)}
                accentColor={catalogColor(TASK_STAGES, task.stage_id)}
                isFirst={isFirstStage}
                isLast={isLastStage}
                onClick={() => onTaskClick(task)}
                onDelete={() => onTaskDelete(task)}
                onMoveUp={
                  sortedStages.length > 1
                    ? () => {
                        const updates = moveToPreviousGroup(
                          tasks,
                          task.id,
                          TASK_STAGES,
                          "stage_id"
                        );
                        if (updates.length > 0) {
                          void onReorder(updates);
                        }
                      }
                    : undefined
                }
                onMoveDown={
                  sortedStages.length > 1
                    ? () => {
                        const updates = moveToNextGroup(
                          tasks,
                          task.id,
                          TASK_STAGES,
                          "stage_id"
                        );
                        if (updates.length > 0) {
                          void onReorder(updates);
                        }
                      }
                    : undefined
                }
              />
            ))}
          </StageGroup>
        );
      })}
    </div>
  );
}
