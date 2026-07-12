# Master Detail & Tree Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add AG Grid–compatible Master Detail and Tree Data to the finosgrid shell, on top of Perspective + regular-table, matching AG’s object model and expand UX.

**Architecture:** Keep the three-layer ADR (Perspective engine · regular-table body · owned shell). Tree Data reuses the existing virtual row map + auto-group column. Master Detail embeds a **child finosgrid** (or lightweight detail pane) as a full-width expanded row under a master `RowNode`, analogous to AG’s detail grid—not Perspective `group_by`.

**Tech Stack:** `@widgetstools/finosgrid/shell`, Perspective views, regular-table body panes, existing `detail_row_model.js` patterns, AG Grid v36 reference app for parity.

**Reference catalog:** [AG Grid complete feature catalog](../specs/2026-07-12-ag-grid-complete-feature-catalog.md)  
**ADR:** [Owned header shell](../specs/2026-07-12-finosgrid-shell-architecture-adr.md)

## Global Constraints

- Target AG Grid **v35+ / v36** option names and behaviors (no deprecated Column API).
- Public options must match AG: `treeData`, `getDataPath`, `masterDetail`, `detailCellRendererParams`, `isRowMaster`, `groupDefaultExpanded`, `autoGroupColumnDef`.
- Engine remains Perspective; do not invent a second compute engine.
- Body paint stays regular-table; expand UI stays in shell (auto-group / group cell renderer).
- Tests first for row-model helpers; spike demos for visual parity vs `apps/ag-grid-reference`.
- Prefer extending `detail_row_model.js` / `body_viewport.js` over parallel systems.

---

## File map

| File | Responsibility |
|---|---|
| `packages/datagrid/src/js/shell/tree_data.js` | `getDataPath` → virtual hierarchy; pathKey; expand state |
| `packages/datagrid/src/js/shell/master_detail.js` | Master flags, detail host lifecycle, height, keep cache |
| `packages/datagrid/src/js/shell/detail_row_model.js` | Extend virtual row kinds: `tree-group`, `tree-leaf`, `master`, `detail-host` |
| `packages/datagrid/src/js/shell/body_viewport.js` | Paint expand controls; insert full-width detail host rows; scroll sync |
| `packages/datagrid/src/js/shell/create_grid.js` | Wire `treeData` / `masterDetail` grid options + `setGridOption` |
| `packages/datagrid/src/js/shell/index.d.ts` | Types for new options / API |
| `packages/datagrid/test/js/shell/tree_data.spec.js` | Path hierarchy unit tests |
| `packages/datagrid/test/js/shell/master_detail.spec.js` | Master eligibility + host model tests |
| `apps/ag-grid-reference/src/App.jsx` | Toggle demos: Tree / Master Detail |
| `apps/shell-spike/src/main.js` | finosgrid demos for both features |
| `docs/ag-parity/tree-data/research.md` | Parity checklist + screenshots |
| `docs/ag-parity/master-detail/research.md` | Parity checklist + screenshots |

---

## AG behavior summary (implement against this)

### Tree Data

1. Set `treeData: true` and provide `getDataPath: (data) => string[]` (path mode—primary).
2. Grid builds a tree of `RowNode`s from unique path prefixes; leaf nodes hold `data`.
3. Auto-group column shows expand/collapse + label (`autoGroupColumnDef.field` or path key).
4. `groupDefaultExpanded` / `isGroupOpenByDefault` control initial open state.
5. Aggregation can roll up to folder nodes (Perspective agg later; phase 1 can omit or use client rollup).
6. Distinct from row grouping: hierarchy is **in the data**, not from `rowGroup` columns.

### Master Detail

1. Set `masterDetail: true`.
2. A column uses group cell renderer (AG: `agGroupCellRenderer`) for expand icon.
3. On expand, a **detail row** appears under the master with an embedded grid configured by `detailCellRendererParams.detailGridOptions`.
4. `getDetailRowData(params)` calls `params.successCallback(rows)` to feed the detail grid.
5. `isRowMaster(data)` optionally suppresses expand when no detail.
6. Height: `detailRowHeight` or `detailRowAutoHeight`.
7. `keepDetailRows` / `keepDetailRowsCount` cache detail grids when collapsed.
8. Master must be Client-Side or SSRM in AG; finosgrid phase 1 = client/Perspective table only.
9. Nesting: detail grid may itself set `masterDetail: true`.

