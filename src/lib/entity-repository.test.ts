import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PLAINTEXT_CONTENT_FIELD_NAMES } from "@helvety/shared/e2ee-write-guard";
import { describe, expect, it, vi } from "vitest";

import { EntityRepository } from "./entity-repository";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

const PLAINTEXT_FIELD_KEYS = new Set<string>(PLAINTEXT_CONTENT_FIELD_NAMES);

function assertNoPlaintextEntityFields(payload: Record<string, unknown>): void {
  for (const key of Object.keys(payload)) {
    expect(PLAINTEXT_FIELD_KEYS.has(key)).toBe(false);
  }
  for (const value of Object.values(payload)) {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      assertNoPlaintextEntityFields(value as Record<string, unknown>);
    }
  }
}

async function aes256GcmKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

function createOwnedUpdateChain(result: {
  data: { id: string } | null;
  error: unknown;
}) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const select = vi.fn(() => ({ maybeSingle }));
  const updateEqUser = vi.fn(() => ({ select }));
  const updateEqId = vi.fn(() => ({ eq: updateEqUser }));
  const update = vi.fn().mockReturnValue({ eq: updateEqId });
  return { update, maybeSingle };
}

describe("EntityRepository mutation payloads", () => {
  it("never uses star selects on entity tables", () => {
    const source = readFileSync(
      join(repoRoot, "src/lib/entity-repository.ts"),
      "utf8"
    );
    expect(source).not.toMatch(/\.select\s*\(\s*["'`]\*/);
    expect(source).not.toMatch(/\.select\s*\(\s*\*\s*\)/);
    expect(source).toContain("assertOwnedRowUpdated");
    expect(source).toMatch(/\.select\("id"\)\s*\n\s*\.maybeSingle\(\)/);
  });

  it("inserts contacts with ciphertext keys only", async () => {
    const key = await aes256GcmKey();
    const insert = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      from: vi.fn(() => ({
        insert,
        update: vi.fn(),
        delete: vi.fn(),
        select: vi.fn(),
      })),
    };

    const repo = new EntityRepository(supabase as never, "user-1", key);
    await repo.createContact({
      first_name: "Ada",
      last_name: "Lovelace",
      email: "ada@example.com",
    });

    expect(insert).toHaveBeenCalledOnce();
    const payload = insert.mock.calls[0][0] as Record<string, unknown>;
    assertNoPlaintextEntityFields(payload);
    expect(payload).toHaveProperty("encrypted_first_name");
    expect(payload).toHaveProperty("user_id", "user-1");
  });

  it("updates links with ciphertext keys only", async () => {
    const key = await aes256GcmKey();
    const { update } = createOwnedUpdateChain({
      data: { id: "44444444-4444-4444-8444-444444444444" },
      error: null,
    });
    const supabase = {
      from: vi.fn(() => ({
        insert: vi.fn(),
        update,
        delete: vi.fn(),
        select: vi.fn(),
      })),
    };

    const repo = new EntityRepository(supabase as never, "user-1", key);
    await repo.updateLink("44444444-4444-4444-8444-444444444444", {
      name: "Docs",
      url: "https://helvety.com",
    });

    expect(update).toHaveBeenCalledOnce();
    const payload = update.mock.calls[0][0] as Record<string, unknown>;
    assertNoPlaintextEntityFields(payload);
    expect(payload).toHaveProperty("encrypted_url");
    expect(payload).toHaveProperty("updated_at");
  });

  it("updateLink throws when the owned row is missing", async () => {
    const key = await aes256GcmKey();
    const { update } = createOwnedUpdateChain({ data: null, error: null });
    const supabase = {
      from: vi.fn(() => ({
        insert: vi.fn(),
        update,
        delete: vi.fn(),
        select: vi.fn(),
      })),
    };

    const repo = new EntityRepository(supabase as never, "user-1", key);
    await expect(
      repo.updateLink("44444444-4444-4444-8444-444444444444", {
        name: "Docs",
        url: "https://helvety.com",
      })
    ).rejects.toThrow("Link not found");
  });

  it("createTask uses clientRecordId as the inserted row id", async () => {
    const key = await aes256GcmKey();
    const clientId = "550e8400-e29b-41d4-a716-446655440000";
    const insert = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      from: vi.fn(() => ({
        insert,
        update: vi.fn(),
        delete: vi.fn(),
        select: vi.fn(),
      })),
    };

    const repo = new EntityRepository(supabase as never, "user-1", key);
    const returnedId = await repo.createTask(
      { title: "Save-first task" },
      clientId
    );

    expect(returnedId).toBe(clientId);
    const payload = insert.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.id).toBe(clientId);
    assertNoPlaintextEntityFields(payload);
  });

  it("inserts tasks with encrypted_title only (no plaintext title)", async () => {
    const key = await aes256GcmKey();
    const insert = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      from: vi.fn(() => ({
        insert,
        update: vi.fn(),
        delete: vi.fn(),
        select: vi.fn(),
      })),
    };

    const repo = new EntityRepository(supabase as never, "user-1", key);
    await repo.createTask({ title: "Secret task name" });

    const payload = insert.mock.calls[0][0] as Record<string, unknown>;
    assertNoPlaintextEntityFields(payload);
    expect(payload).toHaveProperty("encrypted_title");
    expect(String(payload.encrypted_title)).toMatch(/^\{/);
  });

  it("reorderTasks updates stage_id and sort_order", async () => {
    const key = await aes256GcmKey();
    const eqChain = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({ eq: eqChain }),
    });
    const supabase = {
      from: vi.fn(() => ({
        insert: vi.fn(),
        update,
        delete: vi.fn(),
        select: vi.fn(),
      })),
    };

    const repo = new EntityRepository(supabase as never, "user-1", key);
    await repo.reorderTasks([
      { id: "task-1", sort_order: 2, stage_id: "default-item-ready" },
    ]);

    expect(update).toHaveBeenCalledOnce();
    const payload = update.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      sort_order: 2,
      stage_id: "default-item-ready",
    });
    expect(payload).toHaveProperty("updated_at");
  });

  it("reorderLinks updates sort_order", async () => {
    const key = await aes256GcmKey();
    const eqChain = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({ eq: eqChain }),
    });
    const supabase = {
      from: vi.fn(() => ({
        insert: vi.fn(),
        update,
        delete: vi.fn(),
        select: vi.fn(),
      })),
    };

    const repo = new EntityRepository(supabase as never, "user-1", key);
    await repo.reorderLinks([{ id: "link-1", sort_order: 3 }]);

    expect(update).toHaveBeenCalledOnce();
    const payload = update.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({ sort_order: 3 });
    expect(payload).toHaveProperty("updated_at");
  });

  it("reorderLinkFolders updates sort_order", async () => {
    const key = await aes256GcmKey();
    const eqChain = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({ eq: eqChain }),
    });
    const supabase = {
      from: vi.fn(() => ({
        insert: vi.fn(),
        update,
        delete: vi.fn(),
        select: vi.fn(),
      })),
    };

    const repo = new EntityRepository(supabase as never, "user-1", key);
    await repo.reorderLinkFolders([{ id: "folder-1", sort_order: 1 }]);

    expect(update).toHaveBeenCalledOnce();
    const payload = update.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({ sort_order: 1 });
    expect(payload).toHaveProperty("updated_at");
  });

  it("inserts link folders with encrypted_name only", async () => {
    const key = await aes256GcmKey();
    const insert = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      from: vi.fn(() => ({
        insert,
        update: vi.fn(),
        delete: vi.fn(),
        select: vi.fn(),
      })),
    };

    const repo = new EntityRepository(supabase as never, "user-1", key);
    await repo.createLinkFolder({ name: "Reading", parent_folder_id: null });

    expect(insert).toHaveBeenCalledOnce();
    const payload = insert.mock.calls[0][0] as Record<string, unknown>;
    assertNoPlaintextEntityFields(payload);
    expect(payload).toHaveProperty("encrypted_name");
    expect(String(payload.encrypted_name)).toMatch(/^\{/);
  });
});
