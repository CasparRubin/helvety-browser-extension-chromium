/**
 * Authenticated JSON fetch to `HELVETY_AUTH_ORIGIN` for passkey options/verify only.
 * PRF params use Supabase (`extension-passkey-params.ts`), not this module.
 * Responses use `@helvety/shared/parse-action-response` (`ActionResponse` shape).
 * Maps undeployed passkey routes (404 or HTML responses) to “Passkey API is not deployed…”.
 * JSON errors from a deployed auth app (allowlist, rate limit, server faults) pass through unchanged.
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
import { logUnlockFailure } from "./unlock-dev-log";

import type { ActionResponse } from "@helvety/shared/types/entities";

/** Alias for Helvety auth JSON routes (`ActionResponse` from `@helvety/shared`). */
export type HelvetyJsonResponse<T> = ActionResponse<T>;

const DEFAULT_AUTH_ERROR = "Request to Helvety auth failed";

/** Shown when passkey routes return 404 or HTML instead of JSON (misconfigured URL or missing deploy). */
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

/** True when the request likely missed the auth zone base path (`/auth`). */
function looksLikeMissingAuthBasePath(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    return (
      pathname.startsWith("/api/extension/passkey/") &&
      !pathname.startsWith("/auth/api/extension/passkey/")
    );
  } catch {
    return false;
  }
}

/** Maps HTTP status to user-facing unlock errors. */
function normalizeAuthError(response: Response, error: string): string {
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

/** Logs passkey route fetch failures (safe fields only). */
function logPasskeyAuthFetchFailure(input: {
  url: string;
  status: number;
  contentType: string;
  error: string;
  hint?: string;
}): void {
  logUnlockFailure("passkey_auth_fetch", {
    path: input.url,
    error: input.error,
    hint:
      input.hint ?? `status=${input.status} content-type=${input.contentType}`,
  });
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
    const error = looksLikeMissingAuthBasePath(url)
      ? "Passkey API URL is misconfigured (auth origin must include /auth). Check About → Auth origin."
      : PASSKEY_API_NOT_DEPLOYED_MESSAGE;
    logPasskeyAuthFetchFailure({
      url,
      status: response.status,
      contentType,
      error,
      hint: looksLikeMissingAuthBasePath(url)
        ? "missing_auth_base_path"
        : "html_response",
    });
    return { success: false, error };
  }

  if (isExtensionPasskeyPath(path) && response.status === 404) {
    logPasskeyAuthFetchFailure({
      url,
      status: response.status,
      contentType,
      error: PASSKEY_API_NOT_DEPLOYED_MESSAGE,
      hint: "http_404",
    });
    return { success: false, error: PASSKEY_API_NOT_DEPLOYED_MESSAGE };
  }

  const synthetic = new Response(raw, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
  const parsed = await parseActionResponse<T>(synthetic, DEFAULT_AUTH_ERROR);

  if (!parsed.success) {
    const error = normalizeAuthError(response, parsed.error);
    if (isExtensionPasskeyPath(path)) {
      logPasskeyAuthFetchFailure({
        url,
        status: response.status,
        contentType,
        error,
      });
    }
    return { success: false, error };
  }

  if (response.ok && !isActionResponsePayload<T>(parsed)) {
    const error = isExtensionPasskeyPath(path)
      ? PASSKEY_API_NOT_DEPLOYED_MESSAGE
      : DEFAULT_AUTH_ERROR;
    if (isExtensionPasskeyPath(path)) {
      logPasskeyAuthFetchFailure({
        url,
        status: response.status,
        contentType,
        error,
        hint: "invalid_action_response",
      });
    }
    return {
      success: false,
      error,
    };
  }

  return parsed;
}
