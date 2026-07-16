import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function readSource(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

describe("TypeScript and build config", () => {
  it("tsconfig extends shared extension base from @helvety/config", () => {
    const tsconfig = JSON.parse(
      readFileSync(join(repoRoot, "tsconfig.json"), "utf8")
    ) as {
      extends?: string;
      compilerOptions?: Record<string, unknown>;
    };

    expect(tsconfig.extends).toBe("@helvety/config/tsconfig.extension.json");
    expect(tsconfig.compilerOptions?.ignoreDeprecations).toBeUndefined();
    expect(tsconfig.compilerOptions?.baseUrl).toBeUndefined();
    expect(tsconfig.compilerOptions?.paths).toBeUndefined();
  });

  it("vitest uses createExtensionVitestConfig from @helvety/config", () => {
    const vitestConfig = readSource("vitest.config.ts");

    expect(vitestConfig).toMatch(
      /createExtensionVitestConfig\s*\(\s*import\.meta\.dirname/
    );
    expect(vitestConfig).toMatch(/@helvety\/config\/vitest-extension/);
  });

  it("vite resolve aliases are limited to required CSS package imports", () => {
    const viteConfig = readSource("vite.config.ts");

    expect(viteConfig).toMatch(/shadcn\/tailwind\.css/);
    expect(viteConfig).not.toMatch(/@\//);
  });

  it("prettier uses shared ESM config with tailwind plugin", () => {
    const prettierConfig = readSource("prettier.config.mjs");

    expect(prettierConfig).toMatch(/prettier-plugin-tailwindcss/);
    expect(prettierConfig).toMatch(/printWidth:\s*80/);
  });

  it("ships env.example for optional VITE_HELVETY_AUTH_ORIGIN override", () => {
    const envExample = readSource("env.example");

    expect(envExample).toContain("VITE_HELVETY_AUTH_ORIGIN");
    expect(envExample).not.toMatch(/SUPABASE_SECRET|service_role|sb_secret/i);
  });

  it("uses TypeScript 6.0.x matching monorepo drift", () => {
    const driftConfig = JSON.parse(
      readFileSync(
        join(repoRoot, ".helvety/scripts/workspace-version-drift.config.json"),
        "utf8"
      )
    ) as { requiredVersionByDep?: Record<string, string> };
    const pkg = JSON.parse(
      readFileSync(join(repoRoot, "package.json"), "utf8")
    ) as { devDependencies?: { typescript?: string } };

    expect(pkg.devDependencies?.typescript).toBe(
      driftConfig.requiredVersionByDep?.typescript
    );
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
