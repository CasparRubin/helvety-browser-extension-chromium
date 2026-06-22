import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("extension dependency pins", () => {
  const packageJson = JSON.parse(
    readFileSync(join(repoRoot, "package.json"), "utf8")
  ) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    pnpm?: { overrides?: Record<string, string> };
    overrides?: Record<string, string>;
  };

  it("uses pnpm.overrides for Helvety file: deps (not root overrides)", () => {
    expect(packageJson.pnpm?.overrides).toBeTruthy();
    expect(packageJson.overrides).toBeUndefined();
    expect(packageJson.pnpm?.overrides?.["@helvety/ui"]).toContain(
      "file:.helvety/packages/ui"
    );
  });

  it("pins lucide-react, tailwindcss, and @types/chrome to current monorepo toolchain", () => {
    expect(packageJson.dependencies?.["lucide-react"]).toBe("^1.21.0");
    expect(packageJson.devDependencies?.tailwindcss).toBe("^4.3.1");
    expect(packageJson.devDependencies?.["@types/chrome"]).toBe("^0.2.0");
  });

  it("README documents tests/ layout including dependency guard suites", () => {
    const readme = readFileSync(join(repoRoot, "README.md"), "utf8");
    expect(readme).toContain("dependency-pins");
    expect(readme).toContain("entity-catalog-drift");
  });
});
