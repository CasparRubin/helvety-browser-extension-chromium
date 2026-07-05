import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const DOC_PATHS = [
  "README.md",
  ...readdirSync(join(repoRoot, "docs"))
    .filter((name) => name.endsWith(".md"))
    .map((name) => `docs/${name}`),
] as const;

/** Stale or misleading positive claims in extension-facing docs. */
const FORBIDDEN_PHRASES = [
  { label: "direct Supabase OTP client", re: /signInWithOtp/i },
  { label: "action popup UX", re: /\bfrom the popup\b/i },
  { label: "default_popup manifest", re: /default_popup/ },
  { label: "blocked until auth redeploy", re: /404\/HTML until then/i },
  { label: "popup DevTools for passkey", re: /popup DevTools/i },
  {
    label: "runtime GET passkey-params HTTP route",
    re: /GET\s+\/api\/encryption\/passkey-params/i,
  },
  {
    label: "extension receives helvety_device_trust cookie",
    re: /receive[s]?\s+(the\s+web\s+)?`helvety_device_trust`/i,
  },
  {
    label: "extension email-proof anchor",
    re: /email-proof anchor/i,
  },
  {
    label: "extension weekly email proof storage",
    re: /chrome\.storage\.local.*weekly email proof/i,
  },
] as const;

/** Line-level negations that make an otherwise forbidden phrase accurate. */
const NEGATED_LINE_MARKERS =
  /\bdoes not\b|\bnot receive\b|\*\*not\*\* receive\b|\bmust not claim\b|\bno `GET/i;

/** Loads README and docs/*.md for copy-accuracy assertions. */
function loadDocs(): { rel: string; text: string }[] {
  return DOC_PATHS.map((rel) => ({
    rel,
    text: readFileSync(join(repoRoot, rel), "utf8"),
  }));
}

describe("extension copy accuracy (README + docs)", () => {
  it("does not contain stale or misleading auth/E2EE phrases", () => {
    const violations: string[] = [];

    for (const { rel, text } of loadDocs()) {
      for (const { label, re } of FORBIDDEN_PHRASES) {
        for (const line of text.split("\n")) {
          if (re.test(line) && !NEGATED_LINE_MARKERS.test(line)) {
            violations.push(`${rel}: ${label}`);
            break;
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("README documents side panel (not popup) and session bootstrap accurately", () => {
    const readme = readFileSync(join(repoRoot, "README.md"), "utf8");

    expect(readme).toMatch(/side panel/i);
    expect(readme).toContain("helvety_extension_weekly_proof");
    expect(readme).toMatch(/extension-session|resolveVerifiedExtensionSession/);
    expect(readme).toMatch(/not direct Supabase OTP/i);
    expect(readme).toMatch(/not.*unlock this extension/i);
    expect(readme).toContain("supabase-auth-patterns");
  });

  it("SECURITY-E2EE documents web vs extension device-trust split", () => {
    const doc = readFileSync(join(repoRoot, "docs/SECURITY-E2EE.md"), "utf8");

    expect(doc).toMatch(/does not.*mint device-trust/i);
    expect(doc).toContain("resolveVerifiedExtensionSession");
    expect(doc).toContain("X-Helvety-Weekly-Proof");
    expect(doc).toContain("helvety_extension_weekly_proof");
    expect(doc).toMatch(/field-bound AAD|table:recordId:column/i);
    expect(doc).toContain("key_check_value");
    expect(doc).toContain("getUser()");
  });

  it("webauthn doc documents getUser-first params load and KCV", () => {
    const doc = readFileSync(
      join(repoRoot, "docs/webauthn-extension.md"),
      "utf8"
    );

    expect(doc).toContain("extension-session.ts");
    expect(doc).toMatch(/auth\.getUser\(\)/);
    expect(doc).toMatch(/PRF derive \+ KCV|verify KCV/i);
    expect(doc).toMatch(/no.*GET.*encryption\/passkey-params/i);
  });

  it("SignInView uses shared extension OTP helper and does not imply existing-account-only", () => {
    const signInSource = readFileSync(
      join(repoRoot, "src/popup/views/SignInView.tsx"),
      "utf8"
    );

    expect(signInSource).toContain("EXTENSION_EMAIL_OTP_SIGNIN_HELPER");
    expect(signInSource).not.toMatch(/same account as helvety\.com/i);
  });

  it("user-facing auth module does not ship operator allowlist copy", () => {
    const authApiSource = readFileSync(
      join(repoRoot, "src/lib/helvety-auth-api.ts"),
      "utf8"
    );

    expect(authApiSource).toContain("sanitizeExtensionAuthError");
    expect(authApiSource).not.toContain("About → Extension ID");
    expect(authApiSource).not.toMatch(
      /Extension id is not allowlisted on helvety-auth/
    );
  });
});
