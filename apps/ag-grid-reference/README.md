# AG Grid Enterprise reference (v36)

Visual / behavioral **source of truth** for finosgrid parity.

Uses **AG Grid Enterprise 36.0.0** (satisfies project rule: **v35+**).

## Run

```bash
# from repo root
npm install
npm run start -w ag-grid-reference
```

Open http://localhost:5181/

Optional license (removes watermark):

```bash
# apps/ag-grid-reference/.env.local
VITE_AG_GRID_LICENSE=your_key_here
```

## Features enabled (parity targets)

| Feature | AG Grid API / UI |
|---|---|
| Quartz theme | `themeQuartz.withParams` |
| Floating filters | `defaultColDef.floatingFilter` |
| Set filter | `filter: "agSetColumnFilter"` |
| Column groups | `ColDef` `children` |
| Conditional styling | `cellStyle` / `cellClassRules` |
| Columns panel | `sideBar` → `agColumnsToolPanel` |
| Filters panel | `sideBar` → `agFiltersToolPanel` |
| Pivot | `pivotMode` + Values / Row Groups / Pivot in Columns panel |
| Row group / pivot panels | `rowGroupPanelShow` / `pivotPanelShow` |

## Parity docs

Per-feature research + screenshots live under:

`docs/ag-parity/<feature>/`

Workflow: exercise feature here → capture screenshot → research AG Grid 35+ docs → implement in `@widgetstools/finosgrid` → side-by-side compare with finosgrid demo (`:5180`).
