import type { CatalogEntry } from "../../../lib/entity-catalogs";

/** Move entity to previous group (stage/category). */
export function moveToPreviousGroup<
  T extends { id: string; sort_order: number },
  K extends string,
>(
  entities: (T & Record<K, string>)[],
  entityId: string,
  groups: CatalogEntry[],
  groupKey: K
): { id: string; sort_order: number; [key: string]: string | number }[] {
  const entity = entities.find((e) => e.id === entityId);
  if (!entity) {
    return [];
  }
  const sortedGroups = [...groups].sort((a, b) => a.sort_order - b.sort_order);
  const currentIdx = sortedGroups.findIndex(
    (g) => g.id === (entity[groupKey] as string)
  );
  if (currentIdx <= 0) {
    return [];
  }
  const prev = sortedGroups[currentIdx - 1];
  if (!prev) {
    return [];
  }
  return [
    {
      id: entity.id,
      sort_order: entity.sort_order,
      [groupKey]: prev.id,
    },
  ];
}

/** Move entity to next group (stage/category). */
export function moveToNextGroup<
  T extends { id: string; sort_order: number },
  K extends string,
>(
  entities: (T & Record<K, string>)[],
  entityId: string,
  groups: CatalogEntry[],
  groupKey: K
): { id: string; sort_order: number; [key: string]: string | number }[] {
  const entity = entities.find((e) => e.id === entityId);
  if (!entity) {
    return [];
  }
  const sortedGroups = [...groups].sort((a, b) => a.sort_order - b.sort_order);
  const currentIdx = sortedGroups.findIndex(
    (g) => g.id === (entity[groupKey] as string)
  );
  if (currentIdx < 0 || currentIdx >= sortedGroups.length - 1) {
    return [];
  }
  const next = sortedGroups[currentIdx + 1];
  if (!next) {
    return [];
  }
  return [
    {
      id: entity.id,
      sort_order: entity.sort_order,
      [groupKey]: next.id,
    },
  ];
}

/**
 *
 */
export function groupEntitiesByKey<
  T extends { id: string; sort_order: number },
  K extends string,
>(entities: T[], groupKey: K): Map<string, T[]> {
  const map = new Map<string, T[]>();
  const sorted = [...entities].sort((a, b) => a.sort_order - b.sort_order);
  for (const entity of sorted) {
    const key = String((entity as Record<K, string>)[groupKey]);
    const list = map.get(key) ?? [];
    list.push(entity);
    map.set(key, list);
  }
  return map;
}

/** Swap sort_order with the adjacent sibling in a flat list. */
export function swapSiblingSortOrder<
  T extends { id: string; sort_order: number },
>(
  siblings: T[],
  entityId: string,
  direction: "up" | "down"
): { id: string; sort_order: number }[] {
  const sorted = [...siblings].sort((a, b) => a.sort_order - b.sort_order);
  const index = sorted.findIndex((entry) => entry.id === entityId);
  if (index < 0) {
    return [];
  }
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= sorted.length) {
    return [];
  }
  const current = sorted[index];
  const neighbor = sorted[swapIndex];
  if (!current || !neighbor) {
    return [];
  }
  return [
    { id: current.id, sort_order: neighbor.sort_order },
    { id: neighbor.id, sort_order: current.sort_order },
  ];
}
