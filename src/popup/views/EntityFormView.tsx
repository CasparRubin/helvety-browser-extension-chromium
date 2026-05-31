import { Button } from "@helvety/ui/button";
import { Input } from "@helvety/ui/input";
import { Label } from "@helvety/ui/label";
import { NativeSelect } from "@helvety/ui/native-select";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";

import {
  CONTACT_CATEGORIES,
  NOTE_CATEGORIES,
  TASK_LABELS,
  TASK_STAGES,
} from "../../lib/entity-catalogs";
import {
  CategoryPicker,
  PriorityPicker,
  TaskLabelPicker,
  TaskStagePicker,
} from "../components/catalog-picker";
import { EntityRichTextEditor } from "../components/EntityRichTextEditor";
import { EntityScreenLayout } from "../components/EntityScreenLayout";
import { IconTooltipButton } from "../components/IconTooltipButton";
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
 * Create / edit form for one entity kind inside the side panel shell.
 */
export function EntityFormView({
  kind,
  formMode,
  formSessionKey,
  draft,
  onDraftChange,
  linkFolders,
  editingFolderId,
  mutationBusy,
  mutationError,
  onSave,
  onCancel,
  onDelete,
}: {
  kind: EntityKind;
  formMode: "create" | "edit";
  /** Passed to TipTap as `sessionKey` — stable while editing one record (`entityFormSessionKey`). */
  formSessionKey: string;
  draft: EntityFormDraft;
  onDraftChange: (draft: EntityFormDraft) => void;
  linkFolders: EntityListItem[];
  editingFolderId?: string;
  mutationBusy: boolean;
  mutationError: string | null;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}): React.JSX.Element {
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
                sessionKey={formSessionKey}
                value={value.notes ?? null}
                placeholder="Add notes…"
                disabled={mutationBusy}
                onChange={(notes) => set({ notes })}
              />
            </Field>
            <CategoryPicker
              entries={CONTACT_CATEGORIES}
              value={value.category_id ?? CONTACT_CATEGORIES[0].id}
              onChange={(id) => set({ category_id: id })}
            />
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
                sessionKey={formSessionKey}
                value={value.description ?? null}
                placeholder="Add a description…"
                disabled={mutationBusy}
                onChange={(description) => set({ description })}
              />
            </Field>
            <CategoryPicker
              entries={NOTE_CATEGORIES}
              value={value.category_id ?? NOTE_CATEGORIES[0].id}
              onChange={(id) => set({ category_id: id })}
            />
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
                sessionKey={formSessionKey}
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
            <TaskStagePicker
              value={value.stage_id ?? TASK_STAGES[0].id}
              onChange={(stageId) => set({ stage_id: stageId })}
            />
            <TaskLabelPicker
              value={value.label_id ?? TASK_LABELS[0].id}
              onChange={(labelId) => set({ label_id: labelId })}
            />
            <PriorityPicker
              value={value.priority ?? 1}
              onChange={(priority) => set({ priority })}
            />
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
          <IconTooltipButton
            label="Back"
            variant="ghost"
            size="sm"
            type="button"
            onClick={onCancel}
            disabled={mutationBusy}
          >
            <ArrowLeft className="size-4" />
          </IconTooltipButton>
          <span className="min-w-0 flex-1" />
        </div>
      }
      footer={
        <>
          {mutationError ? (
            <p className="text-destructive mb-2 text-xs" role="alert">
              {mutationError}
            </p>
          ) : null}
          {formMode === "edit" && onDelete ? (
            <Button
              variant="outline"
              size="sm"
              type="button"
              className="text-destructive hover:text-destructive mb-2 w-full"
              onClick={onDelete}
              disabled={mutationBusy}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
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
