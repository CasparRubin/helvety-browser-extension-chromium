import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("E2EE crypto wiring (extension)", () => {
  it("encrypt-entities re-exports @helvety/shared/crypto/e2ee-entity-crypto", () => {
    const src = readFileSync(
      join(repoRoot, "src/lib/encrypt-entities.ts"),
      "utf8"
    );
    expect(src).toContain("@helvety/shared/crypto/e2ee-entity-crypto");
    expect(src).not.toContain("encryptEntityField");
    expect(src).not.toContain("decryptEntityField");
    expect(src).not.toMatch(/\bawait\s+encrypt\s*\(/);
    expect(src).not.toMatch(/\bawait\s+decrypt\s*\(/);
  });

  it("decrypt-entities delegates to the encrypt-entities barrel", () => {
    const src = readFileSync(
      join(repoRoot, "src/lib/decrypt-entities.ts"),
      "utf8"
    );
    expect(src).toContain("./encrypt-entities");
    expect(src).not.toContain("encryptEntityField");
  });

  it("entity-repository imports crypto through extension facades", () => {
    const src = readFileSync(
      join(repoRoot, "src/lib/entity-repository.ts"),
      "utf8"
    );
    expect(src).toContain("./encrypt-entities");
    expect(src).toContain("./decrypt-entities");
    expect(src).not.toContain("encryptEntityField");
  });

  it("link-tree re-exports shared link-tree-ops", () => {
    const src = readFileSync(join(repoRoot, "src/lib/link-tree.ts"), "utf8");
    expect(src).toContain("@helvety/shared/link-tree-ops");
    expect(src).not.toMatch(/export function getLinkTreeChildren/);
  });

  it("list-group-utils re-exports shared entity-list-grouping", () => {
    const src = readFileSync(
      join(repoRoot, "src/popup/components/lists/list-group-utils.ts"),
      "utf8"
    );
    expect(src).toContain("@helvety/shared/entity-list-grouping");
    expect(src).not.toMatch(/export function groupEntitiesByKey/);
  });
});
