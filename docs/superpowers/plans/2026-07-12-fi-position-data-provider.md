# FI Position Data Provider — Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Worker-backed nested JSON FI position feed (50k snapshot → realtime), flatten for Perspective, wire into shell spike.

**Architecture:** Web Worker generates nested JSON chunks/patches; main thread flattens and `table.update`s; `createGrid` refreshes on `view.on_update`.

**Tech Stack:** Vite worker modules, `@finos/perspective`, `@widgetstools/finosgrid/shell`

## Global Constraints

- Nested JSON source; flatten for Perspective (dot paths)
- ≥300 leaf fields; default 50k rows
- Configurable `updatesPerSec` / `batchSize` (defaults 1000 / 100)
- Worker must not starve UI; no full 50k nested retain after snapshot
- Perspective index: `positionId`

---

### Task 1: Package scaffold + flatten + schema tests

**Files:**
- Create `packages/fi-position-feed/package.json`
- Create `packages/fi-position-feed/src/flatten.js`
- Create `packages/fi-position-feed/src/schema.js`
- Create `packages/fi-position-feed/test/flatten.spec.js`

- [ ] Implement `flattenPositions` / `flattenPosition`
- [ ] Implement field catalog (≥300 leaves) + `buildColumnDefs`
- [ ] Tests for flatten + leaf count
- [ ] Run tests

### Task 2: Worker + provider

**Files:**
- Create `packages/fi-position-feed/src/worker.js`
- Create `packages/fi-position-feed/src/provider.js`
- Create `packages/fi-position-feed/src/index.js`

- [ ] Worker: schema → chunked snapshot → timed patches
- [ ] Provider: Worker host, flatten, callbacks, start/stop/configure

### Task 3: Grid table.update refresh

**Files:**
- Modify `packages/datagrid/src/js/shell/create_grid.js`

- [ ] When `table` option set, bind `view.on_update` → refresh body
- [ ] Avoid delete/recreate view on every tick when only data changed (prefer stable view + redraw)

### Task 4: Shell spike wiring

**Files:**
- Modify `apps/shell-spike/src/main.js`
- Modify `apps/shell-spike/package.json`
- Modify `apps/shell-spike/index.html` (status line)

- [ ] Start feed → Perspective table → createGrid with nested columnDefs from schema
- [ ] Verify demo loads snapshot then updates

---
