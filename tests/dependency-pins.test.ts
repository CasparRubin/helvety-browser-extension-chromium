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
    expect(packageJson.dependencies?.["lucide-react"]).toBe("^1.23.0");
    expect(packageJson.devDependencies?.tailwindcss).toBe("^4.3.2");
    expect(packageJson.devDependencies?.["@types/chrome"]).toBe("^0.2.2");
  });

  it("mirrors monorepo runtime and toolchain pins from .helvety drift map", () => {
    const drift = readFileSync(
      join(repoRoot, ".helvety/scripts/check-workspace-version-drift.mjs"),
      "utf8"
    );
    const extract = (dep: string) => {
      const match = drift.match(
        new RegExp(
          `\\["${dep.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}",\\s*"([^"]+)"\\]`
        )
      );
      return match?.[1];
    };

    expect(packageJson.dependencies?.["@supabase/supabase-js"]).toBe("2.110.0");
    expect(packageJson.pnpm?.overrides?.["@supabase/supabase-js"]).toBe(
      "2.110.0"
    );
    expect(packageJson.dependencies?.["lucide-react"]).toBe(
      extract("lucide-react")
    );
    expect(packageJson.dependencies?.react).toBe(extract("react"));
    expect(packageJson.dependencies?.["react-dom"]).toBe(extract("react-dom"));
    expect(packageJson.devDependencies?.vite).toBe("^8.1.3");
    expect(packageJson.devDependencies?.prettier).toBe(extract("prettier"));
    expect(packageJson.devDependencies?.vitest).toBe(extract("vitest"));
    expect(packageJson.devDependencies?.typescript).toBe(extract("typescript"));
    expect(packageJson.devDependencies?.eslint).toBe(extract("eslint"));
  });

  it("uses pnpm 9.x packageManager (not a major jump without review)", () => {
    expect(packageJson.packageManager).toMatch(/^pnpm@9\./);
  });

  it("README documents tests/ layout including dependency and guardrail suites", () => {
    const readme = readFileSync(join(repoRoot, "README.md"), "utf8");
    expect(readme).toContain("dependency-pins");
    expect(readme).toContain("e2ee-catalog-wiring");
    expect(readme).toContain("e2ee-crypto-wiring");
    expect(readme).toContain("e2ee-forms-wiring");
    expect(readme).toContain("copy-accuracy");
    expect(readme).toContain("security-e2ee-docs");
    expect(readme).toContain("guardrail-scripts");
  });
});
