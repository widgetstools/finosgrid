import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    server: {
        port: 5182,
        fs: {
            allow: [path.resolve(root, "../..")],
        },
    },
    resolve: {
        alias: {
            "@widgetstools/finosgrid/shell": path.resolve(
                root,
                "../../packages/datagrid/src/js/shell/index.js",
            ),
        },
    },
    optimizeDeps: {
        exclude: [
            "@finos/perspective",
            "@finos/perspective-viewer",
            "@widgetstools/finosgrid",
            "@widgetstools/fi-position-feed",
        ],
    },
    worker: {
        format: "es",
    },
    assetsInclude: ["**/*.wasm"],
});
