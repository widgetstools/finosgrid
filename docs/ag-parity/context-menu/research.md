# Context Menu — parity research

**AG docs:** [Context Menu](https://www.ag-grid.com/javascript-data-grid/context-menu/), [Column Menu](https://www.ag-grid.com/javascript-data-grid/column-menu/)  
**Full inventory:** [Feature catalog §5–§6](../../superpowers/specs/2026-07-12-ag-grid-complete-feature-catalog.md)

## Status

**Partial** on `feature/context-menu` — shell right-click menus for leaf headers, group headers, and body cells.

## Context menu built-ins

| ID | Default | finosgrid |
|---|---|---|
| `copy` | yes | done |
| `copyWithHeaders` | yes | done |
| `copyWithGroupHeaders` | yes | stub id only |
| `paste` | yes | stub |
| `cut` | no | stub |
| `export` / `csvExport` / `excelExport` | yes | not started |
| `chartRange` / `pivotChart` | charts | not started |
| `autoSizeThis` / `autoSizeAll` | — | done (header + cell) |
| `expandAll` / `contractAll` | auto-group header + column group header | done (row groups via `set_depth`; column groups via `setAllOpen`) |
| `expandGroup` / `collapseGroup` | column group header | done (this column group) |
| `pinSubMenu` | — | done |

## Column menu built-ins

| ID | finosgrid |
|---|---|
| `sortAscending` / `sortDescending` / `sortUnSort` | done |
| `pinSubMenu` | done |
| `autoSizeThis` / `autoSizeAll` | done |
| `columnFilter` / `columnChooser` | not started |
| `valueAggSubMenu` / `rowGroup` | not started |

## Customization APIs

- [x] `getContextMenuItems` / `colDef.contextMenuItems`
- [x] `getMainMenuItems` / `colDef.mainMenuItems`
- [x] `MenuItemDef` (+ submenus)
- [x] `showContextMenu` / `showColumnMenu` / `hidePopupMenu`
- [x] `suppressContextMenu` / `suppressHeaderContextMenu`

## Surfaces

| Surface | Trigger |
|---|---|
| Leaf column header | right-click `.fg-shell__leaf-cell` |
| Group column header | right-click `.fg-shell__group-cell` |
| Body cell | right-click `tbody td` |
