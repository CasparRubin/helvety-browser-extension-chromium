import { describe, expect, it } from "vitest";

import {
  buildHelvetyAuthApiUrl,
  EXTENSION_AUTH_API_PATHS,
  getHelvetyAuthOrigin,
  HELVETY_AUTH_ORIGIN,
  HELVETY_GATEWAY,
} from "./env";

describe("production Helvety URLs", () => {
  it("uses helvety.com/auth for passkey API base", () => {
    expect(getHelvetyAuthOrigin()).toBe("https://helvety.com/auth");
    expect(HELVETY_AUTH_ORIGIN).toBe(getHelvetyAuthOrigin());
  });

  it("uses helvety.com for gateway deep links", () => {
    expect(HELVETY_GATEWAY).toBe("https://helvety.com");
  });
});

describe("buildHelvetyAuthApiUrl", () => {
  it("joins auth origin with extension routes used by passkey unlock", () => {
    for (const path of EXTENSION_AUTH_API_PATHS) {
      expect(buildHelvetyAuthApiUrl(path)).toBe(
        `${HELVETY_AUTH_ORIGIN}${path}`
      );
    }
  });

  it("adds a leading slash when path is omitted", () => {
    expect(buildHelvetyAuthApiUrl("api/extension/passkey/options")).toBe(
      `${HELVETY_AUTH_ORIGIN}/api/extension/passkey/options`
    );
  });
});
