/** Public homepage for the developer / product. */
export const DEVELOPER_URL = "https://helvety.com";

/**
 * Shown in the side panel header title and About card heading. Must match `name` in
 * `public/manifest.json`.
 */
export const EXTENSION_DISPLAY_NAME = "Helvety" as const;

/** Must match `description` in `public/manifest.json`. */
export const EXTENSION_MANIFEST_DESCRIPTION =
  "Helvety E2EE tasks, notes, contacts, links, and folders — manage them in the side panel after passkey unlock" as const;

/** Developer link label in the About tab **Developer** section. */
export const DEVELOPER_NAME = "Helvety";

/** Public Git repository for this extension. */
export const SOURCE_REPO_URL =
  "https://github.com/CasparRubin/helvety-browser-extension-chromium";

export const SECURITY_DOC_URL = `${SOURCE_REPO_URL}/blob/main/docs/SECURITY-E2EE.md`;

export const WEBAUTHN_DOC_URL = `${SOURCE_REPO_URL}/blob/main/docs/webauthn-extension.md`;
