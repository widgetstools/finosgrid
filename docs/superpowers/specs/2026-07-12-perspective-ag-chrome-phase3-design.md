# Perspective AG Chrome — Phase 3 Design

**Date:** 2026-07-12  
**Status:** Implementing  
**Depends on:** Phase 1–2 ChromeFeatureHost

## Goal

Add **pivot chrome** and **calculated columns** UI, plus AG look polish — still UI-only; engine via `viewer.restore` only.

## Pivot chrome

- Own chrome toolbar button **Pivot** opens a panel:
  - Row groups → `group_by`
  - Column labels → `split_by`
  - Values → selected numeric columns + aggregate (`sum`/`avg`/`count`/`min`/`max`)
- Apply → `viewer.restore({ group_by, split_by, aggregates, columns })`
- Clear → empty group_by/split_by

## Calculated columns

- Toolbar button **Fx** opens panel: name + expression (ExprTK / Perspective syntax, e.g. `"Sales" - "Profit"`).
- Apply → `viewer.restore({ expressions: { [name]: expr }, columns: [...existing, name] })`
- List existing expressions with remove.

## Look polish

- Hide Perspective datagrid plugin toolbar (`Free Scroll` / `Read Only`) under Quartz theme.
- Add finosgrid chrome toolbar (Pivot / Fx) styled like AG tool strip.
- Dense header/filter band spacing already partially present; tighten borders.

## Files

| Path | Role |
|---|---|
| `chrome/features/pivot_chrome.js` | Pivot panel |
| `chrome/features/calculated_columns.js` | Expression panel |
| `chrome/features/chrome_toolbar.js` | Shared toolbar host for Phase 3 actions |
| `less/chrome/toolbar.less` | Toolbar + panels |
| Wire `chrome/index.js`, demo, public API |
