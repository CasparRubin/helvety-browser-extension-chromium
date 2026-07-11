import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function readSource(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

describe("extension shared config wiring", () => {
  it("vitest.setup.ts composes shared and jest-dom setup", () => {
    const setup = readSource("vitest.setup.ts");

    expect(setup).toContain("@helvety/config/vitest.setup");
    expect(setup).toMatch(/@testing-library\/jest-dom\/vitest/);
  });

  it("package.json exposes test:coverage aligned with monorepo vitest factory", () => {
    const packageJson = JSON.parse(
      readFileSync(join(repoRoot, "package.json"), "utf8")
    ) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.["test:coverage"]).toBe(
      "vitest run --coverage"
    );
  });

  it("uses shared prettier.config.mjs instead of legacy .prettierrc", () => {
    expect(existsSync(join(repoRoot, "prettier.config.mjs"))).toBe(true);
    expect(existsSync(join(repoRoot, ".prettierrc"))).toBe(false);
  });

  it(".gitignore excludes coverage artifacts and tsbuildinfo", () => {
    const gitignore = readSource(".gitignore");

    expect(gitignore).toContain("coverage/");
    expect(gitignore).toContain("*.tsbuildinfo");
  });

  it("vendored @helvety/config exports extension factories", () => {
    const configPackage = JSON.parse(
      readFileSync(
        join(repoRoot, ".helvety/packages/config/package.json"),
        "utf8"
      )
    ) as { exports?: Record<string, unknown> };

    expect(configPackage.exports?.["./tsconfig.extension.json"]).toBe(
      "./tsconfig.extension.json"
    );
    expect(configPackage.exports?.["./vitest-extension"]).toEqual({
      types: "./vitest-extension.d.ts",
      default: "./vitest-extension.mjs",
    });
  });
});
