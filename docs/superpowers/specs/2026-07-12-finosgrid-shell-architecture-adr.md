# ADR: finosgrid owned header shell + regular-table body

**Date:** 2026-07-12  
**Status:** Accepted  
**Deciders:** finosgrid maintainers  
**Supersedes (partially):** Phase 1–3 “chrome overlay on Perspective datagrid thead” for header-region features  
**Related:** [Phase 1 design](./2026-07-12-perspective-ag-chrome-phase1-design.md), [regular-table](https://github.com/finos/regular-table)

## Context

We want AG Grid–like UX on top of FINOS Perspective’s efficient viewport path:

`dataListener → columns → format_cell → regular-table`

Retrofitting floating filters, nested column groups, and tool panels as overlays around Perspective’s plugin + regular-table `<thead>` is impractical because:

- regular-table **owns** `<thead>` / sticky headers inside the scrollport
- AG Grid’s header stack order is **groups → leaf headers → floating filters → body**
- Product requires **collapsible nested column groups** with leaf visibility modes that regular-table’s static `column_headers` merge does not support

## Decision

Split finosgrid into three layers:

| Layer | Responsibility | Technology |
|---|---|---|
| **Engine** | Filter, sort, group, pivot, expressions | `@finos/perspective` View + `viewer.restore` |
| **Body viewport** | Virtualized cell paint only | `<regular-table>` / HTML `<table>`, **no** product column headers |
| **Shell** | Column groups, leaf headers, floating filters, tool panels, header styling | First-class finosgrid DOM we own (header region may use `<table>` or div rows; body stays table) |

### Locked choices

1. **Body paint surface:** HTML `<table>` via regular-table virtualization (keep Perspective as `dataListener`).
2. **Do not use** regular-table `column_headers` for product chrome (group tree, floating filters, open/closed columns). RT may receive empty/minimal headers; shell owns the visible header stack.
3. **Column groups:** nested, collapsible; leaf columns declare visibility relative to ancestor expand state.
4. **Header styling:** per leaf header and per group header, including font, colors, and **per-side** borders.

### Non-negotiables (unchanged)

- Do **not** reimplement Perspective compute (filter/pivot/expr) in JS.
- Do **not** put chrome work on the cell paint hot path.
- Filter / pivot / expressions continue through `viewer.restore`.
- Expand/collapse of column groups changes the **visible leaf column set** fed to the viewport (column window), not CSS-only hide of painted cells.

## Column group model

```ts
type ColumnGroupShow = "always" | "open" | "closed";

type HeaderBorderSide = {
  width?: number | string;   // e.g. 1, "2px"
  color?: string;
  style?: "none" | "solid" | "dashed" | "dotted" | "double";
  visible?: boolean;         // false ⇒ no border on that side
};

type HeaderStyle = {
  fontFamily?: string;
  fontSize?: string | number;
  fontWeight?: string | number;
  fontStyle?: "normal" | "italic" | "oblique";
  color?: string;            // foreground
  backgroundColor?: string;
  border?: {
    top?: HeaderBorderSide;
    right?: HeaderBorderSide;
    bottom?: HeaderBorderSide;
    left?: HeaderBorderSide;
  };
};

type ColDef = {
  field: string;
  headerName?: string;
  /** Visibility vs owning group expand state (AG `columnGroupShow`). */
  columnGroupShow?: ColumnGroupShow; // default "always"
  headerStyle?: HeaderStyle;
  // … filters, width, etc.
};

type ColGroupDef = {
  groupId?: string;
  headerName: string;
  /** Default true. Persisted in chrome save/restore. */
  openByDefault?: boolean;
  headerStyle?: HeaderStyle;
  children: Array<ColDef | ColGroupDef>;
};
```

### Visibility algorithm

A leaf is **visible** iff for every ancestor group `G`:

- if leaf’s rule relative to `G` is `always` → ok
- if `open` → `G` must be expanded
- if `closed` → `G` must be collapsed

Nested groups: evaluate from root to leaf; collapsing a parent hides open-only descendants regardless of child group state (child open state is preserved for when the parent re-opens).

Visible leaves (in tree order) become the column set for:

1. Shell leaf header row + floating filter row  
2. Perspective / regular-table column window (`columns` / listener `x0..x1` mapping)

## Shell layout (target)

```text
┌─ finosgrid shell ─────────────────────────────────────┐
│  toolbar / side panels (future)                       │
│  ┌─ header stack (owned) ───────────────────────────┐ │
│  │  nested group header rows (collapsible)          │ │
│  │  leaf column headers                             │ │
│  │  floating filters                                │ │
│  └──────────────────────────────────────────────────┘ │
│  ┌─ body viewport ──────────────────────────────────┐ │
│  │  <regular-table>  (tbody / row headers only)     │ │
│  └──────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────┘
```

Horizontal scroll: shell header tracks sync to body `scrollLeft` (same as today’s band track). Vertical: body scrolls; header stack stays fixed above the viewport.

## Styling requirements

Users must style **leaf headers** and **group headers** independently:

- Font: family, size, weight, style  
- Foreground and background color  
- Borders: each of top / right / bottom / left → thickness, color, style, visibility  

Styles apply to shell header cells. Theme tokens (Quartz) remain defaults when `headerStyle` is omitted.

## Consequences

### Positive

- Correct AG header order (filters under headers).
- Real collapsible nested groups with open/closed leaf columns.
- Styling API not constrained by RT thead paint.
- Keeps Perspective + regular-table performance for body cells.

### Negative / costs

- Own header virtualization horizontally (width sync, scroll sync).
- Must map expand/collapse → visible column set → Perspective columns carefully (avoid full redraw storms; debounce where needed).
- Phase 1–3 overlay chrome for floating filters / simple group band becomes a **migration target**, not the end state.

### Follow-ups

- Spike: body-only RT + owned header stack (see plan).  
- Migrate floating filters under leaf headers.  
- Implement nested collapsible groups + style API.  
- Columns tool panel operates on the same `ColDef` / `ColGroupDef` tree.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Keep overlay chrome on Perspective plugin thead | Cannot place floating filters under headers cleanly; fights absolute RT layout |
| Use only RT `column_headers` for groups | No collapse state; no open/closed leaf visibility |
| Full div virtualizer for body on day one | Rewrites proven viewport paint; defer unless body-only RT spike fails |
| AG Grid as renderer | Abandons Perspective viewport path; license/product mismatch |

## References

- https://github.com/finos/regular-table  
- https://www.ag-grid.com/react-data-grid/column-groups/  
- https://www.ag-grid.com/react-data-grid/column-properties/#reference-groups-columnGroupShow  