### How this differs from today’s finosgrid “detail leaves”

| Today (row grouping hybrid) | Master Detail | Tree Data |
|---|---|---|
| Finest **group key** expands to Perspective-filtered flat leaves | **Master row** expands to **nested grid** (own columns) | Hierarchy from `getDataPath`; no separate nested grid |
| Same column defs as parent | Detail has `detailGridOptions.columnDefs` | Same grid columns; folder vs leaf rows |
| Driven by `group_by` | Driven by row data relationship | Driven by path array |

---

## Phase A — Tree Data

### Task A1: Path → hierarchy model

**Files:**
- Create: `packages/datagrid/src/js/shell/tree_data.js`
- Create: `packages/datagrid/test/js/shell/tree_data.spec.js`

- [ ] **Step 1: Write failing tests** for `buildTreeFromPaths(rows, getDataPath)`:
  - Paths `['A']`, `['A','B']`, `['A','C']` → root A with children B,C
  - Missing intermediate path still creates filler group node
  - `pathKey` stable

- [ ] **Step 2: Run test — expect fail**

```bash
cd packages/datagrid && npm test -- test/js/shell/tree_data.spec.js
```

- [ ] **Step 3: Implement** `buildTreeFromPaths`, `flattenTree(expandedKeys)`, `isTreeGroupNode`

- [ ] **Step 4: Run test — expect pass**

- [ ] **Step 5: Commit**

```bash
git add packages/datagrid/src/js/shell/tree_data.js packages/datagrid/test/js/shell/tree_data.spec.js
git commit -m "feat(shell): tree path hierarchy model for AG treeData"
```

### Task A2: Virtual row map integration

**Files:**
- Modify: `packages/datagrid/src/js/shell/detail_row_model.js`
- Modify: `packages/datagrid/test/js/shell/detail_row_model.spec.js`

- [ ] **Step 1: Failing tests** — `kind: 'tree-group' | 'tree-leaf'` in row map; expand toggles children visibility

- [ ] **Step 2: Implement** `buildTreeVirtualRowMap(tree, expanded)` without Perspective `group_by`

- [ ] **Step 3: Tests pass; commit**

```bash
git commit -m "feat(shell): virtual row map for treeData expand/collapse"
```

### Task A3: Wire GridOptions + body paint

**Files:**
- Modify: `create_grid.js`, `body_viewport.js`, `index.d.ts`, `index.js`

- [ ] **Step 1: Types** — `treeData?: boolean`, `getDataPath?: (data) => string[]`, `isGroupOpenByDefault?: (params) => boolean`

- [ ] **Step 2: When `treeData`**, skip row-group Perspective path; load flat `rowData`/table rows; build tree client-side (phase 1). Document follow-up: server-side tree via Perspective.

- [ ] **Step 3: Auto-group column** reuse existing `AUTO_GROUP_COL_ID` + chevron UI

- [ ] **Step 4: Spike** in `shell-spike` with org-chart / file-path sample

