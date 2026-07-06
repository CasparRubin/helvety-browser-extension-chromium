#!/usr/bin/env node
/** Extension-local mirror of helvety `consistency:extension-e2ee`. */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const extensionRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

/** @param {string} relativePath */
function readExtensionFile(relativePath) {
  const fullPath = join(extensionRoot, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing extension file: ${relativePath}`);
    return null;
  }
  return readFileSync(fullPath, "utf8");
}

/** @param {string} relativePath @param {string[]} required */
function assertPatterns(relativePath, required) {
  const src = readExtensionFile(relativePath);
  if (!src) {
    return;
  }
  for (const pattern of required) {
    if (!src.includes(pattern)) {
      failures.push(`${relativePath}: missing required pattern "${pattern}"`);
    }
  }
}

assertPatterns("src/lib/entity-repository.ts", [
  "@helvety/shared/e2ee-entity-columns",
  "ACTION_LIMITS",
  "@helvety/shared/e2ee-write-guard",
]);

assertPatterns("src/lib/passkey-unlock.ts", ["backfillKeyCheckValueIfMissing"]);

assertPatterns("src/lib/extension-passkey-params.ts", [
  "@helvety/shared/user-passkey-params-client",
]);

assertPatterns("src/lib/entity-defaults.ts", [
  "@helvety/shared/e2ee-entity-defaults",
]);

assertPatterns("src/popup/hooks/use-extension-vault.ts", [
  "clearAllKeys",
  "clearCachedPRFSalt",
]);

assertPatterns("src/popup/entity-drafts.ts", [
  "@helvety/shared/e2ee-create-inputs",
  "@helvety/shared/e2ee-record-to-input",
]);

assertPatterns("src/lib/entity-config.ts", [
  "defineEntityDeleteRegistry",
  "buildDeleteMessage",
]);

assertPatterns("src/lib/extension-entity-links-hooks.tsx", [
  "@helvety/ui/sonner",
  "getE2eeHookErrorMessage",
]);

for (const relativePath of [
  "src/popup/App.tsx",
  "src/lib/extension-entity-links-hooks.tsx",
  "src/popup/hooks/use-extension-entity-form.ts",
]) {
  const src = readExtensionFile(relativePath);
  if (src?.includes('from "sonner"')) {
    failures.push(`${relativePath}: use @helvety/ui/sonner instead of sonner`);
  }
}

if (existsSync(join(extensionRoot, "src/lib/entity-catalogs.ts"))) {
  failures.push(
    "Remove src/lib/entity-catalogs.ts; use @helvety/shared/e2ee-entity-catalogs"
  );
}

const encryptSrc = readExtensionFile("src/lib/encrypt-entities.ts");
if (
  encryptSrc &&
  !encryptSrc.includes("@helvety/shared/crypto/e2ee-entity-crypto")
) {
  failures.push(
    "src/lib/encrypt-entities.ts must re-export @helvety/shared/crypto/e2ee-entity-crypto"
  );
}

const entityTypesSrc = readExtensionFile("src/lib/entity-types.ts");
if (
  entityTypesSrc &&
  !entityTypesSrc.includes("@helvety/shared/e2ee-domain-types")
) {
  failures.push(
    "src/lib/entity-types.ts must re-export @helvety/shared/e2ee-domain-types"
  );
}

if (existsSync(join(extensionRoot, "src/lib/e2ee-data-select.ts"))) {
  failures.push("Remove legacy src/lib/e2ee-data-select.ts");
}

if (failures.length > 0) {
  console.error("consistency:extension-e2ee failed:\n");
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

console.log("consistency:extension-e2ee OK");
