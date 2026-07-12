# Perspective AG Chrome Phase 1 Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an extensible chrome feature layer to `@finos/perspective-viewer-datagrid` delivering AG Grid Quartz–inspired look, floating filters, set filter, and conditional formatting — without changing the View data path.

**Architecture:** `ChromeFeatureHost` registers UI-only features that mount DOM overlays and map to `viewer.restore({ filter })` / `columns_config`. Hot path under `data_listener/` stays untouched.

**Tech Stack:** Existing datagrid JS (ESM), LESS → `build.mjs` CSS, `regular-table`, Perspective View filter API.

## Global Constraints

- Do not modify `packages/perspective-viewer-datagrid/src/js/data_listener/**` logic.
- Do not replace `regular-table` or add AG Grid as a dependency.
- Filters apply only via `viewer.restore({ filter })`.
- Chrome work must stay off the cell paint hot path (debounce filter apply; cache set-filter values).
- Floating band technique: **overlay div** synced to `regular-table` scroll/widths (not injected data rows).
- Chrome-owned filters: **parallel `chromeFilterState`** merged into View filter on apply.
- Conditional rules: store under `columns_config[col].conditional_formatting` (array of rules); also mirror in plugin `save().chrome` for restore when needed.

---

## File map

| Create | Role |
|---|---|
| `src/js/chrome/types.js` | Shared JSDoc typedefs / constants |
| `src/js/chrome/filter_bridge.js` | Merge chrome state ↔ View filter array |
| `src/js/chrome/context.js` | `createChromeContext(plugin)` |
| `src/js/chrome/host.js` | `ChromeFeatureHost` registry |
| `src/js/chrome/features/theme.js` | Quartz theme feature |
| `src/js/chrome/features/floating_filters.js` | Floating filter band |
| `src/js/chrome/features/set_filter.js` | Set filter popup |
| `src/js/chrome/features/conditional_formatting.js` | Rules sync + helpers |
| `src/js/chrome/index.js` | Public barrel + default feature list |
| `src/less/themes/quartz.less` | AG Quartz–inspired tokens |
| `src/less/chrome/floating_filters.less` | Band styles |
| `src/less/chrome/set_filter.less` | Popup styles |
| `src/less/chrome/conditional_formatting.less` | Rule chip styles (minimal) |

| Modify | Role |
|---|---|
| `src/less/regular_table.less` | Import theme + chrome LESS |
| `build.mjs` | Include new LESS files in CSS compile |
| `src/js/plugin/activate.js` | Mount chrome host after model init |
| `src/js/plugin/draw.js` | `chrome.syncFromConfig` after draw |
| `src/js/custom_elements/datagrid.js` | sync on update; destroy on delete |
| `src/js/plugin/save.js` / `restore.js` | Persist `chrome` token |
| `src/js/style_handlers/table_cell/index.js` | Apply conditional rules after type styles |

---

### Task 1: Chrome host scaffold + filter bridge

**Files:**
- Create: `perspective/packages/perspective-viewer-datagrid/src/js/chrome/types.js`
- Create: `perspective/packages/perspective-viewer-datagrid/src/js/chrome/filter_bridge.js`
- Create: `perspective/packages/perspective-viewer-datagrid/src/js/chrome/context.js`
- Create: `perspective/packages/perspective-viewer-datagrid/src/js/chrome/host.js`
- Create: `perspective/packages/perspective-viewer-datagrid/src/js/chrome/index.js`

- [ ] **Step 1:** Implement `filter_bridge.js` with:
  - `chromeFilterState` shape: `{ [column: string]: { kind: 'floating'|'set', op: string, value: any } }`
  - `toPerspectiveFilters(state)` → `Array<[col, op, value]>`
  - `mergeFilters(existingFilter, chromeState)` → preserves non-chrome clauses by rebuilding: drop previous chrome columns’ clauses that match chrome-managed columns, append `toPerspectiveFilters(chromeState)`.
  - `isChromeManagedClause(clause, chromeState)` helper.

