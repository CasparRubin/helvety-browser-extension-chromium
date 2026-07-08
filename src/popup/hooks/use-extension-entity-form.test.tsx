// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useExtensionEntityForm } from "./use-extension-entity-form";

import type { EntityRepository } from "../../lib/entity-repository";
import type {
  ContactListRow,
  LinkFolderListRow,
  LinkListRow,
  NoteListRow,
  TaskListRow,
} from "../../lib/entity-types";

function createRepoMock(
  overrides: Partial<EntityRepository> = {}
): EntityRepository {
  return {
    reorderTasks: vi.fn().mockResolvedValue(undefined),
    listTasks: vi.fn().mockResolvedValue([] as TaskListRow[]),
    reorderNotes: vi.fn().mockResolvedValue(undefined),
    listNotes: vi.fn().mockResolvedValue([] as NoteListRow[]),
    reorderContacts: vi.fn().mockResolvedValue(undefined),
    listContacts: vi.fn().mockResolvedValue([] as ContactListRow[]),
    reorderLinks: vi.fn().mockResolvedValue(undefined),
    listLinks: vi.fn().mockResolvedValue([] as LinkListRow[]),
    reorderLinkFolders: vi.fn().mockResolvedValue(undefined),
    listLinkFolders: vi.fn().mockResolvedValue([] as LinkFolderListRow[]),
    ...overrides,
  } as unknown as EntityRepository;
}

function createOptions(
  overrides: Partial<Parameters<typeof useExtensionEntityForm>[0]> = {}
) {
  return {
    repo: createRepoMock(),
    tab: "tasks" as const,
    setTab: vi.fn(),
    setListError: vi.fn(),
    reloadCurrentTab: vi.fn().mockResolvedValue(undefined),
    touchVaultActivity: vi.fn().mockResolvedValue(undefined),
    setTasks: vi.fn(),
    setNotes: vi.fn(),
    setContacts: vi.fn(),
    setLinks: vi.fn(),
    setLinkFolders: vi.fn(),
    ...overrides,
  };
}

describe("useExtensionEntityForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prompts before changing tabs when the current draft is dirty", () => {
    const options = createOptions();
    const { result } = renderHook(() => useExtensionEntityForm(options));

    act(() => {
      result.current.handleAdd();
    });

    act(() => {
      result.current.setFormDraft({
        kind: "tasks",
        value: {
          title: "Dirty draft",
          description: null,
          start_date: null,
          end_date: null,
          stage_id: "default-item-backlog",
          label_id: "default",
          priority: 2,
        },
      });
    });

    act(() => {
      result.current.handleTabChange("notes");
    });

    expect(result.current.unsavedDialogOpen).toBe(true);
    expect(options.setTab).not.toHaveBeenCalled();

    act(() => {
      result.current.confirmDiscardUnsaved();
    });

    expect(options.setTab).toHaveBeenCalledWith("notes");
  });

  it("reloads tasks after a successful reorder", async () => {
    const refreshedTasks: TaskListRow[] = [
      {
        id: "task-1",
        title: "Refreshed task",
        stage_id: "default-item-ready",
        sort_order: 0,
        created_at: "2026-07-08T12:00:00.000Z",
      },
    ];
    const repo = createRepoMock({
      reorderTasks: vi.fn().mockResolvedValue(undefined),
      listTasks: vi.fn().mockResolvedValue(refreshedTasks),
    });
    const options = createOptions({ repo });
    const { result } = renderHook(() => useExtensionEntityForm(options));

    await act(async () => {
      await result.current.handleReorderTasks([
        {
          id: "task-1",
          sort_order: 0,
          stage_id: "default-item-ready",
        },
      ]);
    });

    await waitFor(() => {
      expect(repo.reorderTasks).toHaveBeenCalledWith([
        {
          id: "task-1",
          sort_order: 0,
          stage_id: "default-item-ready",
        },
      ]);
    });
    expect(repo.listTasks).toHaveBeenCalledOnce();
    expect(options.setTasks).toHaveBeenCalledWith(refreshedTasks);
  });
});
