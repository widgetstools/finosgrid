# Perspective Datagrid AG Chrome — Phase 1 Design

**Date:** 2026-07-12  
**Status:** Approved; Phase 1 implementation in progress  
**Package:** `@finos/perspective-viewer-datagrid`  
**Checkout:** `/Users/develop/wfh/finosgrid/perspective`  
**Remote:** https://github.com/widgetstools/finosgrid

## 1. Goal

Enhance the Perspective datagrid so it has an **AG Grid–like look and feel** and Phase‑1 filter UX (**floating filters** + **set filter**), without changing:

- the Perspective compute engine (`Table` / `View` / WASM), or
- how viewport data is fetched and rendered (`dataListener` → `to_columns_string` → `format_cell` → `regular-table`).

Phase 1 = **D (theme + conditional styling) + A (floating + set filters)**.  
Architecture must stay **extensible** for later AG‑like chrome (column groups, sticky group rows, pivot UI, etc.).

## 2. Non‑negotiables

| Allowed | Forbidden |
|---|---|
| CSS / theme tokens | Changing `dataListener`, formatters, or virtualization |
| DOM chrome overlays (header band, popups) | Replacing `regular-table` with canvas or AG Grid |
| Mapping UI → `viewer.restore({ filter })` | Reimplementing filter/sort/pivot in JS |
| Extending `columns_config` + style listeners | Blocking the scroll/draw hot path with chrome work |
| Plugin `save` / `restore` for chrome state | Breaking existing Perspective viewer plugin contract |

**Performance bar:** chrome must not add measurable work to cell paint. Filter apply is debounced; set‑filter value lists are cached; style rules remain O(visible cells) inside existing `addStyleListener` passes.

## 3. Approach (locked)

**Chrome feature layer** inside the datagrid plugin (not a parallel package, not ad‑hoc CSS-only).

```text
┌──────────────────────────────────────────────────┐
│  ChromeFeatureHost                               │
│    theme | floatingFilters | setFilter           │
│    conditionalFormatting | (future features…)    │
└────────────────────┬─────────────────────────────┘
                     │ viewer.restore / columns_config
                     ▼
┌──────────────────────────────────────────────────┐
│  Existing hot path (unchanged)                   │
│  regular-table ← dataListener ← View             │
│  style_handlers ← columns_config                 │
└──────────────────────────────────────────────────┘
```

Each feature implements:

```ts
interface ChromeFeature {
  id: string;
  mount(ctx: ChromeContext): void;
  syncFromConfig(config: ViewConfig, columnsConfig: ColumnConfigMap): void;
  destroy(): void;
}
```

`ChromeContext` exposes: plugin element, `regular_table`, parent `viewer`, layout slots (`headerBand`, `popupPortal`), and helpers to apply filter / column style without touching the data listener.

## 4. Look & feel target (D)

### 4.1 Theme

- Target visual language: **AG Grid Quartz–inspired** (not pixel-perfect AG Grid, not AG Grid API).
- Deliver as a **theme pack** of CSS custom properties consumed by datagrid LESS and chrome components.
- Support light/dark via viewer / `:host` theme mode already used by Perspective.
- Tokens cover at least: header background, header text, row hover, borders, selected row/cell, input/filter chrome, popup panel, checkbox, icon color, font stack/size, spacing denseness.

Suggested location:

- `src/less/themes/quartz.less` (token definitions)
- Wire into existing `regular_table.less` / `toolbar.less` without forking the table markup.

### 4.2 Conditional formatting

- Rule model stored in plugin/`columns_config` (persisted via existing `save`/`restore` + viewer column config).
- Examples (Phase 1):
  - numeric: `op` in `>`, `>=`, `<`, `<=`, `==`, `!=` + value → fg/bg
  - string: `contains` / `==` / `startsWith` → fg/bg
  - optional: null styling
- Evaluation happens in existing type style handlers (`style_handlers/table_cell/*`) using raw `metadata` values — same post-pass model as today.
- UI: column settings / chrome panel to add/edit rules (can reuse viewer column settings entry points where possible).

**Out of Phase 1:** Excel-like formula rules, heatmap scales beyond existing gradient modes (existing number gradient/bar/pulse stay as-is).

## 5. Filter UX (A)

### 5.1 Floating filters

- DOM **header band** under leaf column headers (not part of cell data rows).
- Synced to: visible columns, widths, horizontal scroll of `regular-table`.
- Per-type controls:
  - string → text input → Perspective filter `contains` or `==` (default `contains`)
  - integer/float → operator + value
  - date/datetime → simple equality / range if already expressible; otherwise text equality first
  - boolean → tri-state or select
- Debounced apply → merge into View `filter` array via `viewer.restore({ filter })`.
- Clearing an input removes that column’s floating-filter clause(s) only.

### 5.2 Set filter

