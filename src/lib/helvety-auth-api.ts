import { buildHelvetyAuthApiUrl } from "./config";
import { parseHelvetyActionJsonText } from "./parse-helvety-action-json";

import type { HelvetyJsonResponse } from "./parse-helvety-action-json";

export type { HelvetyJsonResponse } from "./parse-helvety-action-json";

/**
 * JSON fetch to `HELVETY_AUTH_ORIGIN` (`src/lib/config.ts`) for extension passkey routes.
 * Entity rows use the Supabase client; decrypted fields are not sent to these endpoints.
 */
async function parseJson<T>(
  response: Response
): Promise<HelvetyJsonResponse<T>> {
  const text = await response.text();
  return parseHelvetyActionJsonText<T>(text);
}

/** Authenticated fetch to a path under `HELVETY_AUTH_ORIGIN`. */
export async function helvetyAuthFetch<T>(
  path: string,
  init: RequestInit & { accessToken: string }
): Promise<HelvetyJsonResponse<T>> {
  const { accessToken, ...rest } = init;
  const url = buildHelvetyAuthApiUrl(path);
  const headers = new Headers(rest.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (!headers.has("Content-Type") && rest.body) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(url, {
    ...rest,
    headers,
  });
  const parsed = await parseJson<T>(response);
  if (!parsed.success && response.status === 401) {
    const msg = parsed.error;
    const normalized =
      msg === "Unexpected server response" || msg === "Invalid server response"
        ? "Not authenticated"
        : msg;
    return { success: false, error: normalized };
  }
  return parsed;
}
