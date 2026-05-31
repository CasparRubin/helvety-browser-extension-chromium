/**
 * Authenticated JSON fetch to `HELVETY_AUTH_ORIGIN` for passkey options/verify only.
 * PRF params use Supabase (`extension-passkey-params.ts`), not this module.
 * Responses use `@helvety/shared/parse-action-response` (`ActionResponse` shape).
 * Maps undeployed routes (404 or HTML 200 from Next.js) to “Passkey API is not deployed…”.
 */

import {
  isActionResponsePayload,
  parseActionResponse,
} from "@helvety/shared/parse-action-response";

import {
  buildHelvetyAuthApiUrl,
  EXTENSION_PASSKEY_OPTIONS_PATH,
  EXTENSION_PASSKEY_VERIFY_PATH,
} from "./config";

import type { ActionResponse } from "@helvety/shared/types/entities";

/** Alias for Helvety auth JSON routes (`ActionResponse` from `@helvety/shared`). */
export type HelvetyJsonResponse<T> = ActionResponse<T>;

const DEFAULT_AUTH_ERROR = "Request to Helvety auth failed";

/** Shown when `HELVETY_AUTH_ORIGIN` passkey routes return 404 or HTML instead of JSON. */
export const PASSKEY_API_NOT_DEPLOYED_MESSAGE =
  "Passkey API is not deployed on the Helvety auth server yet.";

/** Extension passkey HTTP routes (undeployed app may return HTML “Page not found” with 200). */
function isExtensionPasskeyPath(path: string): boolean {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return (
    normalized === EXTENSION_PASSKEY_OPTIONS_PATH ||
    normalized === EXTENSION_PASSKEY_VERIFY_PATH
  );
}

/** True when the auth app returned an HTML page instead of JSON (undeployed API route). */
function looksLikeHtmlBody(raw: string, contentType: string): boolean {
  if (contentType.includes("text/html")) {
    return true;
  }
  const trimmed = raw.trimStart();
  return trimmed.startsWith("<!") || trimmed.includes("<!DOCTYPE");
}

/** Maps HTTP status to user-facing unlock errors. */
function normalizeAuthError(response: Response, error: string): string {
  if (response.status === 404) {
    return PASSKEY_API_NOT_DEPLOYED_MESSAGE;
  }
  if (response.status === 401) {
    if (
      error === "Unexpected server response" ||
      error === "Invalid server response" ||
      error.startsWith(DEFAULT_AUTH_ERROR)
    ) {
      return "Not authenticated";
    }
  }
  return error;
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

  const raw = await response.text();
  const contentType = response.headers.get("content-type") ?? "";

  if (isExtensionPasskeyPath(path) && looksLikeHtmlBody(raw, contentType)) {
    if (import.meta.env.DEV) {
      console.warn("[helvety-auth]", {
        url,
        status: response.status,
        error: PASSKEY_API_NOT_DEPLOYED_MESSAGE,
        hint: "html_response",
      });
    }
    return { success: false, error: PASSKEY_API_NOT_DEPLOYED_MESSAGE };
  }

  const synthetic = new Response(raw, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
  const parsed = await parseActionResponse<T>(synthetic, DEFAULT_AUTH_ERROR);

  if (!parsed.success) {
    let error = normalizeAuthError(response, parsed.error);
    if (
      isExtensionPasskeyPath(path) &&
      (error === DEFAULT_AUTH_ERROR ||
        error.startsWith(`${DEFAULT_AUTH_ERROR} (`))
    ) {
      error = PASSKEY_API_NOT_DEPLOYED_MESSAGE;
    }
    if (import.meta.env.DEV) {
      console.warn("[helvety-auth]", {
        url,
        status: response.status,
        error,
      });
    }
    return { success: false, error };
  }

  if (response.ok && !isActionResponsePayload<T>(parsed)) {
    return {
      success: false,
      error: isExtensionPasskeyPath(path)
        ? PASSKEY_API_NOT_DEPLOYED_MESSAGE
        : DEFAULT_AUTH_ERROR,
    };
  }

  return parsed;
}
