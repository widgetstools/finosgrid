# finosgrid Owned Header Shell — Spike Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove a first-class header shell (nested collapsible column groups → leaf headers → floating filters) above a regular-table **body-only** viewport driven by Perspective.

**Architecture:** See [ADR](../specs/2026-07-12-finosgrid-shell-architecture-adr.md). Engine = Perspective; body = regular-table without product `column_headers`; shell = owned header stack with expand/collapse visibility and per-header styles.

**Tech Stack:** `@widgetstools/finosgrid`, `@finos/perspective` / `@finos/perspective-viewer`, `regular-table`, Vite demo apps.

## Global Constraints

- Do not change Perspective WASM compute or the `dataListener` → format → paint hot path semantics.
- Do not use regular-table `column_headers` for product group/leaf/floating chrome.
- Visible leaf set after expand/collapse must drive which columns the viewport shows.
- AG Grid parity target remains Enterprise **v35+** (reference app v36).
- Prefer small, testable modules under `packages/datagrid/src/js/shell/` (new) rather than growing Phase 1 overlay hacks.

## File map (spike)

| Path | Role |
|---|---|
| `packages/datagrid/src/js/shell/column_tree.js` | `ColDef` / `ColGroupDef` tree; expand state; `visibleLeaves()` |
| `packages/datagrid/src/js/shell/header_style.js` | Apply `HeaderStyle` → CSS on a header cell |
| `packages/datagrid/src/js/shell/header_stack.js` | Render group rows + leaf headers + mount point for floating filters |
| `packages/datagrid/src/js/shell/body_viewport.js` | Mount regular-table body-only; sync scroll/widths to shell |
| `packages/datagrid/src/js/shell/index.js` | Public `createShell()` / mount API |
| `packages/datagrid/test/js/shell/column_tree.spec.js` | Visibility + nesting unit tests |
| `apps/ag-chrome-demo/` or new `apps/shell-spike/` | Manual visual spike |

---

### Task 1: Column tree + visibility (unit tests first)

**Files:**
- Create: `packages/datagrid/src/js/shell/column_tree.js`
- Create: `packages/datagrid/test/js/shell/column_tree.spec.js`

- [x] **Step 1: Failing tests for visibility rules**

  Cover:
  - `always` visible when group open or closed
  - `open` only when group is expanded
  - `closed` only when group is collapsed
  - nested groups (parent collapsed hides open-only grandchildren)
  - expand state persistence (`setOpen(groupId, boolean)`)
  - stable leaf order = tree DFS order of visible leaves

- [x] **Step 2: Implement `visibleLeaves(tree, openState)` and open-state helpers**

- [x] **Step 3: Run tests; fix until green**

- [x] **Step 4: Commit**

```bash
git add packages/datagrid/src/js/shell/column_tree.js packages/datagrid/test/js/shell/column_tree.spec.js
git commit -m "$(cat <<'EOF'
feat(shell): column group tree with open/closed leaf visibility

EOF
)"
```

---

### Task 2: HeaderStyle → CSS

**Files:**
- Create: `packages/datagrid/src/js/shell/header_style.js`
- Create: `packages/datagrid/test/js/shell/header_style.spec.js`

- [ ] **Step 1: Failing tests** — map `HeaderStyle` to inline style / CSS variables, including per-side borders (`border-top-width`, etc.) and `visible: false` ⇒ `border-*-style: none` or width 0

- [ ] **Step 2: Implement `applyHeaderStyle(el, style)`**

- [ ] **Step 3: Tests green; commit**

```bash
git commit -m "$(cat <<'EOF'
feat(shell): per-header font, color, and per-side border styles

EOF
)"
```

---

### Task 3: Header stack DOM (groups → leaves → filter slot)

**Files:**
- Create: `packages/datagrid/src/js/shell/header_stack.js`
- Create: `packages/datagrid/src/less/shell/header_stack.less`

- [ ] **Step 1: Render nested group rows with collapse control (▶/▼) per group**

- [ ] **Step 2: Render leaf header row for `visibleLeaves()` only; apply `headerStyle`**

- [ ] **Step 3: Reserve a floating-filter row slot **under** leaf headers (empty inputs OK for spike)

- [ ] **Step 4: On toggle, recompute visible leaves and re-render header rows**

- [ ] **Step 5: Manual check in spike demo; commit**

```bash
git commit -m "$(cat <<'EOF'
feat(shell): header stack with collapsible nested groups

EOF
)"
```

---

### Task 4: Body-only regular-table + column sync

**Files:**
- Create: `packages/datagrid/src/js/shell/body_viewport.js`
- Modify: demo spike wiring (Perspective table/view → listener)

- [ ] **Step 1: Mount `<regular-table>` with dataListener that returns **no** product `column_headers` (row headers OK if grouped)**

- [ ] **Step 2: When visible leaves change, update Perspective `columns` (or listener column map) to match visible fields only**

- [ ] **Step 3: Sync leaf header + filter cell widths to body cell widths; sync `scrollLeft`**

- [ ] **Step 4: Verify: expand/collapse changes painted columns; first body row sits below floating filter row with no overlap**

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(shell): body-only regular-table synced to visible leaf columns

EOF
)"
```

---

### Task 5: Spike demo + screenshots + ADR checklist

**Files:**
- Create or extend: `apps/shell-spike/` (or flag on `apps/ag-chrome-demo`)
- Update: `docs/ag-parity/column-groups/research.md`
- Screenshots: `docs/ag-parity/column-groups/screenshot-shell-spike.png`

- [ ] **Step 1: Demo data with nested groups + always/open/closed leaves + sample `headerStyle` borders**

- [ ] **Step 2: Capture screenshot vs AG reference groups**

- [ ] **Step 3: Mark spike success criteria (below) pass/fail in ADR or this plan**

- [ ] **Step 4: Commit + push if asked**

## Spike success criteria

| # | Criterion | Pass? |
|---|---|---|
| 1 | Floating filters render **below** leaf column headers | |
| 2 | Nested groups collapse/expand | |
| 3 | `always` / `open` / `closed` leaves show/hide correctly | |
| 4 | Body columns match visible leaves (Perspective path) | |
| 5 | Per-side header borders + font/colors apply on group and leaf headers | |
| 6 | No overlap of header stack with first body row | |
| 7 | Horizontal scroll keeps headers aligned with body | |

## Out of scope for this spike

- Full Columns tool panel
- Migrating all Phase 1–3 chrome off the old overlay host
- Div-based body virtualizer (only if this spike fails scroll/sticky/width sync)
- Editing, range selection parity

## Rollback / decision gate

- **Pass:** Adopt shell modules as the product header path; migrate floating filters + theme next.
- **Fail on body sync only:** Revisit div body virtualizer consuming the same `dataListener` protocol.
- **Fail on group model:** Reopen ADR (unlikely if unit tests for `column_tree` are solid).
