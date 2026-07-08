// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LinksTreeList } from "./links-tree-list";

import type { LinkFolderListRow, LinkListRow } from "../../../lib/entity-types";

describe("LinksTreeList", () => {
  it("toggles nested children for folders", () => {
    const folders: LinkFolderListRow[] = [
      {
        id: "folder-1",
        name: "Parent folder",
        parent_folder_id: null,
        sort_order: 0,
        created_at: "2026-07-08T12:00:00.000Z",
      },
    ];
    const links: LinkListRow[] = [
      {
        id: "link-1",
        name: "Child link",
        url: "https://helvety.com",
        folder_id: "folder-1",
        sort_order: 0,
        created_at: "2026-07-08T12:00:00.000Z",
      },
    ];

    render(
      <LinksTreeList
        folders={folders}
        links={links}
        isLoading={false}
        error={null}
        emptyTitle="No links"
        emptyDescription="Nothing here yet."
        onLinkEdit={vi.fn()}
        onFolderEdit={vi.fn()}
        onReorderLinks={vi.fn()}
        onReorderFolders={vi.fn()}
      />
    );

    expect(screen.queryByText("Child link")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Expand folder" }));
    expect(screen.getByText("Child link")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Collapse folder" }));
    expect(screen.queryByText("Child link")).toBeNull();
  });
});
