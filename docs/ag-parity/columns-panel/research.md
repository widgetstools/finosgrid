# Columns tool panel (AG Grid Enterprise)

**Reference:** `apps/ag-grid-reference` — side bar default tool panel `columns`  
**Docs:** https://www.ag-grid.com/react-data-grid/tool-panel-columns/  
**Modules:** `ColumnsToolPanelModule` (or `AllEnterpriseModule`)

## Use cases

- Show / hide columns
- Drag columns into Row Groups, Values, Pivot sections
- Toggle pivot mode from the panel
- Expand/collapse column groups in the panel tree

## AG Grid configuration (v35+)

```js
sideBar: {
  toolPanels: [{
    id: "columns",
    labelDefault: "Columns",
    toolPanel: "agColumnsToolPanel",
    toolPanelParams: {
      suppressRowGroups: false,
      suppressValues: false,
      suppressPivots: false,
      suppressPivotMode: false,
    },
  }],
  defaultToolPanel: "columns",
}
```

Also enable on ColDefs: `enableRowGroup`, `enablePivot`, `enableValue`.

## Screenshots

- `screenshot-default.png` — panel open with column list
- `screenshot-row-groups.png` — columns dragged to Row Groups
- `screenshot-pivot.png` — pivot mode with Values

## finosgrid parity checklist

- [ ] Side chrome panel (not Perspective settings drawer clone necessarily)
- [ ] Column visibility toggles
- [ ] Row group / value / pivot drop zones wired to `viewer.restore({ group_by, split_by, aggregates, columns })`
- [ ] Visual match to Quartz Columns panel density/icons (screenshot-driven)
