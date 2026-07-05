#!/usr/bin/env node
/** Extension-local mirror of helvety `consistency:extension-e2ee`. */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const extensionRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

/** @param {string} relativePath @param {string[]} required */
function assertPatterns(relativePath, required) {
  const fullPath = join(extensionRoot, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing extension file: ${relativePath}`);
    return;
  }
  const src = readFileSync(fullPath, "utf8");
  for (const pattern of required) {
    if (!src.includes(pattern)) {
      failures.push(`${relativePath}: missing required pattern "${pattern}"`);
    }
  }
}

/** @param {string} relativePath @param {string[]} forbidden */
function assertNoPatterns(relativePath, forbidden) {
  const fullPath = join(extensionRoot, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing extension file: ${relativePath}`);
    return;
  }
  const src = readFileSync(fullPath, "utf8");
  for (const pattern of forbidden) {
    if (src.includes(pattern)) {
      failures.push(`${relativePath}: forbidden pattern "${pattern}"`);
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

assertPatterns("src/popup/App.tsx", ["clearAllKeys", "clearCachedPRFSalt"]);

assertNoPatterns("src/lib/entity-repository.ts", ["./e2ee-data-select"]);

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
