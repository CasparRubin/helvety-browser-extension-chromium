import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const libRoot = join(dirname(fileURLToPath(import.meta.url)));

/**
 *
 */
function readLibSource(relativePath: string): string {
  return readFileSync(join(libRoot, relativePath), "utf8");
}

describe("extension dead export cleanup guards", () => {
  it("entity-rich-text exports only parse/serialize helpers", () => {
    const src = readLibSource("../popup/entity-rich-text.ts");
    expect(src).toContain("export function parseStoredRichText");
    expect(src).toContain("export function serializeStoredRichText");
    expect(src).not.toContain("export function formatStoredRichText");
    expect(src).not.toContain("export function isRichTextField");
  });

  it("entity-catalogs does not export removed catalogName helper", () => {
    const src = readLibSource("entity-catalogs.ts");
    expect(src).not.toMatch(/export function catalogName/);
    expect(src).toContain("CatalogEntryLite");
  });

  it("e2ee-privacy does not export unused structural field list", () => {
    const src = readLibSource("e2ee-privacy.ts");
    expect(src).toContain("PLAINTEXT_CONTENT_FIELD_NAMES");
    expect(src).not.toContain("PLAINTEXT_STRUCTURAL_FIELD_NAMES");
  });

  it("helvety-auth-api keeps HelvetyJsonResponse internal", () => {
    const src = readLibSource("helvety-auth-api.ts");
    expect(src).toContain("type HelvetyJsonResponse");
    expect(src).not.toMatch(/export type HelvetyJsonResponse/);
  });
});
