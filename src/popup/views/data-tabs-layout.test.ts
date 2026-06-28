import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const dataTabsSource = readSource("src/popup/views/DataTabsView.tsx");
const entityFormSource = readSource("src/popup/views/EntityFormView.tsx");
const appSource = readSource("src/popup/App.tsx");

describe("DataTabsView tab order", () => {
  it("renders Links as the first tab, before the other entity tabs", () => {
    const tabsList = dataTabsSource.slice(
      dataTabsSource.indexOf("<TabsList"),
      dataTabsSource.indexOf("</TabsList>")
    );

    const order = ["links", "tasks", "notes", "contacts", "about"].map(
      (value) => tabsList.indexOf(`value="${value}"`)
    );

    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
});

describe("DataTabsView edit command bar", () => {
  it("renders the back button inline with the title when editing", () => {
    const commandBar = dataTabsSource.slice(
      dataTabsSource.indexOf('screen.mode === "form" ? ('),
      dataTabsSource.indexOf("<TabsContent")
    );

    expect(commandBar).toContain('screen.mode === "form" ? (');
    expect(commandBar).toContain("onClick={onCancelForm}");
    expect(commandBar).toContain("<ArrowLeft");
    expect(commandBar).toContain("{title}");
  });

  it("does not render a separate back-button header inside EntityFormView", () => {
    expect(entityFormSource).not.toContain("header={");
    expect(entityFormSource).not.toContain("ArrowLeft");
  });
});

describe("App default tab", () => {
  it("opens on the Links tab by default", () => {
    expect(appSource).toContain('useState<EntityTabId>("links")');
    expect(appSource).not.toContain('useState<EntityTabId>("tasks")');
  });
});
