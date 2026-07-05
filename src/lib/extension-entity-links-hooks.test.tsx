// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ExtensionLinksProvider,
  createExtensionEntityLinksHook,
} from "./extension-entity-links-hooks";

import type { EntityLinkRepository } from "./entity-link-repository";
import type { ReactNode } from "react";

const toastError = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
  },
}));

const ENTITY_ID = "00000000-0000-4000-8000-000000000001";

function createRepo(
  overrides: Partial<EntityLinkRepository> = {}
): EntityLinkRepository {
  return {
    linkEntities: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as EntityLinkRepository;
}

function createWrapper(repo: EntityLinkRepository | null) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ExtensionLinksProvider repo={repo}>{children}</ExtensionLinksProvider>
    );
  };
}

describe("createExtensionEntityLinksHook", () => {
  beforeEach(() => {
    toastError.mockClear();
  });

  it("loads catalog and linked rows when a repository is available", async () => {
    const loadLinks = vi.fn().mockResolvedValue({
      allItems: [{ id: "contact-a" }],
      linkedItems: [
        { id: "contact-b", link_id: "link-1", linked_at: "2026-01-01" },
      ],
    });
    const repo = createRepo();
    const useLinks = createExtensionEntityLinksHook(loadLinks);

    const { result } = renderHook(() => useLinks(ENTITY_ID), {
      wrapper: createWrapper(repo),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(loadLinks).toHaveBeenCalledWith(repo, ENTITY_ID);
    expect(result.current.allItems).toEqual([{ id: "contact-a" }]);
    expect(result.current.linkedItems).toEqual([
      { id: "contact-b", link_id: "link-1", linked_at: "2026-01-01" },
    ]);
    expect(toastError).not.toHaveBeenCalled();
  });

  it("toasts and clears rows when load fails", async () => {
    const loadLinks = vi.fn().mockRejectedValue(new Error("network down"));
    const useLinks = createExtensionEntityLinksHook(loadLinks);

    const { result } = renderHook(() => useLinks(ENTITY_ID), {
      wrapper: createWrapper(createRepo()),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(toastError).toHaveBeenCalledWith("network down");
    expect(result.current.allItems).toEqual([]);
    expect(result.current.linkedItems).toEqual([]);
  });

  it("toasts and returns false when link fails", async () => {
    const loadLinks = vi.fn().mockResolvedValue({
      allItems: [],
      linkedItems: [],
    });
    const repo = createRepo({
      linkEntities: vi.fn().mockRejectedValue(new Error("link denied")),
    });
    const useLinks = createExtensionEntityLinksHook(loadLinks);

    const { result } = renderHook(() => useLinks(ENTITY_ID), {
      wrapper: createWrapper(repo),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let linked = true;
    await act(async () => {
      linked = await result.current.link("target-id", "items", "contacts");
    });

    expect(linked).toBe(false);
    expect(toastError).toHaveBeenCalledWith("link denied");
  });

  it("toasts when unlink fails", async () => {
    const loadLinks = vi.fn().mockResolvedValue({
      allItems: [],
      linkedItems: [],
    });
    const repo = createRepo({
      unlink: vi.fn().mockRejectedValue(new Error("unlink denied")),
    });
    const useLinks = createExtensionEntityLinksHook(loadLinks);

    const { result } = renderHook(() => useLinks(ENTITY_ID), {
      wrapper: createWrapper(repo),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.unlink("link-row-id");
    });

    expect(toastError).toHaveBeenCalledWith("unlink denied");
  });
});
