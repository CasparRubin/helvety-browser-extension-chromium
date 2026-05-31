import { describe, expect, it } from "vitest";

import { getLinkTreeChildren } from "./link-tree";

import type { LinkFolderListRow, LinkListRow } from "./entity-types";

const folders: LinkFolderListRow[] = [
  {
    id: "root-a",
    name: "A",
    parent_folder_id: null,
    sort_order: 0,
    created_at: "2026-01-02T00:00:00Z",
  },
  {
    id: "child-a1",
    name: "A1",
    parent_folder_id: "root-a",
    sort_order: 0,
    created_at: "2026-01-01T00:00:00Z",
  },
];

const links: LinkListRow[] = [
  {
    id: "link-root",
    name: "Root link",
    url: "https://example.com",
    folder_id: null,
    sort_order: 0,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "link-in-a",
    name: "In A",
    url: "https://a.example.com",
    folder_id: "root-a",
    sort_order: 0,
    created_at: "2026-01-01T00:00:00Z",
  },
];

describe("getLinkTreeChildren", () => {
  it("returns root folders and unfiled links for null parent", () => {
    const { folders: childFolders, links: childLinks } = getLinkTreeChildren(
      folders,
      links,
      null
    );
    expect(childFolders.map((f) => f.id)).toEqual(["root-a"]);
    expect(childLinks.map((l) => l.id)).toEqual(["link-root"]);
  });

  it("returns nested folders and links for a folder id", () => {
    const { folders: childFolders, links: childLinks } = getLinkTreeChildren(
      folders,
      links,
      "root-a"
    );
    expect(childFolders.map((f) => f.id)).toEqual(["child-a1"]);
    expect(childLinks.map((l) => l.id)).toEqual(["link-in-a"]);
  });
});
