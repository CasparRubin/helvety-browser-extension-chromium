import {
  getRichTextPlainText,
  parseRichTextContent,
  serializeRichTextContent,
} from "@helvety/ui/tiptap-utils";

import type { EntityKind } from "../lib/entity-types";
import type { JSONContent } from "@helvety/ui/tiptap-utils";

/** Entity field names that store TipTap ProseMirror JSON. */
export type RichTextFieldName = "description" | "notes";

/** Fields stored as TipTap ProseMirror JSON (not plain contact description). */
export function isRichTextField(
  kind: EntityKind,
  field: RichTextFieldName
): boolean {
  if (field === "description") {
    return kind === "tasks" || kind === "notes";
  }
  return field === "notes" && kind === "contacts";
}

/** Human-readable plain text from stored TipTap JSON. */
export function formatStoredRichText(value: string | null): string | null {
  return getRichTextPlainText(value);
}

/** Parse stored ciphertext-decrypted string for TipTap `content` prop. */
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
