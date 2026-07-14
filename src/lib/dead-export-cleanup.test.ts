import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const libRoot = join(dirname(fileURLToPath(import.meta.url)));
const repoRoot = join(libRoot, "../..");

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

  it("shared e2ee-entity-catalogs exports catalogColor", () => {
    const src = readFileSync(
      join(repoRoot, ".helvety/packages/shared/src/e2ee-entity-catalogs.ts"),
      "utf8"
    );
    expect(src).toContain("export function catalogColor");
    expect(src).not.toMatch(/export function catalogById/);
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

  it("decrypt-entities delegates shared crypto helpers", () => {
    const src = readLibSource("decrypt-entities.ts");
    expect(src).toContain("@helvety/shared/crypto/e2ee-entity-crypto");
    expect(src).not.toMatch(/function decryptLinkFolderName/);
  });

  it("catalog-picker keeps CatalogPicker internal", () => {
    const src = readFileSync(
      join(libRoot, "../popup/components/catalog-picker.tsx"),
      "utf8"
    );
    expect(src).toContain("function CatalogPicker");
    expect(src).not.toMatch(/export function CatalogPicker/);
    expect(src).toContain("export function TaskStagePicker");
  });

  it("extension entity link hooks surface user-visible errors", () => {
    const src = readLibSource("extension-entity-links-hooks.tsx");
    expect(src).toContain("getE2eeHookErrorMessage");
    expect(src).toContain("toast.error");
    expect(src).toContain("ENTITY_LINKS_LOAD_ERROR");
    expect(src).not.toMatch(/catch \{\s*\}/);
  });

  it("does not re-export retired theme alias or unused supabase internals", () => {
    const constantsSrc = readFileSync(
      join(libRoot, "../popup/constants.ts"),
      "utf8"
    );
    expect(constantsSrc).toContain("STORAGE_KEY_SIDE_PANEL_THEME");
    expect(constantsSrc).not.toContain("STORAGE_KEY_POPUP_THEME");

    const supabaseSrc = readLibSource("extension-supabase.ts");
    expect(supabaseSrc).not.toContain("extensionSupabaseStorageInternals");

    const linkNormalizeSrc = readLibSource("link-url-normalize.ts");
    expect(linkNormalizeSrc).toContain("normalizeBookmarkUrl");
    expect(linkNormalizeSrc).not.toContain("resolveLinkDisplayName");

    const entityConfigSrc = readLibSource("entity-config.ts");
    expect(entityConfigSrc).toContain("type EntityTypeId");
    expect(entityConfigSrc).not.toMatch(/export type EntityTypeId/);

    const passkeySrc = readLibSource("extension-passkey-params.ts");
    expect(passkeySrc).toContain("type PasskeyParamsPostgrestError");
    expect(passkeySrc).not.toMatch(/export type PasskeyParamsPostgrestError/);
  });
});
