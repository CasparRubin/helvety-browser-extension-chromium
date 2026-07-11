import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const requireFromRoot = createRequire(path.join(rootDir, "package.json"));

/** @type {import("prettier").Config} */
export default {
  semi: true,
  singleQuote: false,
  tabWidth: 2,
  trailingComma: "es5",
  printWidth: 80,
  endOfLine: "auto",
  plugins: [requireFromRoot.resolve("prettier-plugin-tailwindcss")],
};
