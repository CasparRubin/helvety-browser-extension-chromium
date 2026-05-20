import { createPackageEslintConfig } from "@helvety/config/eslint";

export default [
  ...createPackageEslintConfig(import.meta.dirname),
  {
    ignores: ["dist/**", "eslint.config.mjs"],
  },
];
