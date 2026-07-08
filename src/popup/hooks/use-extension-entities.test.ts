import { describe, expect, it, vi } from "vitest";

import { loadExtensionEntitiesTab } from "./use-extension-entities";

import type { EntityRepository } from "../../lib/entity-repository";
import type {
  EntityListItem,
  LinkFolderListRow,
  LinkListRow,
} from "../../lib/entity-types";

function createRepoMock(
  overrides: Partial<EntityRepository> = {}
): EntityRepository {
  return {
    listTasks: vi.fn(),
    listNotes: vi.fn(),
    listContacts: vi.fn(),
    listLinks: vi.fn(),
    listLinkFolders: vi.fn(),
    listLinkFolderPickerItems: vi.fn(),
    ...overrides,
  } as unknown as EntityRepository;
}

describe("loadExtensionEntitiesTab", () => {
  it("loads task rows for the tasks tab", async () => {
    const tasks = [
      {
        id: "task-1",
        title: "Ship phase 4",
        stage_id: "default-item-ready",
        sort_order: 0,
        created_at: "2026-07-08T12:00:00.000Z",
      },
    ];
    const repo = createRepoMock({
      listTasks: vi.fn().mockResolvedValue(tasks),
    });
    const touchVaultActivity = vi.fn().mockResolvedValue(undefined);

    const loaded = await loadExtensionEntitiesTab(
      repo,
      "tasks",
      touchVaultActivity
    );

    expect(touchVaultActivity).toHaveBeenCalledOnce();
    expect(repo.listTasks).toHaveBeenCalledOnce();
    expect(loaded).toEqual({ tasks });
  });

  it("loads the links collections together with folder picker items", async () => {
    const links: LinkListRow[] = [
      {
        id: "link-1",
        name: "Docs",
        url: "https://helvety.com/docs",
        folder_id: null,
        sort_order: 0,
        created_at: "2026-07-08T12:00:00.000Z",
      },
    ];
    const linkFolders: LinkFolderListRow[] = [
      {
        id: "folder-1",
        name: "Reading",
        parent_folder_id: null,
        sort_order: 0,
        created_at: "2026-07-08T12:00:00.000Z",
      },
    ];
    const pickerItems: EntityListItem[] = [
      {
        id: "folder-1",
        title: "Reading",
      },
    ];
    const repo = createRepoMock({
      listLinks: vi.fn().mockResolvedValue(links),
      listLinkFolders: vi.fn().mockResolvedValue(linkFolders),
      listLinkFolderPickerItems: vi.fn().mockResolvedValue(pickerItems),
    });
    const touchVaultActivity = vi.fn().mockResolvedValue(undefined);

    const loaded = await loadExtensionEntitiesTab(
      repo,
      "links",
      touchVaultActivity
    );

    expect(touchVaultActivity).toHaveBeenCalledOnce();
    expect(repo.listLinks).toHaveBeenCalledOnce();
    expect(repo.listLinkFolders).toHaveBeenCalledOnce();
    expect(repo.listLinkFolderPickerItems).toHaveBeenCalledOnce();
    expect(loaded).toEqual({
      links,
      linkFolders,
      linkFolderPickerItems: pickerItems,
    });
  });
});