- [ ] **Step 2:** Implement `createChromeContext(plugin)` returning `{ plugin, regular_table, viewer, slots: { root, headerBand, popupPortal }, chromeFilterState, applyChromeFilters(), getColumnPaths(), getColumnType(name) }`.

- [ ] **Step 3:** Implement `ChromeFeatureHost` with `register`, `mount`, `syncFromConfig`, `save`, `restore`, `destroy`.

- [ ] **Step 4:** Commit scaffold.

---

### Task 2: Quartz theme feature + LESS

**Files:**
- Create: `src/less/themes/quartz.less`
- Create: `src/js/chrome/features/theme.js`
- Modify: `src/less/regular_table.less` (import)
- Modify: `build.mjs` (add less paths if needed via import chain)

- [ ] **Step 1:** Define Quartz light/dark CSS variables (`--ag-chrome-*` and map onto existing `--rt-*` / `--plugin-*` where possible).
- [ ] **Step 2:** Theme feature sets `data-ag-theme="quartz"` on plugin / regular-table host.
- [ ] **Step 3:** Commit.

---

### Task 3: Wire host into plugin lifecycle

**Files:**
- Modify: `activate.js`, `draw.js`, `datagrid.js`, `save.js`, `restore.js`

- [ ] **Step 1:** After model init in `activate`, create host, register default features (theme only at first wire-up if others not ready — or all stubs), `mount`.
- [ ] **Step 2:** After draw completes, `syncFromConfig(model._config, columns_config)`.
- [ ] **Step 3:** `save()` merges `chrome: host.save()`; `restore` calls `host.restore(token.chrome)`.
- [ ] **Step 4:** `delete()` calls `host.destroy()`.
- [ ] **Step 5:** Commit.

---

### Task 4: Floating filters

**Files:**
- Create: `features/floating_filters.js`, `less/chrome/floating_filters.less`

- [ ] **Step 1:** Overlay band under headers; one input (or op+input) per leaf column.
- [ ] **Step 2:** Sync positions from `regular-table` scrollLeft + column header cell getBoundingClientRect (or `_column_sizes`).
- [ ] **Step 3:** Debounce 200ms → update `chromeFilterState` → `applyChromeFilters()`.
- [ ] **Step 4:** Commit.

---

### Task 5: Set filter

**Files:**
- Create: `features/set_filter.js`, `less/chrome/set_filter.less`

- [ ] **Step 1:** Header filter icon; popup with search, select-all, checkboxes, Apply/Reset.
- [ ] **Step 2:** Load distinct values via `table.view({ columns: [col] })` + `to_columns` unique set; cache by column + table size/epoch.
- [ ] **Step 3:** Apply as `["col", "in", selectedValues]`.
- [ ] **Step 4:** Commit.

---

### Task 6: Conditional formatting

**Files:**
- Create: `features/conditional_formatting.js`
- Create: `src/js/style_handlers/table_cell/conditional.js`
- Modify: `style_handlers/table_cell/index.js`

- [ ] **Step 1:** Rule shape `{ op, value, fg?, bg? }`; read from `plugin[PRIVATE_PLUGIN_SYMBOL][col].conditional_formatting`.
- [ ] **Step 2:** After type styling, if rule matches raw `metadata.user`, set `td.style.color` / `backgroundColor`.
- [ ] **Step 3:** Minimal UI: allow rules via restore/columns_config (and a small “add rule” control in set-filter popup footer or column header context — prefer applying via `columns_config` API for Phase 1 if viewer settings integration is heavy).
- [ ] **Step 4:** Commit.

---

### Task 7: Smoke verification + docs

- [ ] Update design spec status to `Implemented (Phase 1 in progress/complete)`.
- [ ] Manual checklist in plan completion notes.
- [ ] Final commit.

## Spec coverage check

| Spec item | Task |
|---|---|
| ChromeFeatureHost | 1, 3 |
| Quartz theme | 2 |
| Floating filters | 4 |
| Set filter | 5 |
| Conditional formatting | 6 |
| save/restore chrome | 3 |
| Extensibility | 1 (register API) |
| data_listener untouched | constraint |
