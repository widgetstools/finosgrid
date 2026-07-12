# Conditional formatting

**Docs:** cell styles — https://www.ag-grid.com/react-data-grid/cell-styles/

```js
cellStyle: (p) => ...,
cellClassRules: { "neg": (p) => p.value < 0 }
```

## Screenshots

- `screenshot-rules.png`

## finosgrid parity checklist

- [ ] Rules applied without fighting native Perspective number colors
- [ ] Matches AG cell highlight density
