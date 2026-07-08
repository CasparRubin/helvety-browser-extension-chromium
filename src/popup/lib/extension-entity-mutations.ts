import {
  assertMatchingDraftKind,
  getEntityFormDescriptor,
  type EntityDraftByKind,
  type EntityRecordByKind,
} from "./entity-form-descriptors";

import type { EntityRepository } from "../../lib/entity-repository";
import type { EntityKind } from "../../lib/entity-types";
import type { EntityFormDraft } from "../views/EntityFormView";

/** Loads one decrypted entity for the edit form. */
export async function fetchEntity<K extends EntityKind>(
  repo: EntityRepository,
  kind: K,
  id: string
): Promise<EntityRecordByKind[K]> {
  return getEntityFormDescriptor(kind).fetch(repo, id);
}

/** Maps a decrypted repository record into form draft state. */
export function draftFromRecord<K extends EntityKind>(
  kind: K,
  record: EntityRecordByKind[K]
): EntityDraftByKind[K] {
  return getEntityFormDescriptor(kind).toDraft(record);
}

/** Persists a new entity and returns its id. */
export async function createEntity(
  repo: EntityRepository,
  draft: EntityFormDraft,
  clientRecordId?: string
): Promise<string> {
  const descriptor = getEntityFormDescriptor(draft.kind);
  return descriptor.create(repo, draft.value, clientRecordId);
}

/** Persists edits to an existing entity. */
export async function updateEntity(
  repo: EntityRepository,
  kind: EntityKind,
  id: string,
  draft: EntityFormDraft
): Promise<void> {
  assertMatchingDraftKind(kind, draft);
  const descriptor = getEntityFormDescriptor(kind);
  await descriptor.update(repo, id, draft.value);
}

/** Deletes one entity by kind and id. */
export async function deleteEntity(
  repo: EntityRepository,
  kind: EntityKind,
  id: string
): Promise<void> {
  await getEntityFormDescriptor(kind).remove(repo, id);
}

/** Human-readable label for delete confirmation from the current draft. */
export function deleteLabelFromDraft(
  kind: EntityKind,
  draft: EntityFormDraft | null
): string | null {
  if (draft?.kind !== kind) {
    return null;
  }
  assertMatchingDraftKind(kind, draft);
  return getEntityFormDescriptor(kind).getDeleteLabel(draft);
}
