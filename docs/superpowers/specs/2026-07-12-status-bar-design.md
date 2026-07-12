# Status Bar — Design (AG Grid parity)

**Branch:** `feature/status-bar`  
**AG docs:** [Status Bar](https://www.ag-grid.com/javascript-data-grid/status-bar/)  
**Catalog:** §3.20

## Goal

Ship AG-compatible bottom status bar with all provided panels, aggregation over cell selection, custom panels, `getStatusPanel`, and value formatters.

## API surface

```ts
statusBar?: {
  statusPanels: Array<{
    statusPanel: string | StatusPanelCompCtor;
    align?: "left" | "center" | "right";
    key?: string;
    statusPanelParams?: Record<string, any>;
  }>;
};

api.getStatusPanel(key: string): any;
api.getDisplayedRowCount(): number;
```

### Provided panel ids

| id | Behavior |
|---|---|
| `agTotalRowCountComponent` | Total rows (table / rowData size) |
| `agFilteredRowCountComponent` | Displayed rows after filter/group virtual map |
| `agTotalAndFilteredRowCountComponent` | “X of Y” when filtered ≠ total |
| `agSelectedRowCountComponent` | Selected row count (hidden at 0) |
| `agAggregationComponent` | count/sum/min/max/avg over numeric cells in ranges |

### Custom panels

`IStatusPanelComp`: `getGui()`, optional `init`, `refresh`, `destroy`.

## Layout

`.fg-shell` → header + body + `.fg-shell__status-bar` (`flex: 0 0 auto`). Three align sections: left / center / right.

## Data sources

- **Total:** Perspective `table.size()` when available, else `rowData.length` (dataset size — not collapsed group rows). Refreshed on table `on_update`.
- **Displayed:** body virtual row count (groups + visible detail leaves). Used for the filtered panel when column filters are active.
- **Selected:** `rowSelection.getSelectedNodes().length`
- **Aggregation:** cell ranges × numeric values from visible window / row nodes

## Updates

Refresh on: displayed row count, selection, cell selection, filter, model refresh, table data updates (`table.size()`).

`agTotalAndFilteredRowCountComponent` shows `Rows: {total}` when unfiltered, and `Rows: {displayed} of {total}` only when a column filter is active — collapsed grouping alone does not switch to the “of” form.
