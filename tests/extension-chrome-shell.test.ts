import {
  POPUP_SHELL_CLASS,
  POPUP_WIDTH_CLASS,
} from "@helvety/extension-chrome/popup-shell";
import { describe, expect, it } from "vitest";

describe("@helvety/extension-chrome popup-shell exports", () => {
  it("exports shared shell padding and legacy popup width for other extensions", () => {
    expect(POPUP_WIDTH_CLASS).toBe("w-[800px]");
    expect(POPUP_SHELL_CLASS).toContain("px-3");
  });
});
