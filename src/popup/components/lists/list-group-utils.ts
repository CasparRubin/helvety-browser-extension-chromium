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
