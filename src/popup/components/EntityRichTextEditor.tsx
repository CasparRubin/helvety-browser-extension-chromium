import { cn } from "@helvety/shared/utils";
import { Loader2 } from "lucide-react";
import { lazy, Suspense } from "react";

import {
  parseStoredRichText,
  serializeStoredRichText,
} from "../entity-rich-text";

import type { JSONContent } from "@helvety/ui/tiptap-utils";

const TiptapEditor = lazy(() =>
  import("@helvety/ui/tiptap-editor").then((m) => ({ default: m.TiptapEditor }))
);

/**
 * TipTap field for the extension side panel (task/note description, contact notes).
 *
 * Remount via `sessionKey` only when switching create/edit records — never on serialized
 * `value` (that remounts on every keystroke and steals focus). Web apps use the same idea
 * in `E2eeRichTextItemEditorShell` (editor ref + draft baseline, no value-based key).
 */
export function EntityRichTextEditor({
  sessionKey,
  value,
  onChange,
  placeholder = "Add a description…",
  disabled = false,
}: {
  /** Stable for one form session; changes when opening a different entity. */
  sessionKey: string;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}): React.JSX.Element {
  const initial = parseStoredRichText(value);

  return (
    <div className="entity-rich-text-editor w-full">
      <Suspense
        fallback={
          <div className="border-border flex min-h-24 items-center justify-center rounded-none border">
            <Loader2 className="text-muted-foreground size-5 animate-spin" />
          </div>
        }
      >
        <TiptapEditor
          key={sessionKey}
          content={initial}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("rounded-none", disabled && "pointer-events-none")}
          onChange={(doc: JSONContent) => {
            onChange(serializeStoredRichText(doc));
          }}
        />
      </Suspense>
    </div>
  );
}
