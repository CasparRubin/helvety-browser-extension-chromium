import {
  getRichTextPlainText,
  parseRichTextContent,
  serializeRichTextContent,
} from "@helvety/ui/tiptap-utils";

import type { JSONContent } from "@helvety/ui/tiptap-utils";

/** Parse stored ciphertext-decrypted string for TipTap mount-only `content`. */
export function parseStoredRichText(value: string | null): JSONContent | null {
  return parseRichTextContent(value);
}

/** Serialize editor JSON for Supabase; empty docs become `null`. */
export function serializeStoredRichText(
  doc: JSONContent | null
): string | null {
  if (!doc) {
    return null;
  }
  const serialized = serializeRichTextContent(doc);
  const plain = getRichTextPlainText(serialized);
  if (!plain) {
    return null;
  }
  return serialized;
}
