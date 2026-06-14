import { getRichTextPlainText } from "@helvety/ui/tiptap-utils";
import { describe, expect, it } from "vitest";

import {
  serializeStoredRichText,
  parseStoredRichText,
} from "../popup/entity-rich-text";

const SAMPLE_DOC_JSON =
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Search for tasks, contacts & notes"}]}]}';

describe("entity-rich-text", () => {
  it("extracts plain text from ProseMirror JSON", () => {
    expect(getRichTextPlainText(SAMPLE_DOC_JSON)).toBe(
      "Search for tasks, contacts & notes"
    );
  });

  it("round-trips through serializeStoredRichText", () => {
    const doc = parseStoredRichText(SAMPLE_DOC_JSON);
    expect(doc).not.toBeNull();
    const stored = serializeStoredRichText(doc);
    expect(getRichTextPlainText(stored)).toBe(
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
    expect(getRichTextPlainText("Hello legacy")).toBeNull();
  });
});
