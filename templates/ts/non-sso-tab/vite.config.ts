import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  define: {
    global: "globalThis",
  },
  build: {
    outDir: "lib/static",
    rollupOptions: {
      input: {
        teamsapp: resolve(__dirname, "src/static/scripts/teamsapp.ts"),
      },
      output: {
        entryFileNames: "scripts/[name].js",
        chunkFileNames: "scripts/[name].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
  },
});
