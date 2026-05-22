import {
  parseThemePreference,
  resolveIsDark,
} from "@helvety/extension-chrome/theme-preference";
import { describe, expect, it } from "vitest";

describe("theme-preference (shared package)", () => {
  it("parses light and dark", () => {
    expect(parseThemePreference("light")).toBe("light");
    expect(parseThemePreference("dark")).toBe("dark");
  });

  it("resolveIsDark matches preference", () => {
    expect(resolveIsDark("dark")).toBe(true);
    expect(resolveIsDark("light")).toBe(false);
  });
});
