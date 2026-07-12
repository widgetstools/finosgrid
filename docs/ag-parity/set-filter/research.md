# Set filter (AG Grid Enterprise)

**Docs:** https://www.ag-grid.com/react-data-grid/filter-set/  
**Module:** `SetFilterModule`

## Use cases

- Multi-select distinct values
- Search within values
- Select all / reset
- Mini-filter + Apply (depending on `buttons` / excel mode)

## AG Grid configuration

```js
{ field: "region", filter: "agSetColumnFilter" }
```

## Screenshots

- `screenshot-popup.png`
- `screenshot-search.png`

## finosgrid parity checklist

- [ ] Popup UX matches AG (search, select all, apply/reset)
- [ ] Maps to Perspective `["col", "in", values]`
- [ ] Value list caching
