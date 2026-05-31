import {
  POPUP_SHELL_CLASS,
  POPUP_WIDTH_CLASS,
} from "@helvety/extension-chrome/popup-shell";
import { describe, expect, it } from "vitest";

describe("popup-shell (shared package)", () => {
  it("exports Chrome max popup width and shell padding", () => {
    expect(POPUP_WIDTH_CLASS).toBe("w-[800px]");
    expect(POPUP_SHELL_CLASS).toContain("px-3");
  });
});
