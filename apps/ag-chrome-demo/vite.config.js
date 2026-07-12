import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  server: {
    port: 5180,
    fs: {
      allow: [
        path.resolve("."),
        path.resolve("../.."),
        path.resolve("../../perspective/packages/perspective-viewer-datagrid"),
      ],
    },
  },
  optimizeDeps: {
    exclude: ["@finos/perspective", "@finos/perspective-viewer"],
  },
  assetsInclude: ["**/*.wasm", "**/*.arrow"],
});
