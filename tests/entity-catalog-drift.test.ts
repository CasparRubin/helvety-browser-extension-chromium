import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testsDir, "..");
const helvetyRoot = join(repoRoot, ".helvety");

/** Reads a monorepo file from the vendored `.helvety` tree. */
function readMonorepoFile(relativePath: string): string {
  return readFileSync(join(helvetyRoot, relativePath), "utf8");
}

/** Extracts catalog ids from a named exported array literal. */
function extractCatalogIds(source: string, arrayName: string): string[] {
  const block = source.match(
    new RegExp(`export const ${arrayName}[^=]*=\\s*\\[([\\s\\S]*?)\\];`)
  );
  if (!block) {
    throw new Error(`Could not find export const ${arrayName}`);
  }
  return [...block[1].matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]);
}

describe("entity catalog drift vs monorepo defaults", () => {
  it("TASK_STAGES ids match apps/tasks default-stages", () => {
    const extensionSource = readFileSync(
      join(repoRoot, "src/lib/entity-catalogs.ts"),
      "utf8"
    );
    const monorepoSource = readMonorepoFile(
      "apps/tasks/lib/config/default-stages.ts"
    );
    const extensionIds = extractCatalogIds(extensionSource, "TASK_STAGES");
    const monorepoIds = [
      ...monorepoSource.matchAll(/id:\s*"(default-item-[^"]+)"/g),
    ].map((m) => m[1]);
    expect(extensionIds).toEqual(monorepoIds);
  });

  it("TASK_LABELS ids match apps/tasks default-labels", () => {
    const extensionSource = readFileSync(
      join(repoRoot, "src/lib/entity-catalogs.ts"),
      "utf8"
    );
    const monorepoSource = readMonorepoFile(
      "apps/tasks/lib/config/default-labels.ts"
    );
    const extensionIds = extractCatalogIds(extensionSource, "TASK_LABELS");
    const monorepoIds = [
      ...monorepoSource.matchAll(/id:\s*"(default-label-[^"]+)"/g),
    ].map((m) => m[1]);
    expect(extensionIds).toEqual(monorepoIds);
  });

  it("NOTE_CATEGORIES ids match apps/notes default-note-categories", () => {
    const extensionSource = readFileSync(
      join(repoRoot, "src/lib/entity-catalogs.ts"),
      "utf8"
    );
    const monorepoSource = readMonorepoFile(
      "apps/notes/lib/config/default-note-categories.ts"
    );
    const extensionIds = extractCatalogIds(extensionSource, "NOTE_CATEGORIES");
    const monorepoIds = extractCatalogIds(
      monorepoSource,
      "DEFAULT_NOTE_CATEGORIES"
    );
    expect(extensionIds).toEqual(monorepoIds);
  });

  it("CONTACT_CATEGORIES ids match apps/contacts default-categories", () => {
    const extensionSource = readFileSync(
      join(repoRoot, "src/lib/entity-catalogs.ts"),
      "utf8"
    );
    const monorepoSource = readMonorepoFile(
      "apps/contacts/lib/config/default-categories.ts"
    );
    const extensionIds = extractCatalogIds(extensionSource, "NOTE_CATEGORIES");
    const monorepoIds = extractCatalogIds(monorepoSource, "DEFAULT_CATEGORIES");
    expect(extensionIds).toEqual(monorepoIds);
  });
});
