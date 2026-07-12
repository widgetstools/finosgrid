# Selection (Row + Cell/Range) — parity research

**AG docs:**
- [Row Selection](https://www.ag-grid.com/javascript-data-grid/row-selection/)
- [Row Selection API](https://www.ag-grid.com/javascript-data-grid/row-selection-api-reference/)
- [Cell Selection](https://www.ag-grid.com/javascript-data-grid/cell-selection/)

**Full write-up:** [Feature catalog §3.6](../../superpowers/specs/2026-07-12-ag-grid-complete-feature-catalog.md)

**Status:** Implemented on `feature/selection` (shell controllers + body UI + GridApi).

## Row selection checklist

| Item | AG | finosgrid |
|---|---|---|
| `rowSelection.mode: 'singleRow' \| 'multiRow'` | ✓ | done |
| Checkboxes + `checkboxLocation` | ✓ | done (selectionColumn + autoGroupColumn) |
| `headerCheckbox` / `selectAll` | ✓ | done (header select-all; selectAll modes: all) |
| `enableClickSelection` | ✓ | done |
| `isRowSelectable` / `hideDisabledCheckboxes` | ✓ | done |
| `groupSelects` (self / descendants) | ✓ | done (controller; needs group nodes with children) |
| `getSelectedRows` / `getSelectedNodes` / `setNodesSelected` | ✓ | done |
| `rowSelected` / `selectionChanged` | ✓ | done |
| `copySelectedRows` | ✓ | option stored; clipboard integration deferred |

## Cell / range selection checklist

| Item | AG | finosgrid |
|---|---|---|
| `cellSelection: true` (Enterprise) | ✓ | done |
| Mouse/keyboard range gestures | ✓ | done (drag + Shift-extend; Delete/Ctrl+A/Ctrl+D hooks) |
| `suppressMultiRanges` | ✓ | done |
| `enableColumnSelection` | ✓ | done (controller API) |
| `enableHeaderHighlight` | ✓ | option + paint hook (CSS class ready) |
| Fill handle / range handle | ✓ | done (visual + drag extend) |
| Ctrl+D / bulk edit / Delete clear | ✓ | events (`cellSelectionDelete*`); host clears data |
| `getCellRanges` / clipboard from range | ✓ | getCellRanges/add/clear done; clipboard deferred |
| `cellSelectionChanged` | ✓ | done |

## Legacy → modern

| Legacy | Modern (v32+) |
|---|---|
| `rowSelection: 'single' \| 'multiple'` | `rowSelection: { mode: 'singleRow' \| 'multiRow' }` |
| `enableRangeSelection: true` | `cellSelection: true` |
| `rangeSelectionChanged` | `cellSelectionChanged` |

## Shell modules

- `selection_options.js` — normalize + `SELECTION_COL_ID`
- `row_selection.js` — `createRowSelectionController`
- `cell_selection.js` — `createCellSelectionController`
- Wired in `create_grid.js` + `body_viewport.js` + header select-all
