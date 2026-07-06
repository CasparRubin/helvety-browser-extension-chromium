import {
  CONTACT_CATEGORIES,
  catalogColor,
} from "@helvety/shared/e2ee-entity-catalogs";
import {
  ListEmptyState,
  ListErrorState,
  ListLoadingState,
} from "@helvety/ui/list-states";

import { ContactRow } from "./contact-row";
import { CategoryGroup } from "./group-headers";
import {
  groupEntitiesByKey,
  moveToNextGroup,
  moveToPreviousGroup,
} from "./list-group-utils";

import type { ContactListRow } from "../../../lib/entity-types";

/**
 *
 */
export function ContactEntityList({
  contacts,
  isLoading,
  error,
  emptyTitle,
  emptyDescription,
  onRetry,
  onContactClick,
  onContactDelete,
  onReorder,
}: {
  contacts: ContactListRow[];
  isLoading: boolean;
  error: string | null;
  emptyTitle: string;
  emptyDescription: string;
  onRetry?: () => void;
  onContactClick: (contact: ContactListRow) => void;
  onContactDelete: (contact: ContactListRow) => void;
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
  if (contacts.length === 0) {
    return <ListEmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const grouped = groupEntitiesByKey(contacts, "category_id");
  const sortedCategories = [...CONTACT_CATEGORIES].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  return (
    <div className="space-y-1">
      {sortedCategories.map((category, categoryIndex) => {
        const categoryContacts = grouped.get(category.id) ?? [];
        if (categoryContacts.length === 0) {
          return null;
        }
        const isFirst = categoryIndex === 0;
        const isLast = categoryIndex === sortedCategories.length - 1;
        return (
          <CategoryGroup
            key={category.id}
            category={category}
            count={categoryContacts.length}
          >
            {categoryContacts.map((contact) => (
              <ContactRow
                key={contact.id}
                firstName={contact.first_name}
                lastName={contact.last_name}
                accentColor={catalogColor(
                  CONTACT_CATEGORIES,
                  contact.category_id
                )}
                isFirst={isFirst}
                isLast={isLast}
                onClick={() => onContactClick(contact)}
                onDelete={() => onContactDelete(contact)}
                onMoveUp={
                  sortedCategories.length > 1
                    ? () => {
                        const updates = moveToPreviousGroup(
                          contacts,
                          contact.id,
                          CONTACT_CATEGORIES,
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
                          contacts,
                          contact.id,
                          CONTACT_CATEGORIES,
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
