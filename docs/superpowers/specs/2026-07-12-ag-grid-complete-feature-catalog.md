# AG Grid Complete Feature Catalog (v35+/v36)

**Date:** 2026-07-12  
**Status:** Reference (living)  
**Audience:** finosgrid parity work  
**Sources:** [AG Grid JavaScript docs](https://www.ag-grid.com/javascript-data-grid/) (Community + Enterprise), Context Menu / Column Menu / Master Detail / Tree Data / Community vs Enterprise pages  
**Related:** [Shell ADR](./2026-07-12-finosgrid-shell-architecture-adr.md), [Column groups & aggregation](./2026-07-12-ag-column-groups-and-aggregation-reference.md), [Master Detail & Tree plan](../plans/2026-07-12-master-detail-and-tree-data.md)

This document captures AG Grid’s **UI surfaces**, **feature behaviors**, **object model**, and **APIs** for parity planning. Edition markers: **(C)** Community · **(E)** Enterprise.

---

## 1. Mental model (object graph)

```
createGrid(el, GridOptions) → GridApi
       │
       ├─ columnDefs: (ColDef | ColGroupDef)[]
       │     └─ Column / ColumnGroup runtime objects
       │
       ├─ row model (ClientSide | Infinite | Viewport | ServerSide)
       │     └─ RowNode tree (group / leaf / detail / pinned)
       │
       ├─ overlays, sideBar, statusBar, menus, charts
       └─ events (GridEvents) + setGridOption / getGridOption
```

| Concept | Type / shape | Role |
|---|---|---|
| **GridOptions** | config bag | Declarative grid + feature switches |
| **GridApi** | imperative API | All runtime control (Column API merged into GridApi since v31) |
| **ColDef** | leaf column config | Field binding, filter, edit, pin, agg, group, style |
| **ColGroupDef** | nested header group | `children`, `openByDefault`, `marryChildren`, `columnGroupShow` |
| **Column** | runtime | `getColId()`, `isVisible()`, `isPinned()`, state helpers |
| **ColumnGroup** | runtime | Open/close, children, sticky label |
| **RowNode** | runtime row | `data`, `group`, `expanded`, `level`, `parent`, `childrenAfterGroup`, selection |
| **CellValue / ValueGetter / ValueFormatter** | functions | Display vs raw value pipeline |
| **ModuleRegistry** | modules | Feature gating (ClipboardModule, MasterDetailModule, …) |

**Edition rule:** Enterprise features require the matching module **and** typically show an `(e)` badge in docs. Without a license key, Enterprise runs with watermark locally.

---

## 2. UI chrome map (what the user sees)

```
┌─ Root ─────────────────────────────────────────────────────────────┐
│ [Side Bar] │  Header stack                                          │
│  Columns   │   ┌─ Column group row(s) ───────────────────────────┐ │
│  Filters   │   ├─ Leaf headers (+ menu / filter / sort icons)    │ │
│  Custom    │   ├─ Floating filter row                            │ │
│            │   └─ (optional) Header checkbox / row drag handle   │ │
│            │  Body viewport                                        │
│            │   ┌─ Sticky top (group headers / top totals) ──────┐ │
│            │   │ Pinned-left │ Center (H+V scroll) │ Pinned-right│ │
│            │   │  … rows / groups / detail / tree …             │ │
│            │   └─ Sticky bottom (group/grand totals) ───────────┘ │
│            │  Horizontal / vertical scrollbars                     │
│            ├─ Status bar (counts, aggs, selection info)            │
│            └─ Overlays (loading / no-rows / custom)                │
└─ Popups: Column Menu · Context Menu · Charts · Tooltips · Dialogs ─┘
```

**Interaction surfaces**

| Surface | Trigger | Typical contents |
|---|---|---|
| Leaf header | click / drag / menu button | Sort, resize, move, pin, filter launch |
| Floating filter | type / set UI | Per-column quick filter |
| Cell | click / dblclick / F2 | Focus, edit, range select |
| Row | click / checkbox / drag | Selection, reorder, expand |
| Context menu | right-click cell | Clipboard, export, charts, pin, custom |
| Column menu | header ☰ or header right-click | Sort, pin, agg, group, chooser, filter |
| Side bar | tab icons | Columns / Filters tool panels |
| Status bar | always-on footer panels | Filtered count, selected count, agg values |
| Overlay | empty / loading | Centered message + optional CTA |

---

## 3. Feature catalog

For each feature: **UI** · **Behavior** · **Object model** · **API / events** · **Edition**.

### 3.1 Layout, theming, styling **(C)**

| | |
|---|---|
| **UI** | Themes (Quartz, Alpine, Balham, Material, legacy); CSS variables / Theme API `themeQuartz.withParams(...)`; dark/light via `browserColorScheme` / `agThemeMode` |
| **Behavior** | Row height, header height, compact density; cell/row class rules; conditional formatting via `cellClassRules` / `cellStyle` |
| **Model** | `theme`, `rowHeight`, `headerHeight`, `getRowStyle`, `getRowClass`, `cellClassRules` |
| **API** | `setGridOption('theme'…]`, redraw; no dedicated “theme API” beyond options |
| **finosgrid** | Shell: `themeQuartz.withParams` + `themeMode` / `setThemeMode` → `--ag-*` / `--fg-*` CSS vars (see [theme-quartz research](../../ag-parity/theme-quartz/research.md)) |

### 3.2 Columns — structure & state **(C)** (+ groups polish **(C/E)**)

| | |
|---|---|
| **UI** | Nested group headers; expand/collapse group; pin left/right; hide/show; resize; reorder; autosize; flex columns |
| **Behavior** | `columnGroupShow: 'open'\|'closed'`; `openByDefault`; `marryChildren`; sticky group labels; pin-split groups |
| **Model** | `ColDef`, `ColGroupDef`, `Column`, `ColumnGroup`, column state `{ colId, hide, width, pinned, sort, … }` |
| **API** | `applyColumnState`, `getColumnState`, `resetColumnState`, `getAllGridColumns`, `setColumnsVisible`, `setColumnsPinned`, `autoSizeColumns`, `autoSizeAllColumns`, `moveColumns`, `setColumnGroupOpened`, `getColumnGroupState`, `setColumnGroupState` |
| **Events** | `columnMoved`, `columnResized`, `columnVisible`, `columnPinned`, `columnGroupOpened`, `displayedColumnsChanged` |

### 3.3 Sorting **(C)** · multi-sort **(E)** often bundled with enterprise workflows

| | |
|---|---|
| **UI** | Header sort indicators; multi-sort via Shift+click (config); sort in column menu |
| **Behavior** | Asc / desc / none; comparator; multi-column sort index |
| **Model** | `ColDef.sortable`, `sort`, `sortIndex`, `comparator` |
| **API** | `applyColumnState({ state:[{ colId, sort }] })`, `getColumnState` |
| **Events** | `sortChanged` |

### 3.4 Filtering **(C)** + Set / Multi / Advanced **(E)**

| | |
|---|---|
| **UI** | Header filter button; floating filters; Filters tool panel; set-filter checklist; multi-filter tabs |
| **Behavior** | Text / Number / Date / Boolean; Set filter (unique values); Multi filter; Advanced Filter builder; external filter; Quick Filter (global text) |
| **Model** | `ColDef.filter`, `filterParams`, `floatingFilter`; `FilterModel` map `colId → model` |
| **API** | `setFilterModel`, `getFilterModel`, `isAnyFilterPresent`, `onFilterChanged`, `showColumnFilter`, `hideColumnFilter`, `getQuickFilter` / `setGridOption('quickFilterText')` |
| **Events** | `filterChanged`, `filterModified` |

### 3.5 Row models & data loading **(C/E)**

| Model | Edition | UI / behavior |
|---|---|---|
| **Client-Side** | C | All rows in browser; full sort/filter/group client-side |
| **Infinite** | C | Block loading as user scrolls; limited features |
| **Viewport** | E | Server pushes viewport slices |
| **Server-Side (SSRM)** | E | Server does sort/filter/group/pivot/agg; lazy group expand |

| | |
|---|---|
| **Model** | `rowModelType`, `rowData`, `datasource` / `serverSideDatasource`, `cacheBlockSize`, `getRowId` |
| **API** | `setGridOption('rowData')`, `applyTransaction` / `applyTransactionAsync`, `refreshServerSide`, `purgeInfiniteCache`, `forEachNode`, `forEachLeafNode`, `getRowNode`, `getDisplayedRowAtIndex` |
| **Events** | `rowDataUpdated`, `modelUpdated`, `storeRefreshed` (SSRM) |

### 3.6 Selection — Row, Cell & Range

AG treats **row selection** and **cell selection** as separate systems. They can be enabled together. Legacy names: `enableRangeSelection` → modern `cellSelection`; string `rowSelection: 'single'|'multiple'` → object `rowSelection: { mode: 'singleRow'|'multiRow', ... }` (v32+).

---

#### 3.6.1 Row selection **(C)** — `RowSelectionModule`

**Docs:** [Row Selection](https://www.ag-grid.com/javascript-data-grid/row-selection/) · [API Reference](https://www.ag-grid.com/javascript-data-grid/row-selection-api-reference/)

##### UI

| Element | Behavior |
|---|---|
| Selection column checkboxes | Dedicated leftmost selection column (default `checkboxLocation: 'selectionColumn'`) |
| Header “select all” checkbox | Multi-row only; controlled by `headerCheckbox` + `selectAll` mode |
| Auto-group column checkboxes | Optional via `checkboxLocation: 'autoGroupColumn'` (grouping / tree) |
| Row click / Ctrl-click | Optional via `enableClickSelection` |
| Space on focused row | Selects / toggles selection |
| Highlight | Selected rows get selected-row styling |

##### Modes

| `rowSelection.mode` | Behavior |
|---|---|
| `'singleRow'` | At most one row selected |
| `'multiRow'` | Multiple rows; Shift/Ctrl patterns; header select-all |

##### Configuration object (`RowSelectionOptions`)

**Shared (single + multi)**

| Option | Default | Meaning |
|---|---|---|
| `mode` | — | `'singleRow'` \| `'multiRow'` |
| `checkboxes` | `true` | Show checkboxes (`boolean` or per-row callback) |
| `checkboxLocation` | `'selectionColumn'` | `'selectionColumn'` \| `'autoGroupColumn'` |
| `enableClickSelection` | `false` | `true` \| `false` \| `'enableSelection'` \| `'enableDeselection'` |
| `isRowSelectable` | all selectable | `(node) => boolean` |
| `hideDisabledCheckboxes` | `false` | Hide checkbox when not selectable |
| `copySelectedRows` | `false` | Clipboard copies whole selected rows, not just focused cell |
| `enableSelectionWithoutKeys` | `false` | Touch/single-click multi select without modifier keys |
| `masterSelects` | `'self'` | `'self'` \| `'detail'` — master/detail interaction |

**Multi-row only**

| Option | Default | Meaning |
|---|---|---|
| `headerCheckbox` | `true` | Select-all in header |
| `selectAll` | `'all'` | How select-all applies (`'all'` \| filtered / current page variants — see SelectAllMode) |
| `groupSelects` | `'self'` | `'self'` \| `'descendants'` \| `'filteredDescendants'` — group checkbox cascade |
| `ctrlASelectsRows` | `false` | Ctrl+A selects rows when cell selection also on |

##### Object model

| Piece | Role |
|---|---|
| `RowNode.isSelected()` | `true` / `false` / `undefined` (partial group when `groupSelects` is descendants) |
| `RowNode.setSelected(newValue, clearSelection?)` | Programmatic select/deselect |
| Selection column | Synthetic column when `checkboxLocation === 'selectionColumn'` |
| Grid State | Row selection persisted in AG Grid State API |

##### GridApi

| Method | Notes |
|---|---|
| `getSelectedRows()` | Unsorted selected **data** |
| `getSelectedNodes()` | Unsorted selected **RowNode**s (prefer for groups/tree) |
| `setNodesSelected({ nodes, newValue })` | Bulk set |
| `selectAll(mode?)` | Select all (respect filter/page via mode) |
| `deselectAll(mode?)` | Clear selection |

##### Events

| Event | When |
|---|---|
| `rowSelected` | One node selected/deselected — use `node.isSelected()` |
| `selectionChanged` | Overall selection changed — `selectedNodes` (SSRM: may be null; use `serverSideState`) |

##### Interaction with other features

- Works with **row grouping**, **tree data**, **SSRM** (see AG sub-docs).
- With **master detail**, `masterSelects: 'detail'` mirrors header-checkbox into detail grid.
- Status bar can show selected-row count / aggs over selection.

##### finosgrid

Not started (parity stub: `docs/ag-parity/selection/research.md`).

---

#### 3.6.2 Cell selection / ranges **(E)** — `CellSelectionModule`

**Docs:** [Cell Selection](https://www.ag-grid.com/javascript-data-grid/cell-selection/)  
**Legacy:** `enableRangeSelection: true` → `cellSelection: true` \| `{ ... }`

Cell selection is Excel-like **rectangular ranges of cells** (not whole rows). Used for clipboard, status-bar range aggs, and charting from range.

##### UI

| Gesture | Result |
|---|---|
| Click-drag across cells | Create range; clears other ranges |
| Ctrl + drag outside existing range | Add another range (unless `suppressMultiRanges`) |
| Shift + click | Range from focused cell to clicked cell |
| Shift + arrows | Grow range from focus |
| Ctrl+Shift + arrows | Extend to edge in arrow direction |
| Ctrl + drag inside range | Deselect covered cells (may split into multiple rects) |
| Ctrl + click cell | Deselect that cell |
| Column header click | Optional: select whole column (`enableColumnSelection`) |
| Range / fill handle | Bottom-right handle — see below |

Pinned columns/rows: ranges are continuous across pin boundaries (conceptually “flatten” the grid — no gaps).

##### Configuration (`cellSelection: true | CellSelectionOptions`)

| Option | Default | Meaning |
|---|---|---|
| `suppressMultiRanges` | `false` | Only one range even with Ctrl |
| `enableHeaderHighlight` | `false` | Highlight headers spanning the range |
| `enableColumnSelection` | `false` | Click/Enter on header selects column of cells; Alt+Enter/click for sort when this is on |
| `handle` | — | `{ mode: 'range' }` or `{ mode: 'fill', ... }` — selection/fill handle |

##### Fill handle & range handle **(E)**

| `handle.mode` | Behavior |
|---|---|
| `'fill'` | Excel fill-handle: drag to copy/series-fill into adjacent cells (needs editable cells for edits) |
| `'range'` | Drag handle extends the selected range |

##### Keyboard / edit interactions on a range

| Action | Behavior |
|---|---|
| Ctrl+D | Copy top row of range down into other rows in range |
| Type + Ctrl+Enter | Bulk edit: set value on all editable cells in range |
| Delete | Clear range cells to `null` (valueParser may see `''`) |

##### Object model

| Piece | Role |
|---|---|
| `CellRange` | `{ startRow, endRow, columns, startColumn }` (AG internal shape) |
| Grid State | Cell ranges can be saved/restored with Grid State |

##### GridApi (cell ranges)

| Method | Notes |
|---|---|
| `getCellRanges()` | Current ranges |
| `addCellRange(range)` | Add a range |
| `clearCellSelection()` / clear ranges API | Clear (name varies by version — prefer docs for v36) |
| Clipboard helpers | `copySelectedRangeToClipboard`, etc. |

##### Events

| Event | When |
|---|---|
| `cellSelectionChanged` | Ranges changed (replaces older `rangeSelectionChanged` in modern docs) |
| `cellSelectionDeleteStart` / `cellSelectionDeleteEnd` | Delete-key clear of range |

##### Interaction with row selection

- Both can be on: clicking may focus cells for ranges while checkboxes drive row selection.
- `rowSelection.ctrlASelectsRows` controls whether Ctrl+A selects rows when cell selection is enabled.

##### finosgrid

Not started. Reference app already sets `cellSelection` on AG demo for visual parity target.

---

#### 3.6.3 Quick comparison

| | Row selection | Cell / range selection |
|---|---|---|
| Edition | Community | Enterprise (`CellSelectionModule`) |
| Selects | Whole rows | Rectangular cell ranges |
| Primary option | `rowSelection: { mode }` | `cellSelection: true \| { }` |
| Typical UI | Checkboxes / click | Mouse drag / Shift |
| Clipboard default | Focused cell (or whole rows if `copySelectedRows`) | Selected range |
| Charts | — | `chartRange` from selection |
| Status bar | Selected row count | Aggs over range |

---

### 3.7 Editing **(C)**

| | |
|---|---|
| **UI** | Full-row or cell editors; provided text/number/date/select/rich-select; custom editors; popup editors |
| **Behavior** | Start on dblclick / Enter / typing; stop on blur / Enter / Tab; validation; undo/redo stack (E often) |
| **Model** | `editable`, `cellEditor`, `cellEditorParams`, `valueSetter`, `onCellValueChanged` |
| **API** | `startEditingCell`, `stopEditing`, `getEditingCells`, `undoCellEditing`, `redoCellEditing` |
| **Events** | `cellEditingStarted`, `cellEditingStopped`, `cellValueChanged`, `rowValueChanged` |

### 3.8 Cell rendering & sparklines **(C/E)**

| | |
|---|---|
| **UI** | Custom cell renderers; group cell renderer; sparklines in cells **(E)** |
| **Model** | `cellRenderer`, `cellRendererParams`, `cellRendererSelector` |
| **API** | Refresh via `api.refreshCells`, `api.redrawRows` |

### 3.9 Updating data / transactions / immutable store **(C)**

| | |
|---|---|
| **Behavior** | Add/remove/update via transaction; flash cells on change; async transactions |
| **API** | `applyTransaction`, `applyTransactionAsync`, `flushAsyncTransactions`, `setGridOption('rowData')` |
| **Events** | `rowDataUpdated`, `asyncTransactionsFlushed` |

### 3.10 Pagination **(C)**

| | |
|---|---|
| **UI** | Pagination panel (first/prev/next/last, page size) |
| **Model** | `pagination`, `paginationPageSize`, `paginationAutoPageSize` |
| **API** | `paginationGoToPage`, `paginationGetCurrentPage`, `paginationGetTotalPages` |

### 3.11 Row grouping **(E)** (finosgrid: partial via Perspective)

| | |
|---|---|
| **UI** | Auto-group column; expand/collapse; row group panel (drag columns); sticky group headers; group total rows |
| **Behavior** | `rowGroup` / `rowGroupIndex`; `groupDisplayType` (`singleColumn` \| `multipleColumns` \| `groupRows` \| `custom`); `groupDefaultExpanded`; sticky via `suppressGroupRowsSticky`; totals via `groupTotalRow` / `grandTotalRow` (`top`\|`bottom`) |
| **Model** | Group `RowNode`s with `group=true`, `key`, `childrenAfterGroup`, `aggData` |
| **API** | `setRowGroupColumns`, `addRowGroupColumns`, `removeRowGroupColumns`, `getRowGroupColumns`, `expandAll`, `collapseAll`, `setRowNodeExpanded` |
| **Events** | `columnRowGroupChanged`, `rowGroupOpened` |

### 3.12 Aggregation **(E)**

| | |
|---|---|
| **UI** | Agg values on group rows / total rows; value column drop zones; column menu value-agg submenu |
| **Behavior** | Built-ins: `sum`, `min`, `max`, `avg`, `count`, `first`, `last`; custom `aggFunc`; `aggFuncs` registry |
| **Model** | `ColDef.aggFunc`, `enableValue`, `allowedAggFuncs` |
| **API** | `addAggFuncs`, `clearAggFuncs`, `setColumnAggFunc` (finosgrid), column state `aggFunc` |

### 3.13 Pivoting **(E)**

| | |
|---|---|
| **UI** | Pivot mode; pivot drop zone; generated pivot columns; pivot chart |
| **Behavior** | `pivot: true` / `enablePivot`; `pivotMode`; secondary columns; `pivotDefaultExpanded` |
| **API** | `setPivotColumns`, `getPivotColumns`, `setPivotMode`, `getPivotResultColumns` |
| **Events** | `columnPivotChanged`, `columnPivotModeChanged` |

### 3.14 Tree data **(E)** — see implementation plan

| | |
|---|---|
| **UI** | Hierarchical expand/collapse in auto-group column; file-explorer style |
| **Behavior** | `treeData: true` + `getDataPath(data) => string[]` **or** parent-id mode (`treeDataParentIdField` / related); fills group nodes from paths; works with agg |
| **Model** | Same `RowNode` hierarchy as grouping, but hierarchy comes from data paths not `rowGroup` cols |
| **API** | `setRowNodeExpanded`, `expandAll`, `collapseAll`, `isGroupOpenByDefault` |
| **Events** | `rowGroupOpened` |

### 3.15 Master / Detail **(E)** — see implementation plan

| | |
|---|---|
| **UI** | Master row expand → nested Detail Grid (or custom detail) under the row; optional nested MD |
| **Behavior** | `masterDetail: true`; `agGroupCellRenderer` on a column; `detailCellRendererParams.detailGridOptions` + `getDetailRowData`; height fixed/auto; keepDetailRows cache; refresh strategies |
| **Model** | Master `RowNode` + detail row embedding a child `GridApi` |
| **API** | `setRowNodeExpanded`, detail grid via `params.api` in detail callbacks; `isRowMaster` |
| **Events** | `rowGroupOpened` (expand), detail grid events independently |

### 3.16 Clipboard **(E)**

| | |
|---|---|
| **UI** | Ctrl/Cmd+C/X/V; context menu copy/cut/paste |
| **Behavior** | Cell/range copy; copy with headers; paste into editable cells; Excel-like TSV |
| **API** | `copySelectedRangeToClipboard`, `copySelectedRowsToClipboard`, suppress flags |
| **Events** | `cutStart`/`cutEnd`, `pasteStart`/`pasteEnd` |

### 3.17 Export CSV **(C)** / Excel **(E)**

| | |
|---|---|
| **UI** | Context menu Export → CSV / Excel; API buttons |
| **Behavior** | Export visible / selected / all; styles & formulas on Excel enterprise |
| **API** | `exportDataAsCsv`, `getDataAsCsv`, `exportDataAsExcel`, `getDataAsExcel`, `getSheetDataForExcel` |

### 3.18 Integrated charts & sparklines **(E)** (+ charts enterprise bundle)

| | |
|---|---|
| **UI** | Chart from range (context menu); pivot chart; chart tool panels; sparklines in cells |
| **API** | `createRangeChart`, `createPivotChart`, `createCrossFilterChart`, chart update APIs |
| **Events** | `chartCreated`, `chartDestroyed`, … |

### 3.19 Tool panels & side bar **(E)**

| | |
|---|---|
| **UI** | Collapsible side bar with Columns + Filters (+ custom) panels; drag columns to row group / pivot / values |
| **Model** | `sideBar: true \| SideBarDef`, `toolPanels[]` |
| **API** | `openToolPanel`, `closeToolPanel`, `getOpenedToolPanel`, `isSideBarVisible`, `setSideBarVisible` |

### 3.20 Status bar **(E)**

| | |
|---|---|
| **UI** | Bottom panels: total/filtered/selected row counts; aggregation on selection |
| **Model** | `statusBar: { statusPanels: [...] }` with `agTotalRowCountComponent`, etc. |
| **finosgrid** | **Done** (`feature/status-bar`) — provided panels, `aggFuncs`, `valueFormatter`, custom panels, `getStatusPanel` |

### 3.21 Context menu **(E)** — full inventory in §5

### 3.22 Column menu **(E)** — full inventory in §6

### 3.23 Overlays **(C)**

| | |
|---|---|
| **UI** | Loading overlay; no-rows overlay; custom overlay component |
| **API** | `showLoadingOverlay`, `showNoRowsOverlay`, `hideOverlay` |

### 3.24 Keyboard navigation & a11y **(C)**

| | |
|---|---|
| **Behavior** | Arrow keys, Tab, Enter, F2, Ctrl+A, page up/down; ARIA grid roles |
| **API** | `setFocusedCell`, `getFocusedCell`, `tabToNextCell`, `tabToPreviousCell` |

### 3.25 Row dragging / fill handle **(C/E)**

| | |
|---|---|
| **UI** | Drag handle to reorder rows; range fill handle for series fill |
| **Model** | `rowDragManaged`, `rowDrag`, `fillHandle` / cell selection fill |

### 3.26 Pinned rows **(C)** · pin rows via menu **(E)**

| | |
|---|---|
| **UI** | Pinned top/bottom row sections; context menu pin top/bottom |
| **Model** | `pinnedTopRowData`, `pinnedBottomRowData`; context items `pinTop` / `pinBottom` / `unpinRow` |
| **API** | `setGridOption('pinnedTopRowData')`, … |

### 3.27 Full-width rows & custom detail **(C/E)**

| | |
|---|---|
| **UI** | Row spans full width with custom renderer (used by MD) |
| **Model** | `isFullWidthRow`, `fullWidthCellRenderer` |

### 3.28 Formulas **(E)** (newer AG)

| | |
|---|---|
| **Behavior** | Spreadsheet-like formulas on cells (AG Formulas module) — track as stretch goal for finosgrid |

### 3.29 AI Toolkit / MCP **(E product add-ons)**

Out of scope for finosgrid core parity; noted for awareness only.

### 3.30 Notes **(E)**

| | |
|---|---|
| **UI** | Cell notes via context menu `note` → Add / Edit / View / Remove |
| **Model** | Notes module; context menu integration |

---

## 4. Core GridApi surface (grouped)

> Column API methods live on **GridApi** (ColumnApi deprecated since v31).

| Area | Representative methods |
|---|---|
| **Lifecycle** | `destroy`, `isDestroyed`, `setGridOption`, `getGridOption`, `updateGridOptions` |
| **Columns** | `applyColumnState`, `getColumnState`, `getAllGridColumns`, `getColumns`, `autoSizeAllColumns`, `moveColumn`, `setColumnsVisible`, `setColumnsPinned` |
| **Groups** | `setColumnGroupOpened`, `getColumnGroupState`, `setColumnGroupState`, `resetColumnGroupState` |
| **Rows** | `forEachNode`, `forEachLeafNode`, `getDisplayedRowAtIndex`, `getRowNode`, `setRowNodeExpanded`, `expandAll`, `collapseAll` |
| **Selection** | `getSelectedRows`, `getSelectedNodes`, `setNodesSelected`, `deselectAll` |
| **Filter/Sort** | `setFilterModel`, `getFilterModel`, `onFilterChanged`, sort via column state |
| **Edit** | `startEditingCell`, `stopEditing` |
| **Clipboard** | `copySelectedRangeToClipboard`, … |
| **Export** | `exportDataAsCsv`, `exportDataAsExcel` |
| **Menus** | `showContextMenu`, `showColumnMenu`, `showColumnChooser`, `hidePopupMenu`, `hideColumnChooser` |
| **Overlays** | `showLoadingOverlay`, `showNoRowsOverlay`, `hideOverlay` |
| **Charts** | `createRangeChart`, `createPivotChart`, … |
| **SSRM** | `refreshServerSide`, `getServerSideGroupLevelState`, … |
| **Pagination** | `paginationGoToPage`, … |
| **Tool panels** | `openToolPanel`, `closeToolPanel` |

**Config mutation pattern (v31+):** prefer `api.setGridOption(key, value)` over deprecated `api.setRowData` / many one-off setters.

---

## 5. Context menu — complete built-in inventory **(E)**

**Module:** `ContextMenuModule`  
**Entry:** right-click cell (Ctrl+right-click = browser menu unless `allowContextMenuWithControlKey`)  
**Customize:** `getContextMenuItems` or `colDef.contextMenuItems`  
**Disable:** `suppressContextMenu: true`  
**API:** `showContextMenu`, `hidePopupMenu`  
**Event:** `contextMenuVisibleChanged`

### 5.1 Built-in item IDs (`DefaultMenuItem`)

| ID | Default shown? | When available / behavior |
|---|---|---|
| `copy` | Yes | Copy selection/value to clipboard |
| `copyWithHeaders` | Yes | Copy including column headers |
| `copyWithGroupHeaders` | Yes | Copy including column group headers |
| `paste` | Yes | Paste clipboard into focused editable cell; disabled if `suppressClipboardApi` or non-editable / no Clipboard API |
| `cut` | No | Cut selection to clipboard |
| `export` | Yes | Submenu parent |
| `csvExport` | Yes (under export) | CSV export defaults |
| `excelExport` | Yes (under export) | Excel export (ExcelExportModule) |
| `chartRange` | If charts enabled | Create chart from selected range (`enableCharts` / IntegratedChartsModule) |
| `pivotChart` | If charts + pivot mode | Chart pivoted/grouped data |
| `note` | If Notes enabled | Sub-actions: Add / Edit / View / Remove Note |
| `autoSizeAll` | No | Autosize all columns |
| `expandAll` | No | Expand all groups (only if ≥1 row-group col) |
| `contractAll` | No | Collapse all groups (only if grouping) |
| `resetColumns` | No | Reset column state |
| `pinRowSubMenu` | If row pinning enabled | Submenu container |
| `pinTop` | If row pinning enabled | Pin row to top |
| `pinBottom` | If row pinning enabled | Pin row to bottom |
| `unpinRow` | If row pinning enabled | Unpin pinned row |
| `separator` | (structural) | Visual divider |

### 5.2 Custom items (`MenuItemDef`)

```ts
{
  name: string;
  action?: (params) => void;
  shortcut?: string;
  disabled?: boolean;
  checked?: boolean;      // mutually exclusive with icon
  icon?: string | HTMLElement;
  subMenu?: (DefaultMenuItem | MenuItemDef)[];
  cssClasses?: string[];
  tooltip?: string;
}
```

Async: callback may return `Promise<(DefaultMenuItem|MenuItemDef)[]>`.

### 5.3 Default menu composition (typical Enterprise)

With Clipboard + Excel + Charts modules: **Copy**, **Copy with Headers**, **Copy with Group Headers**, **Paste**, **Export → CSV / Excel**, **Chart Range** (if selection + charts).

---

## 6. Column menu — complete built-in inventory **(E)**

**Module:** `ColumnMenuModule`  
**Entry:** header menu button, or right-click header / header empty space  
**Customize:** `getMainMenuItems` / `colDef.mainMenuItems`  
**Legacy:** `columnMenu: 'legacy'` → tabbed General / Filter / Columns  
**API:** `showColumnMenu`, `showColumnChooser`, `hidePopupMenu`, `hideColumnChooser`, `showColumnFilter`, `hideColumnFilter`  
**Event:** `columnMenuVisibleChanged`

### 6.1 Built-in main-menu item IDs

| ID | Typical visibility rule |
|---|---|
| `sortAscending` | Not legacy; not already asc |
| `sortDescending` | Not legacy; not already desc |
| `sortUnSort` | Not legacy; column currently sorted |
| `columnFilter` | Filter enabled; not legacy; no header/floating filter button taking over |
| `columnChooser` | Not legacy |
| `calculatedColumn` | Calculated columns feature |
| `pinSubMenu` | Always (pin left/right/none) |
| `valueAggSubMenu` | Always (agg func choices when values enabled) |
| `autoSizeThis` | Always |
| `autoSizeAll` | Always |
| `rowGroup` | Column not already row-grouped (appears once grouping active) |
| `rowUnGroup` | Column is row-grouped |
| `resetColumns` | Always |
| `expandAll` | ≥1 row group column |
| `contractAll` | ≥1 row group column |
| `separator` | Structural |

### 6.2 Column chooser params (`colDef.columnChooserParams`)

`suppressSyncLayoutWithGrid`, `suppressColumnFilter`, `suppressColumnSelectAll`, `suppressColumnExpandAll`, `contractColumnSelection`, `columnLayout`.

### 6.3 Header suppress flags

`suppressHeaderMenuButton`, `suppressHeaderFilterButton`, `suppressHeaderContextMenu`.

---

## 7. Event catalog (high-signal)

| Category | Events |
|---|---|
| Ready | `gridReady`, `firstDataRendered`, `gridPreDestroyed` |
| Columns | `columnEverythingChanged`, `newColumnsLoaded`, `columnVisible`, `columnPinned`, `columnResized`, `columnMoved`, `columnGroupOpened`, `displayedColumnsChanged` |
| Sort/Filter | `sortChanged`, `filterChanged`, `filterModified` |
| Rows | `modelUpdated`, `rowDataUpdated`, `rowGroupOpened`, `virtualRowRemoved` |
| Selection | `selectionChanged`, `cellSelectionChanged` |
| Cells | `cellClicked`, `cellDoubleClicked`, `cellFocused`, `cellValueChanged`, `cellEditingStarted/Stopped` |
| Menus | `contextMenuVisibleChanged`, `columnMenuVisibleChanged` |
| Charts | `chartCreated`, `chartRangeSelectionChanged`, … |
| Tool panel | `toolPanelVisibleChanged` |

---

## 8. finosgrid parity snapshot (2026-07-12)

| AG area | finosgrid status |
|---|---|
| Owned header shell + floating filters | Spike / solid |
| Column groups (`ColGroupDef`, sticky labels, marryChildren) | Implemented (shell) |
| Row grouping + agg via Perspective | Implemented (shell + engine) |
| Expand finest group → leaf detail rows | Implemented (hybrid) |
| Sticky group headers + totals (`groupTotalRow`/`grandTotalRow`) | Implemented |
| Sorting / filtering (Perspective view) | Partial |
| Row selection / cell & range selection | Done on `feature/selection` — see catalog §3.6 |
| Pin columns / column state | Partial |
| Context menu / column menu | Partial — header + group + cell context menus on `feature/context-menu` |
| Side bar / tool panels | Not started |
| Master Detail | **Planned** → [plan](../plans/2026-07-12-master-detail-and-tree-data.md) |
| Tree Data | **Planned** → same plan |
| Pivot | Research only |
| Excel export / charts / SSRM | Not started |

---

## 9. Doc index (AG)

Primary hubs:

- [Key Features](https://www.ag-grid.com/javascript-data-grid/key-features/)
- [Community vs Enterprise](https://www.ag-grid.com/javascript-data-grid/community-vs-enterprise/)
- [Grid API](https://www.ag-grid.com/javascript-data-grid/grid-api/)
- [Grid Options](https://www.ag-grid.com/javascript-data-grid/grid-options/)
- [Context Menu](https://www.ag-grid.com/javascript-data-grid/context-menu/)
- [Column Menu](https://www.ag-grid.com/javascript-data-grid/column-menu/)
- [Master Detail](https://www.ag-grid.com/javascript-data-grid/master-detail/)
- [Tree Data](https://www.ag-grid.com/javascript-data-grid/tree-data/)
- [Row Grouping](https://www.ag-grid.com/javascript-data-grid/grouping/)
- [Aggregation](https://www.ag-grid.com/javascript-data-grid/aggregation/)
- [Pivoting](https://www.ag-grid.com/javascript-data-grid/pivoting/)
