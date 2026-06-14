import { describe, expect, it } from "vitest";

import { TASK_STAGES } from "../../../lib/entity-catalogs";

import {
  groupEntitiesByKey,
  moveToNextGroup,
  moveToPreviousGroup,
  swapSiblingSortOrder,
} from "./list-group-utils";

describe("list-group-utils", () => {
  const tasks = [
    { id: "b", title: "B", stage_id: "default-item-ready", sort_order: 1 },
    { id: "a", title: "A", stage_id: "default-item-backlog", sort_order: 0 },
    { id: "c", title: "C", stage_id: "default-item-backlog", sort_order: 2 },
  ];

  it("groups entities by key and sorts within group by sort_order", () => {
    const grouped = groupEntitiesByKey(tasks, "stage_id");
    const backlog = grouped.get("default-item-backlog") ?? [];
    expect(backlog.map((t) => t.id)).toEqual(["a", "c"]);
  });

  it("moves entity to previous stage group", () => {
    const updates = moveToPreviousGroup(tasks, "b", TASK_STAGES, "stage_id");
    expect(updates).toEqual([
      {
        id: "b",
        sort_order: 1,
        stage_id: "default-item-discovery",
      },
    ]);
  });

  it("moves entity to next stage group", () => {
    const updates = moveToNextGroup(tasks, "a", TASK_STAGES, "stage_id");
    expect(updates).toEqual([
      {
        id: "a",
        sort_order: 0,
        stage_id: "default-item-discovery",
      },
    ]);
  });

  it("returns empty updates at group boundaries", () => {
    const voidTask = {
      id: "z",
      title: "Z",
      stage_id: "default-item-void",
      sort_order: 0,
    };
    expect(
      moveToNextGroup([voidTask, ...tasks], "z", TASK_STAGES, "stage_id")
    ).toEqual([]);
    expect(moveToPreviousGroup(tasks, "a", TASK_STAGES, "stage_id")).toEqual(
      []
    );
  });

  it("swapSiblingSortOrder exchanges sort_order with adjacent sibling", () => {
    const links = [
      { id: "a", sort_order: 0 },
      { id: "b", sort_order: 1 },
      { id: "c", sort_order: 2 },
    ];

    expect(swapSiblingSortOrder(links, "b", "up")).toEqual([
      { id: "b", sort_order: 0 },
      { id: "a", sort_order: 1 },
    ]);
    expect(swapSiblingSortOrder(links, "b", "down")).toEqual([
      { id: "b", sort_order: 2 },
      { id: "c", sort_order: 1 },
    ]);
  });

  it("swapSiblingSortOrder returns empty updates at list boundaries", () => {
    const links = [
      { id: "a", sort_order: 0 },
      { id: "b", sort_order: 1 },
    ];
    expect(swapSiblingSortOrder(links, "a", "up")).toEqual([]);
    expect(swapSiblingSortOrder(links, "b", "down")).toEqual([]);
    expect(swapSiblingSortOrder(links, "missing", "up")).toEqual([]);
  });
});
