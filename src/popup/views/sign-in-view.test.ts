import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const signInPath = resolve(import.meta.dirname, "SignInView.tsx");

describe("SignInView", () => {
  it("aligns with web auth email step (label, EU dialog, lg CTA)", () => {
    const src = readFileSync(signInPath, "utf8");
    expect(src).toContain('htmlFor="extension-email"');
    expect(src).toContain("@helvety/ui/label");
    expect(src).toContain("@helvety/ui/dialog");
    expect(src).toContain('size="lg"');
    expect(src).toContain("Mail");
    expect(src).toContain("gap-3 border p-3");
  });
});
