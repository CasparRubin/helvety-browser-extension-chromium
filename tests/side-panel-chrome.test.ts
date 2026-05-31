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

describe("side panel chrome", () => {
  it("PopupHeader uses extension icon and display name", () => {
    const header = readSource("src/popup/components/PopupHeader.tsx");
    expect(header).toContain("EXTENSION_DISPLAY_NAME");
    expect(header).toContain("@helvety/extension-chrome/popup-header");
    expect(header).toContain("EXTENSION_ICON_URL");
  });

  it("panel entry imports shared theme-boot before React mounts", () => {
    const main = readSource("src/popup/main.tsx");
    expect(main).toContain("@helvety/extension-chrome/theme-boot");
    expect(main).not.toContain("./theme-boot");
  });

  it("App uses shared shell and theme hook with full-viewport layout", () => {
    const app = readSource("src/popup/App.tsx");
    expect(app).toContain("h-full min-h-0 w-full");
    expect(app).not.toContain("POPUP_WIDTH_CLASS");
    expect(app).not.toContain("h-[600px]");
    expect(app).toContain("usePopupTheme");
    expect(app).toContain("STORAGE_KEY_POPUP_THEME");
    expect(app).toContain("@helvety/extension-chrome/use-popup-theme");
    expect(app).toContain("readPendingOtp");
    expect(app).toContain("writePendingOtp");
    expect(app).toContain("clearPendingOtp");
    expect(app).toContain("DataTabsView");
  });

  it("App hydrates pending OTP only when no session is present", () => {
    const app = readSource("src/popup/App.tsx");
    expect(app).toContain("supabase.auth.getSession()");
    expect(app).toMatch(/data\.session\?\.user[\s\S]*readPendingOtp/);
  });

  it("App wires pending OTP storage into OTP handlers", () => {
    const app = readSource("src/popup/App.tsx");
    const sendBlock = app.slice(
      app.indexOf("const handleSendOtp"),
      app.indexOf("const handleVerifyOtp")
    );
    const verifyBlock = app.slice(
      app.indexOf("const handleVerifyOtp"),
      app.indexOf("const handleLogout")
    );
    expect(sendBlock).toContain("writePendingOtp");
    expect(verifyBlock).toContain("clearPendingOtp");
  });

  it("App clears auth form state on sign-out", () => {
    const app = readSource("src/popup/App.tsx");
    const logoutBlock = app.slice(
      app.indexOf("const handleLogout"),
      app.indexOf("const handleUnlock")
    );
    expect(logoutBlock).toContain('setEmailInput("")');
    expect(logoutBlock).toContain("setOtpSent(false)");
    expect(logoutBlock).toContain("clearPendingOtp");
  });

  it("index.html uses full-height shell (not fixed 800×600 box)", () => {
    const indexHtml = readSource("index.html");
    expect(indexHtml).toContain("h-full");
    expect(indexHtml).not.toContain("min-w-[800px]");
    expect(indexHtml).not.toContain("min-h-[600px]");
  });

  it("vite build names the panel entry (not popup)", () => {
    const viteConfig = readSource("vite.config.ts");
    expect(viteConfig).toContain('panel: path.resolve(root, "index.html")');
    expect(viteConfig).not.toMatch(
      /popup:\s*path\.resolve\(root,\s*"index\.html"\)/
    );
  });

  it("DataTabsView gives About tab a flex scroll region", () => {
    const dataTabs = readSource("src/popup/views/DataTabsView.tsx");
    expect(dataTabs).toMatch(
      /value="about"[\s\S]*flex min-h-0 flex-1 flex-col/
    );
  });

  it("does not keep local theme modules (shared package owns them)", () => {
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

  it("About tab shows auth origin and passkey API URL for operator checks", () => {
    const about = readSource("src/popup/views/AboutTab.tsx");
    expect(about).toContain("HELVETY_AUTH_ORIGIN");
    expect(about).toContain("buildHelvetyAuthApiUrl");
    expect(about).toContain("EXTENSION_PASSKEY_OPTIONS_PATH");
    expect(about).toContain("Passkey API:");
    expect(about).toContain('aria-label="Side panel color theme"');
  });

  it("SignInView shows code-sent helper when otpSent", () => {
    const signIn = readSource("src/popup/views/SignInView.tsx");
    expect(signIn).toContain("Code sent to");
  });
});
