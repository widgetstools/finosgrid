import * as esbuild from "esbuild";
import * as fs from "node:fs";
import * as path from "node:path";
import less from "less";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const PKG = path.join(
    ROOT,
    "perspective/packages/perspective-viewer-datagrid",
);
const LESS_DIR = path.join(PKG, "src/less");
const DIST_CSS = path.join(PKG, "dist/css");
const DIST_ESM = path.join(PKG, "dist/esm");

async function compileLess() {
    fs.mkdirSync(DIST_CSS, { recursive: true });

    // Resolve @imports relative to LESS_DIR by inlining registered files
    // similar to the package build: compile regular_table.less entry.
    const entry = path.join(LESS_DIR, "regular_table.less");
    const input = fs.readFileSync(entry, "utf8");
    const result = await less.render(input, {
        filename: entry,
        paths: [LESS_DIR],
    });
    fs.writeFileSync(
        path.join(DIST_CSS, "perspective-viewer-datagrid.css"),
        result.css,
    );

    const toolbar = path.join(LESS_DIR, "toolbar.less");
    const toolbarResult = await less.render(fs.readFileSync(toolbar, "utf8"), {
        filename: toolbar,
        paths: [LESS_DIR],
    });
    fs.writeFileSync(
        path.join(DIST_CSS, "perspective-viewer-datagrid-toolbar.css"),
        toolbarResult.css,
    );
    console.log("compiled datagrid CSS");
}

async function bundleJs() {
    fs.mkdirSync(DIST_ESM, { recursive: true });
    await esbuild.build({
        entryPoints: [path.join(PKG, "src/js/index.js")],
        outfile: path.join(DIST_ESM, "perspective-viewer-datagrid.js"),
        bundle: true,
        format: "esm",
        platform: "browser",
        target: ["es2022"],
        loader: {
            ".css": "text",
            ".html": "text",
        },
        // Resolve deps from the demo app's node_modules
        nodePaths: [path.resolve(__dirname, "../node_modules")],
        // Keep Perspective host packages external; bundle regular-table + chroma
        external: ["@finos/perspective", "@finos/perspective-viewer"],
        define: {
            global: "window",
        },
        logLevel: "info",
    });
    console.log("bundled datagrid ESM");
}

await compileLess();
await bundleJs();
