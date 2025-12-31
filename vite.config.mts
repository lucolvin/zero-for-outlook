import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/contentScript/index.js",
      name: "ZeroForOutlookContentScript",
      formats: ["iife"],
      fileName: () => "contentScript.js"
    },
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      // Content scripts don't need code splitting; force a single bundle
      output: {
        inlineDynamicImports: true
      }
    }
  }
});


