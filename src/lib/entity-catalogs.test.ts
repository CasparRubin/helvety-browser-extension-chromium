import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  CONTACT_CATEGORIES,
  NOTE_CATEGORIES,
  TASK_LABELS,
  TASK_STAGES,
} from "./entity-catalogs";

import type { CatalogEntry } from "./entity-catalogs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const vendorRoot = join(repoRoot, ".helvety");

/**
 *
 */
function assertMonorepoCatalogSync(
  entries: CatalogEntry[],
  monorepoRelativePath: string
): void {
  const sourcePath = join(vendorRoot, monorepoRelativePath);
  expect(existsSync(sourcePath)).toBe(true);
  const source = readFileSync(sourcePath, "utf8");
  for (const entry of entries) {
    const idMarker = `id: "${entry.id}"`;
    expect(source).toContain(idMarker);
    const idx = source.indexOf(idMarker);
    const slice = source.slice(idx, idx + 220);
    expect(slice).toContain(`color: "${entry.color}"`);
    expect(slice).toContain(`icon: "${entry.icon}"`);
  }
}

describe("entity-catalogs", () => {
  it("uses unique catalog ids within each list", () => {
    for (const list of [
      TASK_STAGES,
      TASK_LABELS,
      NOTE_CATEGORIES,
      CONTACT_CATEGORIES,
    ]) {
      const ids = list.map((entry) => entry.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("matches monorepo default stage/category catalogs when .helvety is present", () => {
    if (!existsSync(vendorRoot)) {
      return;
    }
    assertMonorepoCatalogSync(
      TASK_STAGES,
      "apps/tasks/lib/config/default-stages.ts"
    );
    assertMonorepoCatalogSync(
      TASK_LABELS.filter((entry) => entry.id !== "default-item-label"),
      "apps/tasks/lib/config/default-labels.ts"
    );
    assertMonorepoCatalogSync(
      NOTE_CATEGORIES,
      "apps/notes/lib/config/default-note-categories.ts"
    );
    assertMonorepoCatalogSync(
      CONTACT_CATEGORIES,
      "apps/contacts/lib/config/default-categories.ts"
    );
  });
});
