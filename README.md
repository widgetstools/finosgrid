# finosgrid

AG Grid–like **UI chrome** on top of the [FINOS Perspective](https://perspective.finos.org/) datagrid.

Uses Perspective’s compute engine and viewport rendering unchanged. This project owns the look-and-feel and interaction chrome:

- Quartz-inspired theme
- Floating filters + set filter
- Conditional formatting
- Column groups
- Sticky group rows

## Packages

| Path | Package | Role |
|---|---|---|
| `packages/datagrid` | `@widgetstools/finosgrid` | Datagrid plugin (drop-in for `perspective-viewer`) |
| `apps/ag-chrome-demo` | `ag-chrome-demo` | Vite demo |

## Quick start

```bash
npm install
npm run build
npm start
```

Demo: [http://localhost:5180/](http://localhost:5180/)

## Usage

```js
import perspective from "@finos/perspective";
import perspective_viewer from "@finos/perspective-viewer";
import "@widgetstools/finosgrid"; // registers perspective-viewer-datagrid plugin

// … init wasm, create viewer, load table …
```

Optional chrome helpers on the plugin element:

```js
const grid = viewer.querySelector("perspective-viewer-datagrid");
grid.setColumnGroups([
  { headerName: "Geography", children: ["Region", "City"] },
  { headerName: "Metrics", children: ["Sales", "Profit"] },
]);
grid.setConditionalFormatting("Sales", [
  { op: ">", value: 200, fg: "#0b6e4f", bg: "#d8f3e7" },
]);
```

## Docs

- [Phase 1 design](docs/superpowers/specs/2026-07-12-perspective-ag-chrome-phase1-design.md)
- [Phase 2 design](docs/superpowers/specs/2026-07-12-perspective-ag-chrome-phase2-design.md)

## License

Apache-2.0 (Perspective-derived datagrid sources retain Perspective copyright headers).
