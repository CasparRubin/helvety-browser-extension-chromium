import { describe, expect, it } from "vitest";

import {
  formatStoredRichText,
  isRichTextField,
  serializeStoredRichText,
  parseStoredRichText,
} from "../popup/entity-rich-text";

const SAMPLE_DOC_JSON =
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Search for tasks, contacts & notes"}]}]}';

describe("entity-rich-text", () => {
  it("identifies rich text fields by entity kind", () => {
    expect(isRichTextField("tasks", "description")).toBe(true);
    expect(isRichTextField("notes", "description")).toBe(true);
    expect(isRichTextField("contacts", "description")).toBe(false);
    expect(isRichTextField("contacts", "notes")).toBe(true);
    expect(isRichTextField("links", "description")).toBe(false);
  });

  it("extracts plain text from ProseMirror JSON", () => {
    expect(formatStoredRichText(SAMPLE_DOC_JSON)).toBe(
      "Search for tasks, contacts & notes"
    );
  });

  it("round-trips through serializeStoredRichText", () => {
    const doc = parseStoredRichText(SAMPLE_DOC_JSON);
    expect(doc).not.toBeNull();
    const stored = serializeStoredRichText(doc);
    expect(formatStoredRichText(stored)).toBe(
      "Search for tasks, contacts & notes"
    );
  });

  it("returns null for empty editor content", () => {
    expect(serializeStoredRichText(parseStoredRichText(""))).toBeNull();
  });

  it("does not treat legacy plain text as ProseMirror JSON", () => {
    expect(parseStoredRichText("Hello legacy")).toBeNull();
    expect(
      serializeStoredRichText(parseStoredRichText("Hello legacy"))
    ).toBeNull();
    expect(formatStoredRichText("Hello legacy")).toBeNull();
  });
});
