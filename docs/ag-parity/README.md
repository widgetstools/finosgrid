# AG Grid ↔ finosgrid parity

Reference app: `apps/ag-grid-reference` (Enterprise **v36**, Quartz).

| Feature | Research | Screenshots | finosgrid status |
|---|---|---|---|
| Quartz theme | [theme-quartz](./theme-quartz/research.md) | pending | partial |
| Floating filters | [floating-filters](./floating-filters/research.md) | pending | broken layout |
| Set filter | [set-filter](./set-filter/research.md) | pending | chrome only |
| Column groups | [column-groups](./column-groups/research.md) | pending | chrome only |
| Conditional formatting | [conditional-formatting](./conditional-formatting/research.md) | pending | partial |
| Columns tool panel | [columns-panel](./columns-panel/research.md) | pending | not started |
| Pivot | [pivot](./pivot/research.md) | pending | chrome only |

## Process

1. Run reference app and enable the feature.
2. Capture screenshots into the feature folder.
3. Fill `research.md` from [AG Grid React docs](https://www.ag-grid.com/react-data-grid/) (v35+).
4. Implement in `packages/datagrid` against the checklist in `research.md`.
5. Compare http://localhost:5181/ vs http://localhost:5180/.
