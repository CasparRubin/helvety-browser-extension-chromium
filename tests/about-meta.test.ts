import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  DEVELOPER_NAME,
  DEVELOPER_URL,
  EXTENSION_DISPLAY_NAME,
  EXTENSION_MANIFEST_DESCRIPTION,
} from "../src/popup/about-meta";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("about-meta", () => {
  it("EXTENSION_DISPLAY_NAME matches manifest.json name", () => {
    const manifest = JSON.parse(
      readFileSync(join(repoRoot, "public", "manifest.json"), "utf8")
    ) as { name: string; description: string };
    expect(EXTENSION_DISPLAY_NAME).toBe(manifest.name);
    expect(EXTENSION_MANIFEST_DESCRIPTION).toBe(manifest.description);
  });

  it("manifest description references the side panel (not popup)", () => {
    expect(EXTENSION_MANIFEST_DESCRIPTION).toMatch(/side panel/i);
    expect(EXTENSION_MANIFEST_DESCRIPTION).not.toMatch(/\bpopup\b/i);
  });

  it("developer constants match About tab copy", () => {
    expect(DEVELOPER_NAME).toBe("Helvety");
    expect(DEVELOPER_URL).toBe("https://helvety.com");
    expect(EXTENSION_DISPLAY_NAME).toBe("Helvety");
  });

  it("About tab describes CRUD, E2EE, and side panel (not read-only)", () => {
    const aboutSource = readFileSync(
      join(repoRoot, "src/popup/views/AboutTab.tsx"),
      "utf8"
    );
    expect(aboutSource).toMatch(/Create, view, edit, and delete/i);
    expect(aboutSource).toMatch(/decryption happens only in your browser/i);
    expect(aboutSource).toMatch(/side panel/i);
    expect(aboutSource).not.toMatch(/read-only MVP/i);
    expect(aboutSource).not.toMatch(/lists? only/i);
    expect(aboutSource).not.toMatch(/\bthis popup\b/i);
  });
});
