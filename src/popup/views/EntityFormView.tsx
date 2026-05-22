import { Button } from "@helvety/ui/button";
import { Input } from "@helvety/ui/input";
import { Label } from "@helvety/ui/label";
import { NativeSelect } from "@helvety/ui/native-select";
import { ArrowLeft, Loader2 } from "lucide-react";

import {
  CONTACT_CATEGORIES,
  NOTE_CATEGORIES,
  TASK_LABELS,
  TASK_PRIORITIES,
  TASK_STAGES,
} from "../../lib/entity-catalogs";
import { EntityRichTextEditor } from "../components/EntityRichTextEditor";
import { EntityScreenLayout } from "../components/EntityScreenLayout";
import { Textarea } from "../components/Textarea";
import { emptyContactInput } from "../entity-drafts";

import type {
  ContactInput,
  EntityListItem,
  LinkFolderInput,
  LinkInput,
  NoteInput,
  TaskInput,
  EntityKind,
} from "../../lib/entity-types";

/**
 *
 */
export type EntityFormDraft =
  | { kind: "tasks"; value: TaskInput }
  | { kind: "notes"; value: NoteInput }
  | { kind: "contacts"; value: ContactInput }
  | { kind: "links"; value: LinkInput }
  | { kind: "link_folder"; value: LinkFolderInput };

/**
 * Create / edit form for one entity kind inside the popup shell.
 */
