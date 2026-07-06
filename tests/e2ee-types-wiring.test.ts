import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testsDir, "..");

describe("E2EE types wiring (extension)", () => {
  it("entity-types.ts only re-exports from @helvety/shared/e2ee-domain-types", () => {
    const src = readFileSync(join(repoRoot, "src/lib/entity-types.ts"), "utf8");
    expect(src).toContain("@helvety/shared/e2ee-domain-types");
    expect(src).not.toMatch(/export interface /);
    expect(src).not.toMatch(/export type \w+ =/);
  });
});
