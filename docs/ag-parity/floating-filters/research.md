# Floating filters (AG Grid)

**Reference:** `apps/ag-grid-reference` — row under headers  
**Docs:** https://www.ag-grid.com/react-data-grid/floating-filters/

## Use cases

- Quick filter without opening the full filter popup
- Synced with column filter model
- Per-type UI (text / number / set / date)

## AG Grid configuration (v35+)

```js
defaultColDef: {
  floatingFilter: true,
  filter: true, // or specific filter per column
}
```

Set columns use `filter: "agSetColumnFilter"`; number columns `agNumberColumnFilter`.

## Screenshots

- `screenshot-default.png` — floating row under Quartz headers
- `screenshot-active.png` — filters applied, first data row not overlapped

## finosgrid parity checklist

- [ ] Dedicated band under headers — **must not overlap first data row**
- [ ] Widths sync with columns on scroll/resize
- [ ] Debounced apply to View `filter`
- [ ] Visual match to Quartz floating inputs (height, border, padding)
