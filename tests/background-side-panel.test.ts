import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("background side panel", () => {
  it("enables side panel on action click at SW startup and on install", () => {
    const background = readFileSync(
      join(repoRoot, "src", "background.ts"),
      "utf8"
    );
    expect(background).toContain("enableSidePanelOnActionClick");
    expect(background).toContain("chrome.runtime.onInstalled.addListener");
    expect(background).toContain("chrome.sidePanel");
    expect(background).toContain("setPanelBehavior");
    expect(background).toContain("openPanelOnActionClick: true");
    expect(background).not.toMatch(/popup only|action popup/i);
  });
});
