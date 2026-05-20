import { describe, expect, it } from "vitest";

import {
  parseHelvetyActionJsonBody,
  parseHelvetyActionJsonText,
} from "./parse-helvety-action-json";

describe("parseHelvetyActionJsonText", () => {
  it("parses success envelope with arbitrary data", () => {
    const result = parseHelvetyActionJsonText<{ x: number }>(
      JSON.stringify({ success: true, data: { x: 1 } })
    );
    expect(result).toEqual({ success: true, data: { x: 1 } });
  });

  it("parses failure envelope", () => {
    const result = parseHelvetyActionJsonText(
      JSON.stringify({ success: false, error: "Not authenticated" })
    );
    expect(result).toEqual({
      success: false,
      error: "Not authenticated",
    });
  });

  it("rejects invalid JSON", () => {
    const result = parseHelvetyActionJsonText("{not-json");
    expect(result).toEqual({
      success: false,
      error: "Invalid server response",
    });
  });

  it("rejects empty body as unexpected shape", () => {
    const result = parseHelvetyActionJsonText("");
    expect(result).toEqual({
      success: false,
      error: "Unexpected server response",
    });
  });

  it("rejects success without data field", () => {
    const result = parseHelvetyActionJsonText(
      JSON.stringify({ success: true })
    );
    expect(result).toEqual({
      success: false,
      error: "Unexpected server response",
    });
  });

  it("rejects failure with non-string error", () => {
    const result = parseHelvetyActionJsonText(
      JSON.stringify({ success: false, error: 500 })
    );
    expect(result).toEqual({
      success: false,
      error: "Unexpected server response",
    });
  });

  it("rejects wrong success literal", () => {
    const result = parseHelvetyActionJsonText(
      JSON.stringify({ success: "true", data: {} })
    );
    expect(result).toEqual({
      success: false,
      error: "Unexpected server response",
    });
  });
});

describe("parseHelvetyActionJsonBody", () => {
  it("handles already-parsed objects", () => {
    expect(
      parseHelvetyActionJsonBody<string>({ success: true, data: "ok" })
    ).toEqual({ success: true, data: "ok" });
  });

  it("returns unexpected for null body", () => {
    expect(parseHelvetyActionJsonBody(null)).toEqual({
      success: false,
      error: "Unexpected server response",
    });
  });
});
