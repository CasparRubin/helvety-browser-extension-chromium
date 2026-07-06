import { getE2eeListTitle } from "@helvety/shared/e2ee-draft";
import {
  NOTE_CATEGORIES,
  catalogColor,
} from "@helvety/shared/e2ee-entity-catalogs";
import {
  ListEmptyState,
  ListErrorState,
  ListLoadingState,
} from "@helvety/ui/list-states";

import { EntityRow } from "./entity-row";
import { CategoryGroup } from "./group-headers";
import {
  groupEntitiesByKey,
  moveToNextGroup,
  moveToPreviousGroup,
} from "./list-group-utils";

import type { NoteListRow } from "../../../lib/entity-types";

/**
 *
 */
export function NoteEntityList({
  notes,
  isLoading,
  error,
  emptyTitle,
  emptyDescription,
  onRetry,
  onNoteClick,
  onNoteDelete,
  onReorder,
}: {
  notes: NoteListRow[];
  isLoading: boolean;
  error: string | null;
  emptyTitle: string;
  emptyDescription: string;
  onRetry?: () => void;
  onNoteClick: (note: NoteListRow) => void;
  onNoteDelete: (note: NoteListRow) => void;
  onReorder: (
    updates: { id: string; sort_order: number; category_id?: string }[]
  ) => void | Promise<void>;
}): React.JSX.Element {
  if (isLoading) {
    return <ListLoadingState message="Loading…" />;
  }
  if (error) {
    return <ListErrorState message={error} onRetry={onRetry} />;
  }
  if (notes.length === 0) {
    return <ListEmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const grouped = groupEntitiesByKey(notes, "category_id");
  const sortedCategories = [...NOTE_CATEGORIES].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  return (
    <div className="space-y-1">
      {sortedCategories.map((category, categoryIndex) => {
        const categoryNotes = grouped.get(category.id) ?? [];
        if (categoryNotes.length === 0) {
          return null;
        }
        const isFirst = categoryIndex === 0;
        const isLast = categoryIndex === sortedCategories.length - 1;
        return (
          <CategoryGroup
            key={category.id}
            category={category}
            count={categoryNotes.length}
          >
            {categoryNotes.map((note) => (
              <EntityRow
                key={note.id}
                title={getE2eeListTitle(note.title)}
                accentColor={catalogColor(NOTE_CATEGORIES, note.category_id)}
                isFirst={isFirst}
                isLast={isLast}
                onClick={() => onNoteClick(note)}
                onDelete={() => onNoteDelete(note)}
                onMoveUp={
                  sortedCategories.length > 1
                    ? () => {
                        const updates = moveToPreviousGroup(
                          notes,
                          note.id,
                          NOTE_CATEGORIES,
                          "category_id"
                        );
                        if (updates.length > 0) {
                          void onReorder(updates);
                        }
                      }
                    : undefined
                }
                onMoveDown={
                  sortedCategories.length > 1
                    ? () => {
                        const updates = moveToNextGroup(
                          notes,
                          note.id,
                          NOTE_CATEGORIES,
                          "category_id"
                        );
                        if (updates.length > 0) {
                          void onReorder(updates);
                        }
                      }
                    : undefined
                }
              />
            ))}
          </CategoryGroup>
        );
      })}
    </div>
  );
}
