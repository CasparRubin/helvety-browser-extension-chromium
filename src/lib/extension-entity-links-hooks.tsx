import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import type { EntityLinkRepository } from "./entity-link-repository";
import type { LinkEntityType } from "@helvety/shared/entity-links-client";

const ExtensionLinksContext = createContext<EntityLinkRepository | null>(null);

/** Provides entity link repository to form link panels. */
export function ExtensionLinksProvider({
  repo,
  children,
}: {
  repo: EntityLinkRepository | null;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <ExtensionLinksContext.Provider value={repo}>
      {children}
    </ExtensionLinksContext.Provider>
  );
}

/** Returns the active entity link repository (null when vault is locked). */
export function useExtensionLinksRepo(): EntityLinkRepository | null {
  return useContext(ExtensionLinksContext);
}

/** Minimal catalog row shape for link pickers. */
type CatalogRow = { id: string };
/** Catalog row plus link row id and timestamp. */
type LinkedRow = CatalogRow & { link_id: string; linked_at: string };

/** Loads catalog + linked rows for one entity endpoint. */
type LoadLinksFn = (
  repo: EntityLinkRepository,
  entityId: string
) => Promise<{ allItems: CatalogRow[]; linkedItems: LinkedRow[] }>;

/** Factory for extension entity link hooks consumed by `EntityLinksPanel`. */
export function createExtensionEntityLinksHook(loadLinks: LoadLinksFn) {
  return function useExtensionEntityLinks(
    entityId: string,
    options?: { enabled?: boolean }
  ) {
    const repo = useExtensionLinksRepo();
    const enabled = options?.enabled ?? true;
    const [allItems, setAllItems] = useState<CatalogRow[]>([]);
    const [linkedItems, setLinkedItems] = useState<LinkedRow[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const reload = useCallback(async () => {
      if (!repo || !entityId) {
        setAllItems([]);
        setLinkedItems([]);
        return;
      }
      setIsLoading(true);
      try {
        const result = await loadLinks(repo, entityId);
        setAllItems(result.allItems);
        setLinkedItems(result.linkedItems);
      } catch {
        setAllItems([]);
        setLinkedItems([]);
      } finally {
        setIsLoading(false);
      }
    }, [entityId, repo]);

    useEffect(() => {
      if (!enabled) {
        return;
      }
      void reload();
    }, [enabled, reload]);

    const link = useCallback(
      async (
        targetId: string,
        sourceType: LinkEntityType,
        targetType: LinkEntityType
      ): Promise<boolean> => {
        if (!repo) {
          return false;
        }
        try {
          await repo.linkEntities(sourceType, entityId, targetType, targetId);
          await reload();
          return true;
        } catch {
          return false;
        }
      },
      [entityId, reload, repo]
    );

    const unlink = useCallback(
      async (linkId: string): Promise<void> => {
        if (!repo) {
          return;
        }
        try {
          await repo.unlink(linkId);
          await reload();
        } catch {}
      },
      [reload, repo]
    );

    return {
      allItems,
      linkedItems,
      isLoading,
      link,
      unlink,
    };
  };
}
