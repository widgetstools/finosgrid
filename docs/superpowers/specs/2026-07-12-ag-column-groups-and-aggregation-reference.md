# AG Grid Column Groups & Aggregation — Reference for finosgrid

**Date:** 2026-07-12  
**Status:** Living reference (sourced from AG Grid JavaScript Data Grid docs, current as of AG Grid ~35/36)  
**Audience:** finosgrid shell + Perspective engine implementers  
**Primary sources:**
- [Column Groups](https://www.ag-grid.com/javascript-data-grid/column-groups/)
- [Column State (group open/closed)](https://www.ag-grid.com/javascript-data-grid/column-state/)
- [Aggregation](https://www.ag-grid.com/javascript-data-grid/aggregation/)
- [Aggregation — Configure Columns](https://www.ag-grid.com/javascript-data-grid/aggregation-columns/)
- [Aggregation — Custom Functions](https://www.ag-grid.com/javascript-data-grid/aggregation-custom-functions/)
- [Aggregation — Total Rows](https://www.ag-grid.com/javascript-data-grid/aggregation-total-rows/)
- [Aggregation — Filtering](https://www.ag-grid.com/javascript-data-grid/aggregation-filtering/)
- [Aggregation — Show Values As](https://www.ag-grid.com/javascript-data-grid/aggregation-show-values-as/)
- [Row Grouping](https://www.ag-grid.com/javascript-data-grid/grouping/)
- Related ADR: [finosgrid shell architecture](./2026-07-12-finosgrid-shell-architecture-adr.md)

---

## 0. Two different “grouping” concepts (do not conflate)

| Concept | What it groups | UI surface | AG module / license | finosgrid owner |
|---|---|---|---|---|
| **Column Groups** (`ColGroupDef`) | **Header columns** into nested band headers | Multi-row header stack; expand/collapse child columns | **Community** | **Shell** (DOM + open state) |
| **Row Grouping** (`rowGroup: true`) | **Data rows** by field values into parent group rows | Group rows / auto-group column / row group panel | **Enterprise** (`RowGroupingModule`) | **Perspective** `group_by` + shell chrome |
| **Aggregation** (`aggFunc`) | **Numeric (or custom) measures** over children of a row group / pivot / tree | Values on group rows, total rows, pivot cells | **Enterprise** (with row grouping / pivot / tree) | **Perspective** `aggregates` (+ shell for totals UX) |

**Column Groups ≠ Aggregation.** Expanding a header group hides/shows leaf columns; it does **not** compute sums. Aggregation only makes sense once rows are grouped (or pivoted / tree-structured).

Perspective mapping reminder:

| AG concept | Perspective View config |
|---|---|
| Column header groups | *No engine equivalent* — shell-only |
| `rowGroup` fields | `group_by: [...]` |
| `aggFunc` on value cols | `aggregates: { col: "sum" \| ... }` |
| Pivot columns | `split_by: [...]` |

---

## 1. Column Groups (header hierarchy)

### 1.1 Definition model

A column definition is a **group** when it has a `children` array. AG types:

```ts
type ColDef | ColGroupDef

interface ColGroupDef {
  headerName?: string;
  groupId?: string;
  children: (ColDef | ColGroupDef)[];
  openByDefault?: boolean;          // default false
  marryChildren?: boolean;
  suppressStickyLabel?: boolean;
  headerClass?: string | string[] | ((params) => string | string[] | undefined);
  headerStyle?: { [cssProp: string]: string | number };
  headerTooltip?: string;
  headerGroupComponent?: any;
  headerGroupComponentParams?: any;
  // …plus AbstractColDef shared fields
}

interface ColDef {
  field?: string;
  colId?: string;
  columnGroupShow?: 'open' | 'closed'; // omit ⇒ always visible under parent
  // …leaf options
}
```

**Rules:**
- Nested groups are unlimited depth (`children` may contain further `ColGroupDef`s).
- `groupId` uniquely identifies a group for API / state. If omitted, AG (and finosgrid) synthesizes one.
- `defaultColGroupDef` supplies defaults for **group** nodes only; `defaultColDef` for **leaf** nodes only. Nested children recursively apply the same defaults.

### 1.2 Expand / collapse policy (`columnGroupShow`)

Set on **children** (leaf or nested group), relative to the **immediate parent** open state:

| `columnGroupShow` | Visible when parent is… |
|---|---|
| `'open'` | Open only |
| `'closed'` | Closed only |
| omitted / `null` / `undefined` | **Always** (both states) |

Classic medal pattern:

```js
{
  headerName: "Sports Results",
  children: [
    { columnGroupShow: "closed", field: "total" },
    { columnGroupShow: "open", field: "gold" },
    { columnGroupShow: "open", field: "silver" },
    { columnGroupShow: "open", field: "bronze" },
  ],
}
```

**Expandability:** A group only shows open/close UI if:
1. At least one child uses `'open'` or `'closed'`, and
2. The group would still have ≥1 visible child in **both** open and closed states (otherwise expand would empty the group).

Custom header group components should call `columnGroup.isExpandable()` before rendering expand icons.

`openByDefault` (default **`false`**) seeds initial open state before any API/state restore.

### 1.3 Sticky group labels

By default, when a column group is wider than the viewport, the **group header label stays visible** while scrolling horizontally (“sticky label”).

- Disable per group: `suppressStickyLabel: true`.

### 1.4 `marryChildren` (keep group contiguous)

When `marryChildren: true`:
- Users **cannot** drag a child column **out** of the group.
- Users **cannot** drop an external column **into the middle** of the group (which would split it).
- Columns **can** still be reordered **inside** the group.
- Ungrouped columns can sit **between** married groups.

Without `marryChildren`, column moving (or pinning) that separates siblings **splits** the visual group into multiple header bands.

### 1.5 Groups & column pinning

Pinned columns **break groups** across pin regions:
- If 4 of 10 group children are pinned left, AG renders **two** group header instances: one spanning the 4 pinned leaves, one spanning the 6 center leaves (same `groupId` / label semantics, split layout).

finosgrid implication: with left/center/right body panes, the header stack must **partition** each group’s visible leaves by pin and emit separate group cells per region (or a continuous sticky label strategy that respects pin gutters).

### 1.6 Groups & column moving

Moving leaves so they are no longer adjacent **breaks** the group into multiple displayed groups (unless `marryChildren` prevents the move).

### 1.7 Styling & chrome

| Feature | Mechanism |
|---|---|
| Group header CSS class | `headerClass` on `ColGroupDef` (string / array / function with walk-up via `getParent()`) |
| Inline style | `headerStyle` |
| Defaults | `defaultColGroupDef` |
| Tooltip | `headerTooltip` on group; overflow tooltips when text clipped |
| Icons | `gridOptions.icons.columnGroupOpened` / `columnGroupClosed` |
| Full custom header | `headerGroupComponent` (+ params) |
| Label-only custom | `headerGroupComponentParams.innerHeaderGroupComponent` |

### 1.8 Column Group API & state

| API | Behavior |
|---|---|
| `api.setColumnGroupOpened(groupId \| ColumnGroup, opened)` | Open/close one group |
| `api.getColumnGroupState()` | `[{ groupId, open }, …]` |
| `api.setColumnGroupState(stateItems)` | Restore open/closed |
| `api.resetColumnGroupState()` | Revert to defs’ `openByDefault` (typically all closed) |

Also participates in broader **Grid State** persistence (`columnGroup` slice).

Events (AG): `columnGroupOpened`, and column-related events when visibility of leaves changes.

### 1.9 Columns Tool Panel / Side Bar (Enterprise UX)

Users can drag columns into/out of groups visually; not required for Community column groups, but part of “full AG” Columns tool panel UX. Out of scope for shell MVP unless we add a tool panel phase.

### 1.10 Completeness checklist — Column Groups

| # | Feature | AG | finosgrid shell today | Target |
|---|---|---|---|---|
| CG1 | Nested `ColGroupDef` / `children` | ✓ | ✓ | Keep |
| CG2 | `columnGroupShow` open/closed/always | ✓ | ✓ | Keep |
| CG3 | `openByDefault` default false | ✓ | ✓ | Keep |
| CG4 | Auto `groupId` assignment | ✓ | ✓ | Keep |
| CG5 | `defaultColGroupDef` / `defaultColDef` | ✓ | ✓ | Keep |
| CG6 | Expand UI only when expandable | ✓ | ✓ `isGroupExpandable` | Keep |
| CG7 | `set/get/resetColumnGroupState` | ✓ | ✓ | Keep |
| CG8 | `setColumnGroupOpened` | ✓ | ✓ | Keep |
| CG9 | `marryChildren` move constraints | ✓ | ✓ | Keep |
| CG10 | Sticky group labels | ✓ | ✓ | Keep |
| CG11 | `suppressStickyLabel` | ✓ | ✓ | Keep |
| CG12 | Pinning splits groups across panes | ✓ | ✓ (pin break in header layout) | Keep |
| CG13 | Moving breaks / reunites groups | ✓ | ✓ via ordered-leaf regroup | Keep |
| CG14 | `headerClass` / `headerStyle` on groups | ✓ | ✓ | Keep |
| CG15 | `headerTooltip` | ✓ | ✓ | Keep |
| CG16 | Custom `headerGroupComponent` | ✓ | Typed no-op | Later phase |
| CG17 | `innerHeaderGroupComponent` | ✓ | — | Later phase |
| CG18 | Custom open/closed icons | ✓ | Lucide fixed | `icons` option |
| CG19 | `columnGroupOpened` event | ✓ | ✓ (`groupId`/`opened`) | Keep |
| CG20 | Columns tool panel group edit | Enterprise | — | Later |

---

## 2. Aggregation (value aggregation over row groups)

### 2.1 When aggregation applies

Aggregation computes a value for a **group row** (and optionally total rows) from that group’s child leaf rows. It requires one of:
- **Row Grouping** (`rowGroup: true` on dimension columns), or
- **Tree Data**, or
- **Pivoting** (values aggregated into pivot cells).

Setting `aggFunc` on a flat grid with no grouping has little/no effect until grouping/pivot is active (except some SSRM / grand-total-on-flat cases noted in total-row docs).

### 2.2 Enabling aggregation on columns

```js
columnDefs: [
  { field: "country", rowGroup: true, hide: true },
  { field: "gold", aggFunc: "sum" },
  { field: "silver", aggFunc: "avg" },
]
```

**Built-in `aggFunc` strings:**

| Name | Meaning |
|---|---|
| `sum` | Sum of numeric values |
| `min` / `max` | Extremum |
| `count` | Count of values |
| `avg` | Average |
| `first` / `last` | First / last in group order |

**Column UX helpers (Enterprise / tool panel):**
- `enableValue: true` — column can be dragged to “Values” in Columns tool panel.
- `defaultAggFunc` — agg applied when user adds column as a value (e.g. `'avg'`).
- `allowedAggFuncs: ['sum','avg',…]` — restrict choosable functions.

### 2.3 Custom aggregation functions

Register via `gridOptions.aggFuncs`:

```js
aggFuncs: {
  custom_Mode: (params) => {
    // params.values — child values (may include nested agg results)
    // return aggregated scalar
  },
}
```

Use as `aggFunc: 'custom_Mode'`.

Advanced (editing inverted agg): `groupRowValueSetter.distribution` can supply inverse logic for custom aggs when editing group totals.

### 2.4 Total rows

| Option | Values | Effect |
|---|---|---|
| `grandTotalRow` | `'top'` \| `'bottom'` \| `'pinnedTop'` \| `'pinnedBottom'` | Grid-wide totals |
| `groupTotalRow` | `'top'` \| `'bottom'` \| `(params) => …` | Per-group subtotals; callback may return `undefined` to skip |
| `groupSuppressBlankHeader` | boolean | Keep group header values visible when total row shown |
| `suppressStickyTotalRow` | `true` \| `'grand'` \| `'group'` | Disable sticky total rows |
| `autoGroupColumnDef.cellRendererParams.totalValueGetter` | fn | Label text in group column for total rows (“Grand Total”, “Sub Total (…)”) |

Grand totals also work with SSRM on **flat** grids (no grouping) in current AG docs.

### 2.5 Aggregation & filtering

AG documents interaction modes for whether filters apply before/after aggregation and how aggregated values participate in filtering (see [Aggregation Filtering](https://www.ag-grid.com/javascript-data-grid/aggregation-filtering/)). Perspective has its own filter-then-aggregate pipeline via View `filter` + `group_by` + `aggregates` — map carefully; do not assume AG’s filter-agg order without an explicit finosgrid policy.

### 2.6 Show Values As (ratios / % of total)

Enterprise “Show Values As” transforms displayed aggregated values (e.g. % of grand total, % of row, etc.) without changing the underlying agg. Perspective can approximate some of these with expressions; full AG parity is a dedicated phase.

### 2.7 Aggregation API (representative)

| API / option | Role |
|---|---|
| `colDef.aggFunc` | Active aggregation |
| `api.setColumnAggFunc(col, aggFunc)` | Change agg at runtime |
| `aggFuncs` | Custom registry |
| `grandTotalRow` / `groupTotalRow` | Total row placement |
| Side bar Values drop zone | Interactive enablement |

### 2.8 Completeness checklist — Aggregation (+ row group prerequisites)

| # | Feature | AG | Perspective | finosgrid today | Target phase |
|---|---|---|---|---|---|
| AG1 | Built-in sum/min/max/count/avg/first/last | ✓ | `aggregates` map (sum, mean, count, min, max, last, …) | ✓ engine bridge | Keep |
| AG2 | Custom `aggFuncs` | ✓ | Limited (expressions / custom) | — | Later |
| AG3 | `enableValue` / `allowedAggFuncs` / `defaultAggFunc` | ✓ | N/A (UX) | Typed only | Tool panel |
| AG4 | Row grouping dimensions | ✓ | `group_by` | ✓ + auto-group col / expand | Keep |
| AG5 | Pivot + agg | ✓ | `split_by` + `aggregates` | — | Pivot phase |
| AG6 | `grandTotalRow` | ✓ | Perspective TOTAL row in tree | Implicit via `__ROW_PATH__` | Polish |
| AG7 | `groupTotalRow` | ✓ | Harder (per-group footers) | — | Totals phase |
| AG4b | Expand finest group → **original leaf rows** | ✓ | Hybrid: filtered `table.view` (no group_by) | ✓ `enableDetailLeaves` | Keep |
| AG8 | Show Values As | ✓ | Expressions approx. | — | Later |
| AG9 | Agg filtering semantics | ✓ | View filter order | — | Policy doc + bridge |
| AG10 | Edit group aggregates | ✓ | — | — | Out of scope MVP |

---

## 3. Row Grouping (aggregation prerequisite) — short catalog

Needed so aggregation has something to aggregate over. Key AG options:

| Option | Purpose |
|---|---|
| `colDef.rowGroup` / `rowGroupIndex` | Dimension columns |
| `groupDisplayType` | `'singleColumn'` \| `'multipleColumns'` \| `'groupRows'` \| `'custom'` |
| `autoGroupColumnDef` | Auto group column config |
| `groupDefaultExpanded` / `isGroupOpenByDefault` | Expansion |
| `rowGroupPanelShow` | Drag-to-group panel |
| `groupHideOpenParents`, `groupHideParentOfSingleChild`, … | Display polish |
| `suppressGroupRowsSticky` | Sticky group rows |

Perspective: `group_by` produces a flat aggregated table (or tree via `group_by` + depth), not AG’s nested Client-Side Row Model nodes. Shell must **present** Perspective’s grouped viewport in an AG-like row hierarchy (or intentionally adopt Perspective’s flatter grouped table UX and document the delta).

---

## 4. Architecture mapping (finosgrid)

```
┌─────────────────────────────────────────────────────────────┐
│ Shell (AG object model)                                     │
│  • ColGroupDef tree, open state, sticky labels, marryChildren│
│  • Header stack render (groups → leaves → floating filters) │
│  • Future: row group chrome, total row chrome, tool panels  │
└───────────────────────────┬─────────────────────────────────┘
                            │ visible leaf fields + pin regions
┌───────────────────────────▼─────────────────────────────────┐
│ Engine bridge                                               │
│  • columns / sort / filter → table.view(...)                │
│  • Future: group_by, aggregates, split_by from ColDefs      │
└───────────────────────────┬─────────────────────────────────┘
                            │ viewport to_columns
┌───────────────────────────▼─────────────────────────────────┐
│ Body (regular-table panes)                                  │
│  • Paint cells only; no product group headers               │
└─────────────────────────────────────────────────────────────┘
```

**Implementation order (locked by this reference):**

1. **Column Groups completeness (shell-only)** — CG6–CG15, CG18–CG19  
2. **Engine bridge: `group_by` + `aggregates` from ColDefs** — AG1, AG4  
3. **Row group presentation + expand** — §3  
4. **Total rows** — AG6–AG7  
5. **Tool panel / Show Values As / custom agg** — remainder  

---

## 5. Normative examples (AG-faithful)

### 5.1 Nested column groups + open policy

```js
const columnDefs = [
  {
    headerName: "Name & Country",
    children: [{ field: "athlete" }, { field: "country" }],
  },
  {
    headerName: "Sports Results",
    groupId: "results",
    openByDefault: false,
    marryChildren: true,
    children: [
      { columnGroupShow: "closed", field: "total" },
      { columnGroupShow: "open", field: "gold" },
      { columnGroupShow: "open", field: "silver" },
      { columnGroupShow: "open", field: "bronze" },
    ],
  },
];
```

### 5.2 Aggregation with totals

```js
const gridOptions = {
  columnDefs: [
    { field: "country", rowGroup: true, hide: true },
    { field: "year", rowGroup: true, hide: true },
    { field: "gold", aggFunc: "sum" },
    { field: "silver", aggFunc: "sum" },
    { field: "bronze", aggFunc: "sum" },
  ],
  groupDefaultExpanded: 1,
  groupTotalRow: "bottom",
  grandTotalRow: "bottom",
};
```

### 5.3 Custom aggFunc

```js
aggFuncs: {
  custom_Mode: (params) => {
    const counts = new Map();
    let mode = null, maxCount = 0;
    for (const value of params.values) {
      if (value == null) continue;
      const count = (counts.get(value) ?? 0) + 1;
      counts.set(value, count);
      if (count > maxCount) { maxCount = count; mode = value; }
    }
    return mode;
  },
},
columnDefs: [
  { field: "country", rowGroup: true, hide: true },
  { field: "gold", aggFunc: "custom_Mode" },
],
```

---

## 6. finosgrid acceptance criteria (Column Groups phase)

Ship Column Groups “AG-complete” for Community header behavior when:

1. Nested groups + `columnGroupShow` + state API match §1 (already largely true).  
2. `isExpandable` gating matches AG (no chevron when expand would empty or no open/closed children).  
3. Sticky labels work on wide groups; `suppressStickyLabel` disables.  
4. `marryChildren` blocks out-of-group and into-middle moves.  
5. Pinned leaves split group headers across left/center/right panes correctly.  
6. `headerClass` / `headerStyle` / `headerTooltip` apply to group cells.  
7. `columnGroupOpened` fires with AG-shaped event payload.  
8. Spike demo exercises nested + medals pattern + pin-split + married move.

Aggregation is **out of** this phase’s acceptance except documenting the bridge contract in §4.

---

## 7. Doc maintenance

Re-verify against https://www.ag-grid.com/javascript-data-grid/column-groups/ and `/aggregation/` when bumping the declared AG object-model target version in the shell ADR.
