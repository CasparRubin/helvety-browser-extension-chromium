#!/usr/bin/env node
/** Extension-local mirror of helvety `consistency:extension-auth`. */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const extensionRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

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

assertNoPatterns("src/lib/extension-session.ts", [
  "extension-weekly-otp-anchor",
  "isJwtWithinMaxLifetime",
  "jwt-session-lifetime",
  "helvety_extension_last_email_verified",
]);

assertPatterns("src/lib/extension-session.ts", [
  "hasValidExtensionWeeklyProof",
  "getUser()",
]);

assertPatterns("src/lib/extension-weekly-proof-storage.ts", [
  "@helvety/shared/weekly-proof-token",
  "EXTENSION_WEEKLY_PROOF_STORAGE_KEY",
]);

assertPatterns("src/lib/helvety-auth-api.ts", [
  "EXTENSION_WEEKLY_PROOF_HEADER",
  "weeklyProof",
  "sanitizeExtensionAuthError",
  "@helvety/shared/user-facing-errors",
]);

assertNoPatterns("src/lib/helvety-auth-api.ts", [
  "helvety_extension_last_email_verified",
  "jwt-session-lifetime",
  "About → Extension ID",
  "Extension id is not allowlisted",
]);

assertPatterns("src/popup/App.tsx", [
  "onKeyEvent",
  "useVaultIdleLock",
  "writeExtensionWeeklyProof",
  "clearExtensionWeeklyProof",
]);

if (existsSync(join(extensionRoot, "src/lib/extension-weekly-otp-anchor.ts"))) {
  failures.push("Remove legacy src/lib/extension-weekly-otp-anchor.ts");
}

if (failures.length > 0) {
  console.error("consistency:extension-auth failed:\n");
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

console.log("consistency:extension-auth OK");