- AG-like popup: search box + select all + checkbox list + Apply/Reset.
- Uses Perspective filter form already supported: `["Column", "in", ["A", "B"]]`.
- Distinct values: query via a lightweight View / column unique path; **cache** until table update epoch or schema change.
- Opened from header menu icon (and optionally from floating filter affordance).

### 5.3 Filter composition

- Floating + set + existing viewer filters compose in one `filter` array.
- Chrome owns a tagged subset of clauses (e.g. by convention or parallel chrome state map) so UI clear does not wipe unrelated filters from the settings panel.
- Prefer: chrome keeps `chromeFilterState: Record<column, ChromeFilterClause>` and **rebuilds** the chrome-owned portion of `filter` on apply, preserving non-chrome clauses.

## 6. File / module map (Phase 1)

Under `packages/perspective-viewer-datagrid/src/js/`:

| Path | Responsibility |
|---|---|
| `chrome/host.js` | Feature registry, slots, lifecycle hooked from `activate` / `draw` / `update` / `delete` |
| `chrome/context.js` | Shared accessors (viewer, table, applyFilter, getColumnMeta) |
| `chrome/features/theme.js` | Apply theme class / dataset on host |
| `chrome/features/floating_filters.js` | Header band + debounce → filter |
| `chrome/features/set_filter.js` | Popup + `in` filter + value cache |
| `chrome/features/conditional_formatting.js` | Rules UI sync + feed style handlers |
| `chrome/filter_bridge.js` | Merge/split chrome vs non-chrome filter clauses |
| `less/themes/quartz.less` | AG Quartz–inspired tokens |
| `less/chrome/*.less` | Floating row, set-filter popup, rule editor chrome |

Wire points (minimal edits to existing files):

- `plugin/activate.js` — `ChromeFeatureHost.mount` once after model exists
- `plugin/draw.js` / update path — `syncFromConfig`
- `plugin/save.js` / `restore.js` — persist chrome state (theme id, floating values, rules)
- `style_handlers/table_cell/*` — apply conditional rules from columns_config
- `custom_elements/datagrid.js` — optional public getters if needed for tests

**Do not modify:** `data_listener/**` hot path logic except if a read-only metadata hook is required (prefer avoid).

## 7. Extension model (Phase 2+)

Reserved feature ids / slots (implement later, design now):

| Feature | Slot | Notes |
|---|---|---|
| Column groups | Extra header rows / overlay | Visual grouping; may map to `split_by` paths later |
| Sticky group rows | Overlay or CSS sticky on tree headers | Must not break virtualization |
| Pivot chrome | Toolbar / side panel | Still uses `group_by` / `split_by` / aggregates |
| Calculated columns UI | Expression editor chrome | Still uses Perspective expressions |

Adding a feature = new module + `host.register(feature)` — no rewrite of Phase 1.

## 8. Testing

- Playwright / existing `@finos/perspective-test` patterns in `packages/perspective-viewer-datagrid/test/`.
- Phase 1 cases:
  - Quartz theme loads; light/dark smoke
  - Floating filter updates View filter; clear restores rows
  - Set filter `in` list; select all / search / apply / reset
  - Conditional rule changes cell class/style on visible cells
  - Scroll + column resize keeps floating band aligned
  - Regression: streaming `update` still draws without chrome errors
- Performance smoke: scroll FPS / draw timing should remain in the same ballpark as baseline (document measurement method in plan).

## 9. Explicit non‑goals (Phase 1)

- AG Grid API compatibility (`GridOptions`, `ColDef`, `api.setFilterModel`, …)
- Replacing Perspective settings side panel wholesale
- Canvas renderer / cgrid integration
- Sticky groups, column group headers, full pivot UI
- Modifying `perspective-server` or Rust viewer except if a tiny plugin hook is unavoidable (prefer stay in JS datagrid package)

## 10. Success criteria

1. Datagrid visually reads as AG Grid Quartz–like in a side‑by‑side glance test.
2. Floating + set filters work end-to-end via View `filter` with no engine changes.
3. Conditional formatting rules apply through existing style pipeline.
4. Hot path files under `data_listener/` unchanged (or trivial no-op-safe reads only, justified in PR).
5. At least one additional chrome feature can be registered in a spike without changing `ChromeFeatureHost` public contract.

## 11. Open points (resolve in implementation plan)

1. Exact floating-band technique: overlay div vs injecting a non-data header row into `regular-table` (spike both; pick the one that tracks horizontal scroll with least flicker).
2. How chrome-owned filter clauses are tagged vs viewer settings filters (symbol key in parallel state vs filter metadata — prefer parallel state).
3. Whether conditional rules live only in plugin `save()` token or also in viewer `columns_config` (prefer `columns_config` for column-scoped rules so settings UI can share them).

## Related

- Architecture notes: prior chat analysis of `perspective-viewer-datagrid`
- Upstream filter docs: `docs/md/explanation/view/config/filter.md` (`in`, comparisons)
- Existing style config: `plugin/column_style_controls.js`, `style_handlers/table_cell/*`
