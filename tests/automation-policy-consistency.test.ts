import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const STALE_AUTOMATION_PHRASES = [
  "GitHub Actions",
  ".github/workflows/ci.yml",
  ".github/workflows/",
  "Remote CI:",
  "## Automated (CI)",
  "## CI guardrail",
  "Optional CI/monorepo",
  "CI guards this",
  "CI checks expected",
  "CI guardrails keep",
  "Enforced in CI",
  "action-gh-release",
  "softprops/action-gh-release",
] as const;

describe("automation policy consistency", () => {
  it("does not ship GitHub Actions workflow files", async () => {
    await expect(
      access(join(repoRoot, ".github", "workflows"), constants.F_OK)
    ).rejects.toThrow();
  });

  it("README documents local-only validation and avoids stale remote-CI wording", async () => {
    const source = await readFile(join(repoRoot, "README.md"), "utf8");

    for (const phrase of STALE_AUTOMATION_PHRASES) {
      expect(
        source,
        `README.md contains stale phrase: ${phrase}`
      ).not.toContain(phrase);
    }

    expect(source).toContain("pnpm ci:check");
    expect(source).toContain("pnpm ci:release");
    expect(source).toMatch(/local only/i);
    expect(source).toMatch(/no remote automation/i);
    expect(source).toContain("automation-policy-consistency");
  });
});
