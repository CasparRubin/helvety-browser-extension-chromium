import { createPackageEslintConfig } from "@helvety/config/eslint";

export default [
  ...createPackageEslintConfig(import.meta.dirname),
  {
    ignores: ["dist/**", ".helvety/**", "eslint.config.mjs"],
  },
  {
    files: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "src/lib/decrypt-entities.ts",
      "src/lib/encrypt-entities.ts",
      "src/lib/entity-types.ts",
      "src/lib/entity-repository.ts",
      "src/lib/link-tree.ts",
    ],
    rules: {
      "jsdoc/require-jsdoc": "off",
    },
  },
];
