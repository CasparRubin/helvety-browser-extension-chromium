import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));

/** radix-ui re-exports optional packages that pnpm may not link into nested .pnpm paths */
function radixPkg(name: string): string {
  return path.join(root, "node_modules", "@radix-ui", name);
}

export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(root, "src"),
      "@radix-ui/react-one-time-password-field": radixPkg(
        "react-one-time-password-field"
      ),
      "@radix-ui/react-password-toggle-field": radixPkg(
        "react-password-toggle-field"
      ),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: path.resolve(root, "index.html"),
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