export function EntityFormView({
  kind,
  formMode,
  draft,
  onDraftChange,
  linkFolders,
  editingFolderId,
  mutationBusy,
  mutationError,
  onSave,
  onCancel,
}: {
  kind: EntityKind;
  formMode: "create" | "edit";
  draft: EntityFormDraft;
  onDraftChange: (draft: EntityFormDraft) => void;
  linkFolders: EntityListItem[];
  editingFolderId?: string;
  mutationBusy: boolean;
  mutationError: string | null;
  onSave: () => void;
  onCancel: () => void;
}): React.JSX.Element {
  const heading =
    formMode === "create"
      ? kind === "link_folder"
        ? "New folder"
        : `New ${kind === "tasks" ? "task" : kind.slice(0, -1)}`
      : "Edit";

  const parentFolderOptions = linkFolders.filter(
    (f) => f.id !== editingFolderId
  );

  const fields = (() => {
    switch (kind) {
      case "contacts": {
        const value =
          draft.kind === "contacts" ? draft.value : emptyContactInput();
        const set = (patch: Partial<ContactInput>) =>
          onDraftChange({ kind: "contacts", value: { ...value, ...patch } });
        return (
          <>
            <Field label="First name" required>
              <Input
                value={value.first_name}
                onChange={(e) => set({ first_name: e.target.value })}
              />
            </Field>
            <Field label="Last name">
              <Input
                value={value.last_name}
                onChange={(e) => set({ last_name: e.target.value })}
              />
            </Field>
            <Field label="Description">
              <Textarea
                value={value.description ?? ""}
                onChange={(e) => set({ description: e.target.value || null })}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={value.email ?? ""}
                onChange={(e) => set({ email: e.target.value || null })}
              />
            </Field>
            <Field label="Phone">
              <Input
                value={value.phone ?? ""}
                onChange={(e) => set({ phone: e.target.value || null })}
              />
            </Field>
            <Field label="Birthday">
              <Input
                type="date"
                value={value.birthday ?? ""}
                onChange={(e) => set({ birthday: e.target.value || null })}
              />
            </Field>
            <Field label="Notes">
              <EntityRichTextEditor
                value={value.notes ?? null}
                placeholder="Add notes…"
                disabled={mutationBusy}
                onChange={(notes) => set({ notes })}
              />
            </Field>
            <Field label="Category">
              <NativeSelect
                value={value.category_id ?? CONTACT_CATEGORIES[0].id}
                onChange={(e) => set({ category_id: e.target.value })}
              >
                {CONTACT_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </>
        );
      }
      case "notes": {
        const value = draft.kind === "notes" ? draft.value : { title: "" };
        const set = (patch: Partial<NoteInput>) =>
          onDraftChange({ kind: "notes", value: { ...value, ...patch } });
        return (
          <>
            <Field label="Title" required>
              <Input
                value={value.title}
                onChange={(e) => set({ title: e.target.value })}
              />
            </Field>
            <Field label="Description">
              <EntityRichTextEditor
                value={value.description ?? null}
                placeholder="Add a description…"
                disabled={mutationBusy}
                onChange={(description) => set({ description })}
              />
            </Field>
            <Field label="Category">
              <NativeSelect
                value={value.category_id ?? NOTE_CATEGORIES[0].id}
                onChange={(e) => set({ category_id: e.target.value })}
              >
                {NOTE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </>
        );
      }
      case "tasks": {
        const value = draft.kind === "tasks" ? draft.value : { title: "" };
        const set = (patch: Partial<TaskInput>) =>
          onDraftChange({ kind: "tasks", value: { ...value, ...patch } });
        return (
          <>
            <Field label="Title" required>
              <Input
                value={value.title}
                onChange={(e) => set({ title: e.target.value })}
              />
            </Field>
            <Field label="Description">
              <EntityRichTextEditor
                value={value.description ?? null}
                placeholder="Add a description…"
                disabled={mutationBusy}
                onChange={(description) => set({ description })}
              />
            </Field>
            <Field label="Start date">
              <Input
                type="date"
                value={value.start_date ?? ""}
                onChange={(e) => set({ start_date: e.target.value || null })}
              />
            </Field>
            <Field label="End date">
              <Input
                type="date"
                value={value.end_date ?? ""}
                onChange={(e) => set({ end_date: e.target.value || null })}
              />
            </Field>
            <Field label="Stage">
              <NativeSelect
                value={value.stage_id ?? TASK_STAGES[0].id}
                onChange={(e) => set({ stage_id: e.target.value })}
              >
                {TASK_STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Label">
              <NativeSelect
                value={value.label_id ?? TASK_LABELS[0].id}
                onChange={(e) => set({ label_id: e.target.value })}
              >
                {TASK_LABELS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Priority">
              <NativeSelect
                value={String(value.priority ?? 0)}
                onChange={(e) =>
                  set({ priority: Number.parseInt(e.target.value, 10) })
                }
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </>
        );
      }
      case "links": {
        const value =
          draft.kind === "links" ? draft.value : { name: "", url: "" };
        const set = (patch: Partial<LinkInput>) =>
          onDraftChange({ kind: "links", value: { ...value, ...patch } });
        return (
          <>
            <Field label="Name" required>
              <Input
                value={value.name}
                onChange={(e) => set({ name: e.target.value })}
              />
            </Field>
            <Field label="URL" required>
              <Input
                type="url"
                value={value.url}
                onChange={(e) => set({ url: e.target.value })}
              />
            </Field>
            <Field label="Folder">
              <NativeSelect
                value={value.folder_id ?? ""}
                onChange={(e) =>
                  set({
                    folder_id: e.target.value === "" ? null : e.target.value,
                  })
                }
              >
                <option value="">Unfiled</option>
                {linkFolders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </>
        );
      }
      case "link_folder": {
        const value =
          draft.kind === "link_folder"
            ? draft.value
            : { name: "", parent_folder_id: null };
        const set = (patch: Partial<LinkFolderInput>) =>
          onDraftChange({
            kind: "link_folder",
            value: { ...value, ...patch },
          });
        return (
          <>
            <Field label="Name" required>
              <Input
                value={value.name}
                onChange={(e) => set({ name: e.target.value })}
              />
            </Field>
            <Field label="Parent folder">
              <NativeSelect
                value={value.parent_folder_id ?? ""}
                onChange={(e) =>
                  set({
                    parent_folder_id:
                      e.target.value === "" ? null : e.target.value,
                  })
                }
              >
                <option value="">None (root)</option>
                {parentFolderOptions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </>
        );
      }
    }
  })();

  return (
    <EntityScreenLayout
      header={
        <div className="flex items-center gap-1 pb-2">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={onCancel}
            disabled={mutationBusy}
          >
            <ArrowLeft className="size-4" />
            <span className="sr-only">Cancel</span>
          </Button>
          <h2 className="min-w-0 flex-1 truncate text-sm font-medium">
            {heading}
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
              className="flex-1"
              onClick={onCancel}
              disabled={mutationBusy}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              type="button"
              className="flex-1"
              onClick={onSave}
              disabled={mutationBusy}
            >
              {mutationBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </>
      }
    >
      <div className="flex flex-col gap-3 pb-2">{fields}</div>
    </EntityScreenLayout>
  );
}

/**
 *
 */
function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="space-y-1">
      <Label className="text-xs">
        {label}
        {required ? " *" : null}
      </Label>
      {children}
    </div>
  );
}
