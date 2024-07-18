import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "url";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svgr(), react()],
  build: {
    outDir: "out",
    rollupOptions: {
      input: {
        client: fileURLToPath(new URL("./src/controls/index.tsx", import.meta.url)),
      },
      output: {
        entryFileNames: `src/[name].js`,
        chunkFileNames: `[name].js`,
        assetFileNames: `resource/[name].[ext]`,
      },
    },
    // bundle images < 100k
    assetsInlineLimit: 102400,
  },
});
