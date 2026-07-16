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
    packageManager?: string;
  };

  it("uses pnpm.overrides for Helvety file: deps (not root overrides)", () => {
    expect(packageJson.pnpm?.overrides).toBeTruthy();
    expect(packageJson.overrides).toBeUndefined();
    expect(packageJson.pnpm?.overrides?.["@helvety/ui"]).toContain(
      "file:.helvety/packages/ui"
    );
  });

  it("pins lucide-react, tailwindcss, and @types/chrome to current monorepo toolchain", () => {
    const driftConfig = JSON.parse(
      readFileSync(
        join(repoRoot, ".helvety/scripts/workspace-version-drift.config.json"),
        "utf8"
      )
    ) as { requiredVersionByDep?: Record<string, string> };
    const monorepoExtensionPackage = JSON.parse(
      readFileSync(
        join(repoRoot, ".helvety/packages/extension-chrome/package.json"),
        "utf8"
      )
    ) as { devDependencies?: Record<string, string> };

    expect(packageJson.dependencies?.["lucide-react"]).toBe(
      driftConfig.requiredVersionByDep?.["lucide-react"]
    );
    expect(packageJson.devDependencies?.tailwindcss).toBe(
      driftConfig.requiredVersionByDep?.tailwindcss
    );
    expect(packageJson.devDependencies?.["@types/chrome"]).toBe(
      monorepoExtensionPackage.devDependencies?.["@types/chrome"]
    );
  });

  it("mirrors monorepo runtime and toolchain pins from .helvety drift map", () => {
    const driftConfig = JSON.parse(
      readFileSync(
        join(repoRoot, ".helvety/scripts/workspace-version-drift.config.json"),
        "utf8"
      )
    ) as { requiredVersionByDep?: Record<string, string> };
    const monorepoPackage = JSON.parse(
      readFileSync(join(repoRoot, ".helvety/package.json"), "utf8")
    ) as { overrides?: Record<string, string> };
    const extract = (dep: string) => driftConfig.requiredVersionByDep?.[dep];
    const supabaseVersion =
      monorepoPackage.overrides?.["@supabase/supabase-js"];
    const viteVersion = monorepoPackage.overrides?.vite;

    expect(supabaseVersion).toBeTruthy();
    expect(viteVersion).toBeTruthy();
    expect(packageJson.dependencies?.["@supabase/supabase-js"]).toBe(
      supabaseVersion
    );
    expect(packageJson.pnpm?.overrides?.["@supabase/supabase-js"]).toBe(
      supabaseVersion
    );
    expect(packageJson.dependencies?.["lucide-react"]).toBe(
      extract("lucide-react")
    );
    expect(packageJson.dependencies?.["@simplewebauthn/browser"]).toBe(
      extract("@simplewebauthn/browser")
    );
    expect(packageJson.dependencies?.react).toBe(extract("react"));
    expect(packageJson.dependencies?.["react-dom"]).toBe(extract("react-dom"));
    expect(packageJson.devDependencies?.vite).toBe(`^${viteVersion}`);
    expect(packageJson.devDependencies?.prettier).toBe(extract("prettier"));
    expect(packageJson.devDependencies?.vitest).toBe(extract("vitest"));
    expect(packageJson.devDependencies?.typescript).toBe(extract("typescript"));
    expect(packageJson.devDependencies?.eslint).toBe(extract("eslint"));
    expect(packageJson.devDependencies?.["@testing-library/jest-dom"]).toBe(
      extract("@testing-library/jest-dom")
    );
    expect(packageJson.devDependencies?.["@vitest/coverage-v8"]).toBe(
      extract("@vitest/coverage-v8")
    );
    expect(packageJson.devDependencies?.["prettier-plugin-tailwindcss"]).toBe(
      extract("prettier-plugin-tailwindcss")
    );
    expect(packageJson.devDependencies?.["@vitejs/plugin-react"]).toBe("^6");
  });

  it("uses pnpm 9.x packageManager (not a major jump without review)", () => {
    expect(packageJson.packageManager).toMatch(/^pnpm@9\./);
  });

  it("README documents tests/ layout including dependency and guardrail suites", () => {
    const readme = readFileSync(join(repoRoot, "README.md"), "utf8");
    expect(readme).toContain("dependency-pins");
    expect(readme).toContain("extension-config-wiring");
    expect(readme).toContain("e2ee-catalog-wiring");
    expect(readme).toContain("e2ee-crypto-wiring");
    expect(readme).toContain("e2ee-forms-wiring");
    expect(readme).toContain("copy-accuracy");
    expect(readme).toContain("security-e2ee-docs");
    expect(readme).toContain("guardrail-scripts");
    expect(readme).toContain("automation-policy-consistency");
    expect(readme).toContain("test:coverage");
    expect(readme).toContain("env.example");
  });
});
