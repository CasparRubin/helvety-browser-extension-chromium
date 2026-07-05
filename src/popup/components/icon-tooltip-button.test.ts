import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const sourcePath = resolve(import.meta.dirname, "IconTooltipButton.tsx");

describe("IconTooltipButton", () => {
  it("delegates to RowActionButton with tooltips enabled", () => {
    const src = readFileSync(sourcePath, "utf8");
    expect(src).toContain("@helvety/ui/row-action-button");
    expect(src).toContain("showTooltip");
    expect(src).toContain("stopPropagation={stopPropagation}");
  });
});
