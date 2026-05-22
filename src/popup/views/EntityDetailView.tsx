import { Button } from "@helvety/ui/button";
import { ArrowLeft, ExternalLink, Pencil, Trash2 } from "lucide-react";

import {
  catalogName,
  CONTACT_CATEGORIES,
  NOTE_CATEGORIES,
  TASK_LABELS,
  TASK_PRIORITIES,
  TASK_STAGES,
} from "../../lib/entity-catalogs";
import { EntityScreenLayout } from "../components/EntityScreenLayout";
import { formatStoredRichText } from "../entity-rich-text";

import type {
  Contact,
  EntityListItem,
  EntityRecord,
  Link,
  LinkFolder,
  Note,
  Task,
  EntityKind,
} from "../../lib/entity-types";

/**
 *
 */
function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}): React.JSX.Element | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return (
    <div className="space-y-0.5">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-sm leading-snug break-words">{value}</p>
    </div>
  );
}

/**
 *
 */
function RichDetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}): React.JSX.Element | null {
  const text = formatStoredRichText(value ?? null);
  if (!text) {
    return null;
  }
  return (
    <div className="space-y-0.5">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="max-h-32 overflow-y-auto text-sm leading-snug break-words whitespace-pre-wrap">
        {text}
      </p>
    </div>
  );
}

/**
 *
 */
function detailTitle(kind: EntityKind, record: EntityRecord): string {
  switch (kind) {
    case "contacts": {
      const c = record as Contact;
      return `${c.first_name} ${c.last_name}`.trim();
    }
    case "notes":
      return (record as Note).title;
    case "tasks":
      return (record as Task).title;
    case "links":
      return (record as Link).name;
    case "link_folder":
      return (record as LinkFolder).name;
  }
}

/** Decrypted entity detail with edit, delete, and open-in-web-app actions. */
export function EntityDetailView({
  kind,
  record,
  linkFolders,
  mutationError,
  onBack,
  onEdit,
  onDelete,
  onOpenInApp,
}: {
  kind: EntityKind;
  record: EntityRecord;
  linkFolders: EntityListItem[];
  mutationError: string | null;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenInApp: () => void;
}): React.JSX.Element {
  const folderName = (folderId: string | null): string => {
    if (!folderId) {
      return "Unfiled";
    }
    return linkFolders.find((f) => f.id === folderId)?.title ?? folderId;
  };

  const fields = (() => {
    switch (kind) {
      case "contacts": {
        const c = record as Contact;
        return (
          <>
            <DetailRow label="First name" value={c.first_name} />
            <DetailRow label="Last name" value={c.last_name} />
            <DetailRow label="Description" value={c.description} />
            <DetailRow label="Email" value={c.email} />
            <DetailRow label="Phone" value={c.phone} />
            <DetailRow label="Birthday" value={c.birthday} />
            <RichDetailRow label="Notes" value={c.notes} />
            <DetailRow
              label="Category"
              value={catalogName(CONTACT_CATEGORIES, c.category_id)}
            />
          </>
        );
      }
      case "notes": {
        const n = record as Note;
        return (
          <>
            <DetailRow label="Title" value={n.title} />
            <RichDetailRow label="Description" value={n.description} />
            <DetailRow
              label="Category"
              value={catalogName(NOTE_CATEGORIES, n.category_id)}
            />
          </>
        );
      }
      case "tasks": {
        const t = record as Task;
        return (
          <>
            <DetailRow label="Title" value={t.title} />
            <RichDetailRow label="Description" value={t.description} />
            <DetailRow label="Start date" value={t.start_date} />
            <DetailRow label="End date" value={t.end_date} />
            <DetailRow
              label="Stage"
              value={catalogName(TASK_STAGES, t.stage_id)}
            />
            <DetailRow
              label="Label"
              value={catalogName(TASK_LABELS, t.label_id)}
            />
            <DetailRow
              label="Priority"
              value={catalogName(TASK_PRIORITIES, String(t.priority))}
            />
          </>
        );
      }
      case "links": {
        const l = record as Link;
        return (
          <>
            <DetailRow label="Name" value={l.name} />
            <div className="space-y-0.5">
              <p className="text-muted-foreground text-xs">URL</p>
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-sm leading-snug break-all underline"
              >
                {l.url}
              </a>
            </div>
            <DetailRow label="Folder" value={folderName(l.folder_id)} />
          </>
        );
      }
      case "link_folder": {
        const f = record as LinkFolder;
        return (
          <>
            <DetailRow label="Name" value={f.name} />
            <DetailRow
              label="Parent folder"
              value={folderName(f.parent_folder_id)}
            />
          </>
        );
      }
    }
  })();

  return (
    <EntityScreenLayout
      header={
        <div className="flex items-center gap-1 pb-2">
          <Button variant="ghost" size="sm" type="button" onClick={onBack}>
            <ArrowLeft className="size-4" />
            <span className="sr-only">Back</span>
          </Button>
          <h2 className="min-w-0 flex-1 truncate text-sm font-medium">
            {detailTitle(kind, record)}
          </h2>
        </div>
      }
      footer={
        <>
          {mutationError ? (
            <p className="text-destructive mb-2 text-xs" role="alert">
              {mutationError}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={onOpenInApp}
            >
              <ExternalLink className="size-4" />
              <span className="sr-only">Open in web app</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              className="flex-1"
              onClick={onEdit}
            >
              <Pencil className="size-4" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              type="button"
              className="flex-1"
              onClick={onDelete}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        </>
      }
    >
      <div className="flex flex-col gap-3 pb-2">{fields}</div>
    </EntityScreenLayout>
  );
}
