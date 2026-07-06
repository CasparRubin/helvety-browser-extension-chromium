import {
  CONTACT_CATEGORIES,
  NOTE_CATEGORIES,
  TASK_LABELS,
  TASK_STAGES,
} from "@helvety/shared/e2ee-entity-catalogs";
import { Button } from "@helvety/ui/button";
import { E2EE_EDITOR_FORM_FIELDS_STACK_CLASS } from "@helvety/ui/e2ee-form-layout";
import { FormField } from "@helvety/ui/form-field";
import { Input } from "@helvety/ui/input";
import { NativeSelect } from "@helvety/ui/native-select";
import { Textarea } from "@helvety/ui/textarea";
import { Loader2 } from "lucide-react";

import {
  CategoryPicker,
  PriorityPicker,
  TaskLabelPicker,
  TaskStagePicker,
} from "../components/catalog-picker";
import { EntityRichTextEditor } from "../components/EntityRichTextEditor";
import { EntityScreenLayout } from "../components/EntityScreenLayout";
import {
  ContactEntityLinkPanels,
  LinkEntityLinkPanels,
  NoteEntityLinkPanels,
  TaskEntityLinkPanels,
} from "../components/ExtensionEntityLinkPanels";
import { emptyContactInput } from "../entity-drafts";

import type {
  ContactInput,
  EntityListItem,
  EntityKind,
  LinkFolderInput,
  LinkInput,
  NoteInput,
  TaskInput,
} from "../../lib/entity-types";
import type { E2eeFormDraft } from "@helvety/shared/validate-e2ee-draft";

/**
 *
 */
export type EntityFormDraft = E2eeFormDraft;

/**
 * Create / edit form for one entity kind inside the side panel shell.
 */
export function EntityFormView({
  kind,
  formMode,
  editingEntityId,
  formSessionKey,
  draft,
  onDraftChange,
  linkFolders,
  editingFolderId,
  mutationBusy,
  mutationError,
  hasUnsavedChanges,
  onSave,
}: {
  kind: EntityKind;
  formMode: "create" | "edit";
  /** Set in edit mode for entity link panels. */
  editingEntityId?: string;
  /** Passed to TipTap as `sessionKey` — stable while editing one record (`entityFormSessionKey`). */
  formSessionKey: string;
  draft: EntityFormDraft;
  onDraftChange: (draft: EntityFormDraft) => void;
  linkFolders: EntityListItem[];
  editingFolderId?: string;
  mutationBusy: boolean;
  mutationError: string | null;
  hasUnsavedChanges: boolean;
  onSave: () => void;
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
            <FormField label="First name" required>
              <Input
                value={value.first_name}
                onChange={(e) => set({ first_name: e.target.value })}
              />
            </FormField>
            <FormField label="Last name">
              <Input
                value={value.last_name}
                onChange={(e) => set({ last_name: e.target.value })}
              />
            </FormField>
            <FormField label="Description">
              <Textarea
                value={value.description ?? ""}
                onChange={(e) => set({ description: e.target.value || null })}
              />
            </FormField>
            <FormField label="Email">
              <Input
                type="email"
                value={value.email ?? ""}
                onChange={(e) => set({ email: e.target.value || null })}
              />
            </FormField>
            <FormField label="Phone">
              <Input
                value={value.phone ?? ""}
                onChange={(e) => set({ phone: e.target.value || null })}
              />
            </FormField>
            <FormField label="Birthday">
              <Input
                type="date"
                value={value.birthday ?? ""}
                onChange={(e) => set({ birthday: e.target.value || null })}
              />
            </FormField>
            <FormField label="Notes">
              <EntityRichTextEditor
                sessionKey={formSessionKey}
                value={value.notes ?? null}
                placeholder="Add notes…"
                disabled={mutationBusy}
                onChange={(notes) => set({ notes })}
              />
            </FormField>
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
            <FormField label="Title" required>
              <Input
                value={value.title}
                onChange={(e) => set({ title: e.target.value })}
              />
            </FormField>
            <FormField label="Description">
              <EntityRichTextEditor
                sessionKey={formSessionKey}
                value={value.description ?? null}
                placeholder="Add a description…"
                disabled={mutationBusy}
                onChange={(description) => set({ description })}
              />
            </FormField>
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
            <FormField label="Title" required>
              <Input
                value={value.title}
                onChange={(e) => set({ title: e.target.value })}
              />
            </FormField>
            <FormField label="Description">
              <EntityRichTextEditor
                sessionKey={formSessionKey}
                value={value.description ?? null}
                placeholder="Add a description…"
                disabled={mutationBusy}
                onChange={(description) => set({ description })}
              />
            </FormField>
            <FormField label="Start date">
              <Input
                type="date"
                value={value.start_date ?? ""}
                onChange={(e) => set({ start_date: e.target.value || null })}
              />
            </FormField>
            <FormField label="End date">
              <Input
                type="date"
                value={value.end_date ?? ""}
                onChange={(e) => set({ end_date: e.target.value || null })}
              />
            </FormField>
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
            <FormField label="Name" required>
              <Input
                value={value.name}
                onChange={(e) => set({ name: e.target.value })}
              />
            </FormField>
            <FormField label="URL" required>
              <Input
                type="url"
                value={value.url}
                onChange={(e) => set({ url: e.target.value })}
              />
            </FormField>
            <FormField label="Folder">
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
            </FormField>
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
            <FormField label="Name" required>
              <Input
                value={value.name}
                onChange={(e) => set({ name: e.target.value })}
              />
            </FormField>
            <FormField label="Parent folder">
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
            </FormField>
          </>
        );
      }
    }
  })();

  const canSave =
    formMode === "create" ? !mutationBusy : hasUnsavedChanges && !mutationBusy;

  return (
    <EntityScreenLayout
      footer={
        <>
          {mutationError ? (
            <p className="text-destructive mb-2 text-xs" role="alert">
              {mutationError}
            </p>
          ) : null}
          <Button
            size="sm"
            type="button"
            className="w-full"
            onClick={onSave}
            disabled={!canSave}
          >
            {mutationBusy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : formMode === "edit" && hasUnsavedChanges ? (
              "Save changes"
            ) : (
              "Save"
            )}
          </Button>
        </>
      }
    >
      <div className={E2EE_EDITOR_FORM_FIELDS_STACK_CLASS}>
        {fields}
        {formMode === "edit" && editingEntityId ? (
          kind === "tasks" ? (
            <TaskEntityLinkPanels taskId={editingEntityId} />
          ) : kind === "notes" ? (
            <NoteEntityLinkPanels noteId={editingEntityId} />
          ) : kind === "contacts" ? (
            <ContactEntityLinkPanels contactId={editingEntityId} />
          ) : kind === "links" ? (
            <LinkEntityLinkPanels linkId={editingEntityId} />
          ) : null
        ) : null}
      </div>
    </EntityScreenLayout>
  );
}
