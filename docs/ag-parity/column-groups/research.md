# Column groups

**Docs:** https://www.ag-grid.com/react-data-grid/column-groups/  
**Architecture:** [Shell ADR](../../superpowers/specs/2026-07-12-finosgrid-shell-architecture-adr.md)  
**Spike:** [Owned header shell plan](../../superpowers/plans/2026-07-12-finosgrid-owned-header-shell-spike.md)  
**Demo:** `npm run demo:shell` → http://localhost:5182/

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

- `screenshot-shell-spike.png` — owned header shell (groups → leaves → filters → body)

## finosgrid parity checklist

- [x] Owned header stack (not regular-table `column_headers`)
- [x] Group headers above leaf headers; floating filters **below** leaves
- [x] Nested collapsible groups
- [x] `always` / `open` / `closed` leaf visibility
- [x] Spans / widths sync with body; horizontal scroll synced (wired; overflows when columns exceed viewport)
- [x] Header + group styling API (font, fg/bg, per-side borders)
