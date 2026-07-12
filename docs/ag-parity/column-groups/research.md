# Column groups

**Docs:** https://www.ag-grid.com/react-data-grid/column-groups/  
**Architecture:** [Shell ADR](../../superpowers/specs/2026-07-12-finosgrid-shell-architecture-adr.md)  
**Spike:** [Owned header shell plan](../../superpowers/plans/2026-07-12-finosgrid-owned-header-shell-spike.md)

## AG model we need

```js
{
  headerName: "Geography",
  children: [
    { field: "region" }, // always
    { field: "city", columnGroupShow: "open" },
    { field: "regionCode", columnGroupShow: "closed" },
  ],
}
```

- Nested `children` (groups within groups)
- Collapsible groups
- Leaf visibility: `always` | `open` | `closed` (AG `columnGroupShow`)
- Per group / leaf `headerStyle` (font, colors, per-side borders)

## Screenshots

- `screenshot-groups.png` — AG reference (pending)
- `screenshot-shell-spike.png` — finosgrid shell spike (pending)

## finosgrid parity checklist

- [ ] Owned header stack (not regular-table `column_headers`)
- [ ] Group headers above leaf headers; floating filters **below** leaves
- [ ] Nested collapsible groups
- [ ] `always` / `open` / `closed` leaf visibility
- [ ] Spans / widths sync with body; horizontal scroll synced
- [ ] Header + group styling API (font, fg/bg, per-side borders)
