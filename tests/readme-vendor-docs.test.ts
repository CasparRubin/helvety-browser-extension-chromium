import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("README vendor and popup documentation", () => {
  const readme = readFileSync(join(repoRoot, "README.md"), "utf8");

  it("lists extension-chrome and documents popup structure", () => {
    const popupSection = readme.slice(
      readme.indexOf("## Popup UI (structure)")
    );
    expect(popupSection).toContain("@helvety/extension-chrome/theme-boot");
    expect(popupSection).toContain("helvetyPopupThemePreference");
    expect(popupSection).toMatch(/not `next-themes`/);
  });

  it("documents tests/ layout contract suites", () => {
    expect(readme).toContain("tests/");
    expect(readme).toContain("popup-chrome");
  });
});
