# Context Menu — parity research

**AG docs:** [Context Menu](https://www.ag-grid.com/javascript-data-grid/context-menu/), [Column Menu](https://www.ag-grid.com/javascript-data-grid/column-menu/)  
**Full inventory:** [Feature catalog §5–§6](../../superpowers/specs/2026-07-12-ag-grid-complete-feature-catalog.md)

## Context menu built-ins

| ID | Default | finosgrid |
|---|---|---|
| `copy` | yes | not started |
| `copyWithHeaders` | yes | not started |
| `copyWithGroupHeaders` | yes | not started |
| `paste` | yes | not started |
| `cut` | no | not started |
| `export` / `csvExport` / `excelExport` | yes | not started |
| `chartRange` / `pivotChart` | charts | not started |
| `note` | notes module | not started |
| `autoSizeAll` | no | not started |
| `expandAll` / `contractAll` | no (if grouping) | not started |
| `resetColumns` | no | not started |
| `pinRowSubMenu` / `pinTop` / `pinBottom` / `unpinRow` | row pinning | not started |

## Column menu built-ins

| ID | finosgrid |
|---|---|
| `sortAscending` / `sortDescending` / `sortUnSort` | not started |
| `columnFilter` / `columnChooser` | not started |
| `pinSubMenu` / `valueAggSubMenu` | not started |
| `autoSizeThis` / `autoSizeAll` | not started |
| `rowGroup` / `rowUnGroup` | not started |
| `expandAll` / `contractAll` / `resetColumns` | not started |

## Customization APIs

- `getContextMenuItems` / `colDef.contextMenuItems`
- `getMainMenuItems` / `colDef.mainMenuItems`
- `MenuItemDef` (+ async Promise menus)
- `showContextMenu` / `showColumnMenu` / `hidePopupMenu`
