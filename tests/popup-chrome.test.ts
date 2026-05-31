import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { EXTENSION_DISPLAY_NAME } from "../src/popup/about-meta";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 *
 */
function readSource(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

describe("popup chrome", () => {
  it("PopupHeader uses extension icon and display name", () => {
    const header = readSource("src/popup/components/PopupHeader.tsx");
    expect(header).toContain("EXTENSION_DISPLAY_NAME");
    expect(header).toContain("@helvety/extension-chrome/popup-header");
    expect(header).toContain("EXTENSION_ICON_URL");
  });

  it("popup entry imports shared theme-boot before React mounts", () => {
    const main = readSource("src/popup/main.tsx");
    expect(main).toContain("@helvety/extension-chrome/theme-boot");
    expect(main).not.toContain("./theme-boot");
  });

  it("App uses shared popup shell and theme hook", () => {
    const app = readSource("src/popup/App.tsx");
    expect(app).toContain("POPUP_WIDTH_CLASS");
    expect(app).toContain("usePopupTheme");
    expect(app).toContain("STORAGE_KEY_POPUP_THEME");
    expect(app).toContain("@helvety/extension-chrome/use-popup-theme");
    expect(app).toContain("DataTabsView");
  });

  it("popup uses Chrome max action-popup dimensions (800×600)", () => {
    const indexHtml = readSource("index.html");
    expect(indexHtml).toContain("min-w-[800px]");
    expect(indexHtml).toContain("min-h-[600px]");

    const app = readSource("src/popup/App.tsx");
    expect(app).toContain("min-h-[600px]");
    expect(app).toContain("h-[600px]");
    expect(app).toContain("max-h-[600px]");
  });

  it("does not keep local popup theme modules (shared package owns them)", () => {
    expect(existsSync(join(repoRoot, "src/popup/theme-preference.ts"))).toBe(
      false
    );
    expect(existsSync(join(repoRoot, "src/popup/theme-boot.ts"))).toBe(false);
  });

  it("About tab does not render session secrets", () => {
    const about = readSource("src/popup/views/AboutTab.tsx");
    expect(about).not.toContain("accessToken");
    expect(about).not.toContain("access_token");
    expect(about).not.toContain("otpInput");
  });

  it("About tab includes developer mark and security links", () => {
    const about = readSource("src/popup/views/AboutTab.tsx");
    expect(about).toContain("HelvetyMark");
    expect(about).toContain("SECURITY_DOC_URL");
    expect(about).toContain(EXTENSION_DISPLAY_NAME);
  });
});
