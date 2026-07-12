import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  server: {
    port: 5180,
    fs: {
      allow: [path.resolve("../..")],
    },
  },
  optimizeDeps: {
    exclude: [
      "@finos/perspective",
      "@finos/perspective-viewer",
      "@widgetstools/finosgrid",
    ],
  },
  assetsInclude: ["**/*.wasm"],
});
