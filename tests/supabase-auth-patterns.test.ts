import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = join(repoRoot, "src");

/** Files allowed to call getSession (token retrieval after getUser validation). */
const GET_SESSION_ALLOWLIST = new Set(["src/lib/extension-session.ts"]);

const FORBIDDEN_GET_SESSION = /\.auth\.getSession\s*\(/u;

/**
 *
 */
function listSourceFiles(directory: string): string[] {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(absolutePath));
      continue;
    }
    if (
      entry.isFile() &&
      (absolutePath.endsWith(".ts") || absolutePath.endsWith(".tsx")) &&
      !absolutePath.endsWith(".d.ts") &&
      !absolutePath.endsWith(".test.ts") &&
      !absolutePath.endsWith(".test.tsx")
    ) {
      files.push(absolutePath);
    }
  }
  return files;
}

describe("supabase auth patterns (extension)", () => {
  it("uses getUser() for authorization; getSession only in extension-session.ts", () => {
    const violations: string[] = [];

    for (const absolutePath of listSourceFiles(srcRoot)) {
      const relativePath = absolutePath
        .slice(repoRoot.length + 1)
        .replace(/\\/g, "/");
      const source = readFileSync(absolutePath, "utf8");
      if (!FORBIDDEN_GET_SESSION.test(source)) {
        continue;
      }
      if (GET_SESSION_ALLOWLIST.has(relativePath)) {
        continue;
      }
      violations.push(relativePath);
    }

    expect(violations).toEqual([]);
  });

  it("App.tsx resolves session via resolveVerifiedExtensionSession", () => {
    const app = readFileSync(join(repoRoot, "src/popup/App.tsx"), "utf8");
    expect(app).toContain("resolveVerifiedExtensionSession");
    expect(app).toContain("hasNoAuthenticatedUser");
    expect(app).not.toMatch(/supabase\.auth\.getSession\s*\(/);
  });

  it("extension-passkey-params uses ensureExtensionAuthReady (getUser-first)", () => {
    const src = readFileSync(
      join(repoRoot, "src/lib/extension-passkey-params.ts"),
      "utf8"
    );
    expect(src).toContain("ensureExtensionAuthReady");
    expect(src).not.toMatch(/supabase\.auth\.getSession\s*\(/);
  });
});
