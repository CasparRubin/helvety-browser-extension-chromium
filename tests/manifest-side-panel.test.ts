import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("manifest side panel", () => {
  it("declares global side panel instead of action popup", () => {
    const manifest = JSON.parse(
      readFileSync(join(repoRoot, "public", "manifest.json"), "utf8")
    ) as {
      version: string;
      description: string;
      permissions: string[];
      minimum_chrome_version: string;
      action?: { default_popup?: string; default_title?: string };
      side_panel?: { default_path: string };
      background?: { service_worker: string };
    };
    const pkg = JSON.parse(
      readFileSync(join(repoRoot, "package.json"), "utf8")
    ) as { version: string; description: string };

    expect(manifest.version).toBe(pkg.version);
    expect(pkg.description).toMatch(/side panel/i);
    expect(manifest.description).toMatch(/side panel/i);
    expect(manifest.description).not.toMatch(/\bpopup\b/i);
    expect(manifest.permissions).toContain("sidePanel");
    expect(manifest.permissions).toContain("storage");
    expect(manifest.minimum_chrome_version).toBe("114");
    expect(manifest.side_panel?.default_path).toBe("index.html");
    expect(manifest.action?.default_popup).toBeUndefined();
    expect(manifest.action?.default_title).toBe("Helvety");
    expect(manifest.background?.service_worker).toBe("background.js");
  });
});
