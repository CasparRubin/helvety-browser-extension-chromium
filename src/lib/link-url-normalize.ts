/** Result of normalizing a user-entered URL before encryption. */
export type NormalizeUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Normalize and validate a bookmark URL client-side before encryption.
 * Mirrors apps/links/lib/url-normalize.ts.
 */
export function normalizeBookmarkUrl(raw: string): NormalizeUrlResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "URL is required" };
  }

  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return { ok: false, error: "Enter a valid URL" };
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return { ok: false, error: "Only http and https URLs are supported" };
  }

  return { ok: true, url: parsed.href };
}

/**
 * Uses the provided name when non-empty; otherwise derives a label from the URL host.
 */
export function resolveLinkDisplayName(
  rawName: string,
  normalizedUrl: string
): string {
  const trimmed = rawName.trim();
  if (trimmed) {
    return trimmed;
  }
  try {
    return new URL(normalizedUrl).hostname.replace(/^www\./i, "");
  } catch {
    return normalizedUrl;
  }
}
