/**
 * Parses JSON bodies returned by Helvety auth `ActionResponse`-shaped routes
 * (`{ success: true, data }` | `{ success: false, error }`).
 */

/**
 *
 */
export type HelvetyJsonResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Narrow a value already parsed from JSON into a typed Helvety action response.
 */
export function parseHelvetyActionJsonBody<T>(
  body: unknown
): HelvetyJsonResponse<T> {
  if (
    body &&
    typeof body === "object" &&
    "success" in body &&
    body.success === true &&
    "data" in body
  ) {
    return { success: true, data: (body as { data: T }).data };
  }
  if (
    body &&
    typeof body === "object" &&
    "success" in body &&
    body.success === false &&
    "error" in body &&
    typeof (body as { error: unknown }).error === "string"
  ) {
    return { success: false, error: (body as { error: string }).error };
  }
  return { success: false, error: "Unexpected server response" };
}

/**
 * Parse a response body string from Helvety auth JSON routes.
 */
export function parseHelvetyActionJsonText<T>(
  text: string
): HelvetyJsonResponse<T> {
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    return { success: false, error: "Invalid server response" };
  }
  return parseHelvetyActionJsonBody<T>(body);
}
