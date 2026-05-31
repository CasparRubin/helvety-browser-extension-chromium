import { describe, expect, it, vi } from "vitest";

import { PLAINTEXT_CONTENT_FIELD_NAMES } from "./e2ee-privacy";
import { EntityRepository } from "./entity-repository";

const PLAINTEXT_FIELD_KEYS = new Set<string>(PLAINTEXT_CONTENT_FIELD_NAMES);

/**
 *
 */
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

/**
 *
 */
async function aes256GcmKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

describe("EntityRepository mutation payloads", () => {
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
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
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
});
