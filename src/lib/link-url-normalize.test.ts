import { describe, expect, it } from "vitest";

import {
  normalizeBookmarkUrl,
  resolveLinkDisplayName,
} from "./link-url-normalize";

describe("link-url-normalize", () => {
  it("adds https scheme and normalizes host", () => {
    const result = normalizeBookmarkUrl("helvety.com");
    expect(result).toEqual({ ok: true, url: "https://helvety.com/" });
  });

  it("rejects unsupported protocols", () => {
    const result = normalizeBookmarkUrl("javascript:alert(1)");
    expect(result.ok).toBe(false);
  });

  it("derives display name from host when name empty", () => {
    expect(resolveLinkDisplayName("", "https://www.helvety.com/docs")).toBe(
      "helvety.com"
    );
  });
});
