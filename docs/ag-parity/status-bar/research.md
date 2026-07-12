# Status Bar — parity research

**AG docs:** [Status Bar](https://www.ag-grid.com/javascript-data-grid/status-bar/)  
**Design:** [2026-07-12-status-bar-design.md](../../superpowers/specs/2026-07-12-status-bar-design.md)  
**Catalog:** §3.20

## Status

**Implemented** on `feature/status-bar`.

## Provided panels

| ID | finosgrid |
|---|---|
| `agTotalRowCountComponent` | done (`table.size()` / rowData) |
| `agFilteredRowCountComponent` | done (hidden when unfiltered) |
| `agTotalAndFilteredRowCountComponent` | done |
| `agSelectedRowCountComponent` | done (hidden at 0) |
| `agAggregationComponent` | done (count/sum/min/max/avg over cell ranges) |

## Configuration

- [x] `statusBar.statusPanels[]` with `align`, `key`, `statusPanelParams`
- [x] `aggFuncs` on aggregation panel
- [x] `valueFormatter` on provided panels
- [x] Custom `IStatusPanelComp` (class / instance with `getGui`)
- [x] `api.getStatusPanel(key)`
- [x] `api.getDisplayedRowCount()`
- [x] Theme via `--fg-chrome-bg` / status bar LESS

## Notes

Aggregation samples numeric cells in selected ranges via `body.collectNumericRangeValues` (client columns or batched Perspective/detail fetch).
