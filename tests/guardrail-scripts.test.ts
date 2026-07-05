import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("extension auth consistency script", () => {
  it("passes when extension auth wiring matches monorepo expectations", () => {
    const output = execFileSync(
      process.execPath,
      [join(repoRoot, "scripts", "check-extension-auth-consistency.mjs")],
      { cwd: repoRoot, encoding: "utf8" }
    );
    expect(output).toContain("consistency:extension-auth OK");
  });
});

describe("extension E2EE consistency script", () => {
  it("passes when extension E2EE wiring matches monorepo expectations", () => {
    const output = execFileSync(
      process.execPath,
      [join(repoRoot, "scripts", "check-extension-e2ee-consistency.mjs")],
      { cwd: repoRoot, encoding: "utf8" }
    );
    expect(output).toContain("consistency:extension-e2ee OK");
  });
});
