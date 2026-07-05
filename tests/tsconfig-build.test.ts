import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 *
 */
function readSource(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

describe("TypeScript and build config", () => {
  it("tsconfig avoids deprecated TS 6 options (no ignoreDeprecations escape hatch)", () => {
    const tsconfig = JSON.parse(
      readFileSync(join(repoRoot, "tsconfig.json"), "utf8")
    ) as {
      compilerOptions?: Record<string, unknown>;
    };

    expect(tsconfig.compilerOptions?.ignoreDeprecations).toBeUndefined();
    expect(tsconfig.compilerOptions?.baseUrl).toBeUndefined();
    expect(tsconfig.compilerOptions?.paths).toBeUndefined();
  });

  it("vite resolve aliases are limited to required CSS package imports", () => {
    const viteConfig = readSource("vite.config.ts");
    const vitestConfig = readSource("vitest.config.ts");

    expect(vitestConfig).not.toMatch(/resolve:\s*\{[\s\S]*alias:/);
    expect(viteConfig).toMatch(/shadcn\/tailwind\.css/);
    expect(viteConfig).not.toMatch(/@\//);
  });

  it("uses TypeScript 6 for type-check and build", () => {
    const pkg = JSON.parse(
      readFileSync(join(repoRoot, "package.json"), "utf8")
    ) as { devDependencies?: { typescript?: string } };

    expect(pkg.devDependencies?.typescript).toMatch(/^(\^)?6/);
  });

  it("vscode settings point at workspace TypeScript for editor parity", () => {
    const settings = JSON.parse(
      readFileSync(join(repoRoot, ".vscode/settings.json"), "utf8")
    ) as {
      "typescript.tsdk"?: string;
      "typescript.enablePromptUseWorkspaceTsdk"?: boolean;
    };

    expect(settings["typescript.tsdk"]).toBe("node_modules/typescript/lib");
    expect(settings["typescript.enablePromptUseWorkspaceTsdk"]).toBe(true);
  });
});
