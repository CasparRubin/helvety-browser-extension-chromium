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
 */
export function EntityRichTextEditor({
  value,
  onChange,
  placeholder = "Add a description…",
  disabled = false,
}: {
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
          key={value ?? "__empty__"}
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
