import { describe, expect, it, vi } from "vitest";

import { PLAINTEXT_CONTENT_FIELD_NAMES } from "./e2ee-privacy";
import { EntityLinkRepository } from "./entity-link-repository";

import type { EntityRepository } from "./entity-repository";
import type { ContactListRow } from "./entity-types";

const USER_ID = "00000000-0000-4000-8000-000000000099";
const TASK_ID = "00000000-0000-4000-8000-000000000001";
const CONTACT_ID = "00000000-0000-4000-8000-000000000002";
const LINK_ROW_ID = "00000000-0000-4000-8000-000000000010";

const PLAINTEXT_FIELD_KEYS = new Set<string>(PLAINTEXT_CONTENT_FIELD_NAMES);

/** Builds a minimal Supabase mock for link repository tests. */
function createSupabaseMock(
  options: {
    linkInsertError?: { code: string; message: string } | null;
    entityLinks?: Array<Record<string, unknown>>;
    onInsert?: (payload: Record<string, unknown>) => void;
  } = {}
) {
  return {
    from: vi.fn((table: string) => {
      if (table === "items" || table === "contacts") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({ data: { id: "ok" }, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === "entity_links") {
        return {
          insert: (payload: Record<string, unknown>) => {
            options.onInsert?.(payload);
            return {
              select: () => ({
                single: async () =>
                  options.linkInsertError
                    ? { data: null, error: options.linkInsertError }
                    : {
                        data: { id: LINK_ROW_ID, created_at: "2026-01-01" },
                        error: null,
                      },
              }),
            };
          },
          select: () => ({
            eq: () => ({
              or: () => ({
                order: () => ({
                  overrideTypes: async () => ({
                    data: options.entityLinks ?? [],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
          delete: () => ({
            eq: () => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    }),
  };
}

const sampleContact: ContactListRow = {
  id: CONTACT_ID,
  first_name: "Ada",
  last_name: "Lovelace",
  category_id: "personal",
  sort_order: 0,
  created_at: "2026-01-01",
};

describe("EntityLinkRepository", () => {
  it("creates links via shared client helper", async () => {
    const repo = new EntityLinkRepository(
      createSupabaseMock() as never,
      USER_ID,
      {} as EntityRepository
    );

    await expect(
      repo.linkEntities("items", TASK_ID, "contacts", CONTACT_ID)
    ).resolves.toBeUndefined();
  });

  it("link insert payloads never include plaintext entity content fields", async () => {
    let insertPayload: Record<string, unknown> | undefined;
    const repo = new EntityLinkRepository(
      createSupabaseMock({
        onInsert: (payload) => {
          insertPayload = payload;
        },
      }) as never,
      USER_ID,
      {} as EntityRepository
    );

    await repo.linkEntities("items", TASK_ID, "contacts", CONTACT_ID);

    expect(insertPayload).toBeDefined();
    for (const key of Object.keys(insertPayload ?? {})) {
      expect(PLAINTEXT_FIELD_KEYS.has(key)).toBe(false);
    }
    expect(insertPayload).toMatchObject({
      user_id: USER_ID,
      relation_type: "related",
    });
  });

  it("maps duplicate link errors to friendly copy", async () => {
    const repo = new EntityLinkRepository(
      createSupabaseMock({
        linkInsertError: { code: "23505", message: "dup" },
      }) as never,
      USER_ID,
      {} as EntityRepository
    );

    await expect(
      repo.linkEntities("items", TASK_ID, "contacts", CONTACT_ID)
    ).rejects.toThrow("These records are already linked.");
  });

  it("unlinks rows scoped to the authenticated user", async () => {
    const supabase = createSupabaseMock();
    const repo = new EntityLinkRepository(
      supabase as never,
      USER_ID,
      {} as EntityRepository
    );

    await expect(repo.unlink(LINK_ROW_ID)).resolves.toBeUndefined();
    const linksTable = supabase.from.mock.results.find(
      (call) => call.value?.delete
    );
    expect(linksTable).toBeDefined();
  });

  it("loadTaskContactLinks joins link rows with decrypted catalog rows", async () => {
    const repo = new EntityLinkRepository(
      createSupabaseMock({
        entityLinks: [
          {
            id: LINK_ROW_ID,
            user_id: USER_ID,
            source_entity_type: "items",
            source_entity_id: TASK_ID,
            target_entity_type: "contacts",
            target_entity_id: CONTACT_ID,
            relation_type: "related",
            metadata: {},
            created_at: "2026-01-01T00:00:00Z",
          },
        ],
      }) as never,
      USER_ID,
      {
        listContacts: vi.fn().mockResolvedValue([sampleContact]),
      } as unknown as EntityRepository
    );

    const result = await repo.loadTaskContactLinks(TASK_ID);

    expect(result.allItems).toEqual([sampleContact]);
    expect(result.linkedItems).toEqual([
      {
        ...sampleContact,
        link_id: LINK_ROW_ID,
        linked_at: "2026-01-01T00:00:00Z",
      },
    ]);
  });
});