- [ ] **Step 5: Compare** to AG reference tree demo; note gaps in `docs/ag-parity/tree-data/research.md`

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(shell): AG treeData option with auto-group expand UI"
```

### Task A4: Tree + aggregation (stretch)

- [ ] Optional: rollup numeric fields for group nodes (client reduce) or Perspective expression view
- [ ] Commit only if spike proves value

---

## Phase B — Master Detail

### Task B1: Detail host row model

**Files:**
- Create: `packages/datagrid/src/js/shell/master_detail.js`
- Create: `packages/datagrid/test/js/shell/master_detail.spec.js`

- [ ] **Step 1: Failing tests**
  - `isRowMaster` false → no expand
  - Expand inserts `{ kind: 'detail-host', masterY, masterData }` after master
  - Collapse removes host; with `keepDetailRows` retains controller instance in LRU of `keepDetailRowsCount`

- [ ] **Step 2: Implement** model helpers (no DOM yet)

- [ ] **Step 3: Tests pass; commit**

```bash
git commit -m "feat(shell): master-detail host row model and keep cache"
```

### Task B2: Embed child grid in detail host

**Files:**
- Modify: `body_viewport.js`
- Modify: `create_grid.js`

- [ ] **Step 1: On paint of `detail-host`**, render a full-width cell/host `div.fg-shell__detail-host`

- [ ] **Step 2: Mount** `createGrid(host, detailGridOptions)` (recursive shell)

- [ ] **Step 3: Call** `getDetailRowData({ data, successCallback, node })` → `successCallback(rows)` → child `api.setGridOption('rowData', rows)` or child Perspective table

- [ ] **Step 4: Height** — `detailRowHeight` fixed; or `detailRowAutoHeight` measuring child

- [ ] **Step 5: Destroy** child grid on master collapse unless keep-cache hit

- [ ] **Step 6: Unit/integration smoke** + commit

```bash
git commit -m "feat(shell): embed child finosgrid in master-detail host rows"
```

### Task B3: GridOptions + group cell renderer

**Files:**
- Modify: `index.d.ts`, `create_grid.js`, `body_viewport.js` (decorate expand on configured column)

- [ ] **Step 1: Options** — `masterDetail`, `isRowMaster`, `detailCellRendererParams`, `detailRowHeight`, `detailRowAutoHeight`, `keepDetailRows`, `keepDetailRowsCount`

- [ ] **Step 2: Column** — support `cellRenderer: 'agGroupCellRenderer'` (alias) **or** `showRowGroup` / auto first column expand affordance for parity

- [ ] **Step 3: Events** — fire `onRowGroupOpened` / dedicated `onMasterDetailExpanded` if we add it (prefer AG event names where they exist)

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(shell): masterDetail grid options and group expand renderer"
```

### Task B4: Reference + spike demos

**Files:**
- Modify: `apps/ag-grid-reference/src/App.jsx` (mode switch: grouping | tree | masterDetail)
- Modify: `apps/shell-spike/src/main.js`
- Create: `docs/ag-parity/master-detail/research.md`

- [ ] **Step 1: AG reference** demo with accounts → callRecords JSON (AG sample shape)

- [ ] **Step 2: Shell spike** same data via `createGrid({ masterDetail: true, ... })`

- [ ] **Step 3: Screenshot + checklist** in research.md (expand, scroll, nested optional)

- [ ] **Step 4: Commit**

```bash
git commit -m "docs(demo): master-detail and tree parity spikes"
```

### Task B5: Nested master detail (stretch)

- [ ] Detail `detailGridOptions.masterDetail: true` with level-2 params
- [ ] Verify scroll/height; document limitations with regular-table full-width rows

---

## Phase C — Shared polish

### Task C1: Conflict rules

- [ ] Document & enforce: `treeData` and row-grouping `group_by` are mutually exclusive in v1 (match AG: don’t combine)
- [ ] `masterDetail` may combine with client filters/sort; not with infinite row model

### Task C2: Context menu hooks (prep)

- [ ] Ensure expand/collapse still work when context menu arrives later (`expandAll` / `contractAll` items)

### Task C3: Update parity index

- [ ] Update `docs/ag-parity/README.md` status rows for Tree Data + Master Detail
- [ ] Link catalog + this plan from shell ADR “Related”

---

## Suggested implementation order

1. **Tree Data A1→A3** (reuses expand UX; no nested grid complexity)
2. **Master Detail B1→B4** (nested grid; higher risk)
3. Stretch: tree agg, nested MD, SSRM later

## Test plan (manual)

| # | Check |
|---|---|
| 1 | AG reference tree: expand path folders; compare shell tree |
| 2 | Shell tree: `groupDefaultExpanded: 1` opens first level only |
| 3 | AG reference MD: expand account → detail grid with call rows |
| 4 | Shell MD: same; collapse destroys or keeps per `keepDetailRows` |
| 5 | `isRowMaster` false hides chevron |
| 6 | Horizontal scroll: detail host stays full width of center+pins (document any pin limitation) |
| 7 | Sticky group rows unaffected when MD/tree off |

## Out of scope (v1)

- Viewport / Infinite row models with MD
- Detail as arbitrary non-grid custom renderer (support API stub only)
- Excel export of detail rows
- Full AG SSRM tree/MD
