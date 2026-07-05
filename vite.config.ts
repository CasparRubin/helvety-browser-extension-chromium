import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

/** @helvety/ui/globals.css imports shadcn/tailwind.css; Vite postcss-import needs an explicit alias. */
const shadcnTailwindCss = require.resolve("shadcn/tailwind.css");

export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "shadcn/tailwind.css": shadcnTailwindCss,
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        panel: path.resolve(root, "index.html"),
        background: path.resolve(root, "src/background.ts"),
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === "background" ? "background.js" : "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
