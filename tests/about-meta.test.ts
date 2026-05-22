import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  DEVELOPER_NAME,
  DEVELOPER_URL,
  EXTENSION_DISPLAY_NAME,
} from "../src/popup/about-meta";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("about-meta", () => {
  it("EXTENSION_DISPLAY_NAME matches manifest.json name", () => {
    const manifest = JSON.parse(
      readFileSync(join(repoRoot, "public", "manifest.json"), "utf8")
    ) as { name: string };
    expect(EXTENSION_DISPLAY_NAME).toBe(manifest.name);
  });

  it("developer constants match About tab copy", () => {
    expect(DEVELOPER_NAME).toBe("Helvety");
    expect(DEVELOPER_URL).toBe("https://helvety.com");
    expect(EXTENSION_DISPLAY_NAME).toBe("Helvety");
  });
});
