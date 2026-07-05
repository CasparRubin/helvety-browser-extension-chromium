import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const unlockSource = readSource("src/popup/views/UnlockView.tsx");
const aboutSource = readSource("src/popup/views/AboutTab.tsx");
const appSource = readSource("src/popup/App.tsx");

describe("UnlockView passkey screen", () => {
  it("does not show encryption params preflight status to end users", () => {
    expect(unlockSource).not.toContain("Encryption params:");
    expect(unlockSource).not.toMatch(/cannot load:/);
    expect(unlockSource).not.toContain("checking…");
    expect(unlockSource).not.toMatch(/paramsPreflight\.status === "ready"/);
  });

  it("branches setup vs unlock from not_setup preflight only", () => {
    expect(unlockSource).toContain('paramsPreflight?.status === "not_setup"');
    expect(unlockSource).toContain("Set up encryption on helvety.com");
    expect(unlockSource).toContain("Unlock with passkey");
    expect(unlockSource).toContain("onOpenEncryptionSetup");
  });

  it("surfaces unlock failures via cryptoError alert", () => {
    expect(unlockSource).toContain("cryptoError");
    expect(unlockSource).toContain('role="alert"');
    expect(unlockSource).toContain("text-destructive");
  });

  it("uses ghost sign-out chrome aligned with web auth", () => {
    expect(unlockSource).toContain('variant="ghost"');
    expect(unlockSource).toContain('label="Sign out"');
  });
});

describe("AboutTab encryption preflight diagnostics", () => {
  it("keeps operator-facing preflight status off the unlock screen", () => {
    expect(aboutSource).toContain("Encryption preflight:");
    expect(aboutSource).toContain("preflightLabel");
    expect(aboutSource).toMatch(/paramsPreflight\?\.status === "ready"/);
  });
});

describe("App unlock wiring", () => {
  it("routes handleUnlock preflight failures to cryptoError for UnlockView", () => {
    const unlockBlock = appSource.slice(
      appSource.indexOf("const handleUnlock"),
      appSource.indexOf("const handleRetryList")
    );

    expect(unlockBlock).toContain("fetchPasskeyParamsForUser");
    expect(unlockBlock).toContain("setCryptoError(preflight.error)");
    expect(unlockBlock).toContain(
      'setCryptoError("Encryption is not set up for this account.")'
    );
  });

  it("passes cryptoError into UnlockView for user-visible unlock failures", () => {
    expect(appSource).toMatch(/<UnlockView[\s\S]*cryptoError=\{cryptoError\}/);
  });
});
