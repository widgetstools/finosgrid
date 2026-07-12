# Theme Quartz — Cursor Light / Dark parameter theming

**Docs:** https://www.ag-grid.com/javascript-data-grid/themes/  
**API:** `themeQuartz.withParams({ ... }, 'light'|'dark')` from `@widgetstools/finosgrid/shell`

## Status

**Done** — defaults are modelled on official **Cursor Light** and **Cursor Dark** color themes shipped with Cursor.app (`theme-cursor`).

## Token sources

| Mode | Cursor theme | File |
|---|---|---|
| light | Cursor Light v0.0.2 | `extensions/theme-cursor/themes/cursor-light-color-theme.json` |
| dark | Cursor Dark Anysphere v0.0.3 | `extensions/theme-cursor/themes/cursor-dark-color-theme.json` |

| Grid param | Cursor light | Cursor dark |
|---|---|---|
| `backgroundColor` | `editor.background` `#FCFCFC` | `#181818` |
| `foregroundColor` | `editor.foreground` `#141414` | `#F0F0F0` |
| `headerBackgroundColor` | `sideBar.background` `#F3F3F3` | `#141414` |
| `borderColor` | `sideBar.border` `#14141413` | `#F0F0F013` |
| `accentColor` | `button.background` `#3C7CAB` | `#81A1C1` |
| `selectedRowBackgroundColor` | `list.activeSelectionBackground` `#14141411` | `#F0F0F01E` |
| `rangeSelectionBackgroundColor` | `editor.selectionBackground` `#1414141E` | `#40404099` |
| `rowHoverColor` | `list.hoverBackground` `#14141411` | `#F0F0F011` |
| `inputBorderColor` | `input.border` `#14141426` | `#F0F0F013` |

## Usage

```js
import { createGrid, themeQuartz } from "@widgetstools/finosgrid/shell";

createGrid(el, { theme: themeQuartz, themeMode: "light", columnDefs, table });
api.setThemeMode("dark");
```

## Checklist

- [x] Cursor Light / Dark token mapping for core chrome + selection
- [x] Shell LESS consumes theme tokens
- [x] Spike page chrome + dark/light toggle
- [ ] Theme Parts (`withPart`)
- [ ] Perspective plugin chrome on same Theme API
