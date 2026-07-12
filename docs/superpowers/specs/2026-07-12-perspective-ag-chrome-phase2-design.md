# Perspective AG Chrome — Phase 2 Design

**Date:** 2026-07-12  
**Status:** Approved for implementation (user requested with demo + push)  
**Depends on:** Phase 1 ChromeFeatureHost

## Goal

Add AG Grid–like **column groups** and **sticky group rows** as chrome features — still UI-only; no engine / data_listener changes.

## Column groups

- Config (chrome save token / programmatic):  
  `columnGroups: [{ headerName: string, children: string[] }]`  
  where `children` are leaf column names (Perspective column paths’ leaf segment).
- Render: extra header band **above** floating filters with cells that `col-span` visually by width sum of child floating/leaf columns.
- Horizontal scroll stays synced with floating band / table (`translateX(-scrollLeft)`).
- Does not alter View `split_by`; this is presentation grouping of leaf columns.

## Sticky group rows

- When `group_by.length > 0`, tree row-header labels (`.psp-tree-label`) use `position: sticky` within the scrollport where regular-table allows, plus a chrome style pass that marks the “current” group header cells.
- Fallback if regular-table overflow prevents true sticky: clone sticky label into a thin overlay on the left (`psp-ag-sticky-group-overlay`) updated on scroll from `getMeta` of the top visible non-leaf row header.
- Prefer CSS sticky first; enable overlay fallback via feature option `mode: 'css' | 'overlay'` (default `'overlay'` for reliability with regular-table).

## Files

| Create | Role |
|---|---|
| `chrome/features/column_groups.js` | Group header band |
| `chrome/features/sticky_groups.js` | Sticky / overlay group labels |
| `less/chrome/column_groups.less` | Group header styles |
| `less/chrome/sticky_groups.less` | Sticky/overlay styles |

Wire into `chrome/index.js` default host registration.
