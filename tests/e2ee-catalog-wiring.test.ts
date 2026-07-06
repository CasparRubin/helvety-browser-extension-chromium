import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testsDir, "..");

const CATALOG_IMPORT_FILES = [
  "src/popup/components/catalog-picker.tsx",
  "src/popup/views/EntityFormView.tsx",
  "src/popup/components/lists/task-entity-list.tsx",
  "src/popup/components/lists/contact-entity-list.tsx",
  "src/popup/components/lists/note-entity-list.tsx",
];

describe("E2EE catalog wiring (extension)", () => {
  it("does not ship a local entity-catalogs module", () => {
    expect(() =>
      readFileSync(join(repoRoot, "src/lib/entity-catalogs.ts"), "utf8")
    ).toThrow();
  });

  it.each(CATALOG_IMPORT_FILES)(
    "%s imports catalogs from @helvety/shared/e2ee-entity-catalogs",
    (relativePath) => {
      const src = readFileSync(join(repoRoot, relativePath), "utf8");
      expect(src).toContain("@helvety/shared/e2ee-entity-catalogs");
      expect(src).not.toContain("lib/entity-catalogs");
    }
  );

  it("link-url-normalize re-exports shared module", () => {
    const src = readFileSync(
      join(repoRoot, "src/lib/link-url-normalize.ts"),
      "utf8"
    );
    expect(src).toContain("@helvety/shared/e2ee-url-normalize");
  });

  it("entity-config uses shared delete registry", () => {
    const src = readFileSync(
      join(repoRoot, "src/lib/entity-config.ts"),
      "utf8"
    );
    expect(src).toContain("defineEntityDeleteRegistry");
    expect(src).toContain("buildDeleteMessage");
  });
});
