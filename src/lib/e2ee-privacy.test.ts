import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { PLAINTEXT_CONTENT_FIELD_NAMES } from "./e2ee-privacy";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("e2ee-privacy invariants", () => {
  it("entity-repository never uses star selects on entity tables", () => {
    const source = readFileSync(
      join(repoRoot, "src/lib/entity-repository.ts"),
      "utf8"
    );
    expect(source).not.toMatch(/\.select\s*\(\s*["'`]\*/);
    expect(source).not.toMatch(/\.select\s*\(\s*\*\s*\)/);
  });

  it("plaintext content field names stay out of narrow select strings", () => {
    const selectSource = readFileSync(
      join(repoRoot, "src/lib/e2ee-data-select.ts"),
      "utf8"
    );
    for (const field of PLAINTEXT_CONTENT_FIELD_NAMES) {
      expect(selectSource).not.toMatch(new RegExp(`\\b${field}\\b(?!_)`, "g"));
    }
  });
});
