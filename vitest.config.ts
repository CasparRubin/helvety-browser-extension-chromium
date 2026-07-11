import { createExtensionVitestConfig } from "@helvety/config/vitest-extension";

export default createExtensionVitestConfig(import.meta.dirname, {
  passWithNoTests: false,
});
