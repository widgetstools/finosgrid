# AG Grid ↔ finosgrid parity

Reference app: `apps/ag-grid-reference` (Enterprise **v36**, Quartz).

**Architecture (2026-07-12):** [Shell ADR](../superpowers/specs/2026-07-12-finosgrid-shell-architecture-adr.md) — owned header shell + regular-table body; Perspective engine unchanged. Spike plan: [owned header shell](../superpowers/plans/2026-07-12-finosgrid-owned-header-shell-spike.md).

**Complete AG feature catalog (UI · object model · API · menus):** [2026-07-12-ag-grid-complete-feature-catalog](../superpowers/specs/2026-07-12-ag-grid-complete-feature-catalog.md)

**Next builds:** [Master Detail & Tree Data plan](../superpowers/plans/2026-07-12-master-detail-and-tree-data.md)

| Feature | Research | Screenshots | finosgrid status |
|---|---|---|---|
| Quartz theme | [theme-quartz](./theme-quartz/research.md) | shell | done (parameter Theme API) |
| Floating filters | [floating-filters](./floating-filters/research.md) | captured | under headers via shell (target) |
| Set filter | [set-filter](./set-filter/research.md) | pending | chrome only |
| Column groups | [column-groups](./column-groups/research.md) | spike shot | **shell spike pass** |
| Row grouping + sticky totals | [feature catalog §3.11–3.12](../superpowers/specs/2026-07-12-ag-grid-complete-feature-catalog.md) | live demos | **shell pass** |
| Row / cell / range selection | [selection](./selection/research.md) · [catalog §3.6](../superpowers/specs/2026-07-12-ag-grid-complete-feature-catalog.md) | shell | done (feature/selection) |
| Tree data | [tree-data](./tree-data/research.md) | pending | planned |
| Master detail | [master-detail](./master-detail/research.md) | pending | planned |
| Context / column menus | [context-menu](./context-menu/research.md) | shell | partial (header + cell) |
| Status bar | [status-bar](./status-bar/research.md) | shell | done (counts + aggregation + custom) |
| Conditional formatting | [conditional-formatting](./conditional-formatting/research.md) | pending | partial |
| Columns tool panel | [columns-panel](./columns-panel/research.md) | pending | not started |
| Pivot | [pivot](./pivot/research.md) | pending | chrome only |

## Process

1. Run reference app and enable the feature.
2. Capture screenshots into the feature folder.
3. Fill `research.md` from [AG Grid React docs](https://www.ag-grid.com/react-data-grid/) (v35+).
4. Implement against the shell ADR + checklist in `research.md`.
5. Compare http://localhost:5181/ vs http://localhost:5182/.
