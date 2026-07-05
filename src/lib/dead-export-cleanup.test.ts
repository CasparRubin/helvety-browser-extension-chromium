import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const libRoot = join(dirname(fileURLToPath(import.meta.url)));

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

  it("entity-repository guards selects and plaintext write payloads", () => {
    const repoSrc = readLibSource("entity-repository.ts");
    const repoTestSrc = readLibSource("entity-repository.test.ts");
    expect(repoSrc).not.toMatch(/\.select\s*\(\s*["'`]\*/);
    expect(repoTestSrc).toContain("@helvety/shared/e2ee-write-guard");
    expect(repoTestSrc).toContain("PLAINTEXT_CONTENT_FIELD_NAMES");
    expect(repoTestSrc).toContain("never uses star selects");
  });

  it("weekly proof storage does not export retired OTP anchor aliases", () => {
    const src = readLibSource("extension-weekly-proof-storage.ts");
    expect(src).toContain("writeExtensionWeeklyProof");
    expect(src).not.toMatch(/writeExtensionWeeklyOtpAnchor/);
    expect(src).not.toMatch(/helvety_extension_last_email_verified/);
    expect(src).not.toMatch(/jwt-session-lifetime/);
    expect(src).not.toMatch(/isJwtWithinMaxLifetime/);
  });

  it("helvety-auth-api keeps HelvetyJsonResponse internal", () => {
    const src = readLibSource("helvety-auth-api.ts");
    expect(src).toContain("type HelvetyJsonResponse");
    expect(src).not.toMatch(/export type HelvetyJsonResponse/);
  });
});
