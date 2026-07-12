import * as esbuild from "esbuild";
import * as fs from "node:fs";
import * as path from "node:path";
import less from "less";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const LESS_DIR = path.join(__dirname, "src/less");
const DIST_CSS = path.join(__dirname, "dist/css");
const DIST_ESM = path.join(__dirname, "dist/esm");
const DIST_CDN = path.join(__dirname, "dist/cdn");

function resolveNodePaths() {
    const paths = [path.join(__dirname, "node_modules")];
    // Workspace root node_modules (npm/pnpm hoisting)
    paths.push(path.join(__dirname, "../../node_modules"));
    return paths;
}

async function compileLess() {
    fs.mkdirSync(DIST_CSS, { recursive: true });

    const entry = path.join(LESS_DIR, "regular_table.less");
    const result = await less.render(fs.readFileSync(entry, "utf8"), {
        filename: entry,
        paths: [LESS_DIR],
    });
    fs.writeFileSync(
        path.join(DIST_CSS, "finosgrid.css"),
        result.css,
    );
    // Keep legacy filename for existing import path in custom element
    fs.writeFileSync(
        path.join(DIST_CSS, "perspective-viewer-datagrid.css"),
        result.css,
    );

    const shellEntry = path.join(LESS_DIR, "shell/header_stack.less");
    const shellResult = await less.render(
        fs.readFileSync(shellEntry, "utf8"),
        {
            filename: shellEntry,
            paths: [LESS_DIR],
        },
    );
    fs.writeFileSync(
        path.join(DIST_CSS, "finosgrid-shell.css"),
        shellResult.css,
    );

    const toolbar = path.join(LESS_DIR, "toolbar.less");
    const toolbarResult = await less.render(fs.readFileSync(toolbar, "utf8"), {
        filename: toolbar,
        paths: [LESS_DIR],
    });
    fs.writeFileSync(
        path.join(DIST_CSS, "finosgrid-toolbar.css"),
        toolbarResult.css,
    );
    fs.writeFileSync(
        path.join(DIST_CSS, "perspective-viewer-datagrid-toolbar.css"),
        toolbarResult.css,
    );
    console.log("compiled CSS");
}

async function bundleJs({ outfile, external }) {
    fs.mkdirSync(path.dirname(outfile), { recursive: true });
    await esbuild.build({
        entryPoints: [path.join(__dirname, "src/js/index.js")],
        outfile,
        bundle: true,
        format: "esm",
        platform: "browser",
        target: ["es2022"],
        loader: {
            ".css": "text",
            ".html": "text",
        },
        nodePaths: resolveNodePaths(),
        external,
        define: {
            global: "window",
        },
        logLevel: "info",
    });
}

async function build() {
    await compileLess();
    await bundleJs({
        outfile: path.join(DIST_ESM, "finosgrid.js"),
        external: ["@finos/perspective", "@finos/perspective-viewer"],
    });
    // CDN bundle also externalizes peer perspective packages
    await bundleJs({
        outfile: path.join(DIST_CDN, "finosgrid.js"),
        external: ["@finos/perspective", "@finos/perspective-viewer"],
    });
    // Alias legacy filename for drop-in imports
    fs.copyFileSync(
        path.join(DIST_ESM, "finosgrid.js"),
        path.join(DIST_ESM, "perspective-viewer-datagrid.js"),
    );
    console.log("build complete");
}

build().catch((err) => {
    console.error(err);
    process.exit(1);
});
