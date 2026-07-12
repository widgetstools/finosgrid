# Design: FI Position Data Provider (worker + JSON flatten)

**Date:** 2026-07-12  
**Status:** Accepted  
**Deciders:** finosgrid maintainers  
**Related:** [Shell architecture ADR](./2026-07-12-finosgrid-shell-architecture-adr.md)

## Goal

Supply the finosgrid shell with **fixed-income position** data: nested JSON from a **Web Worker**, flattened for Perspective, starting with a **50k-row snapshot** then **configurable realtime patches** — without starving the UI thread.

## Decisions (locked)

| Topic | Choice |
|---|---|
| Source shape | Nested JSON (matches real feeds) |
| Engine sink | Flatten → `@finos/perspective` `table.update` |
| Compute location | Web Worker for generate + patch |
| Flatten location | Shared `flattenPositions()` (main thread by default; reusable for live JSON APIs) |
| Throughput | Configurable; defaults `updatesPerSec: 1000`, `batchSize: 100` |
| Scale | Configurable `rowCount` (default `50_000`), ≥300 nested leaf fields |
| Primary key | `positionId` (Perspective table index) |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Main thread                                             │
│  FIPositionDataProvider                                 │
│    • start/stop/configure                               │
│    • flattenPositions(nested[]) → flat records          │
│    • table.update(flat) / onSnapshot / onUpdate         │
│  createGrid({ table }) ← View sort/filter in engine     │
│  view.on_update → refresh body viewport                 │
└──────────────────────────▲──────────────────────────────┘
                           │ postMessage (chunks / patches)
┌──────────────────────────┴──────────────────────────────┐
│ Worker (fi_position_worker.js)                          │
│  1. Build field catalog (≥300 leaves)                   │
│  2. Emit snapshot in chunks (default 5k) — no full keep │
│  3. Emit partial nested patches at configured rate      │
└─────────────────────────────────────────────────────────┘
```

## Nested JSON schema (summary)

Top-level groups: `instrument`, `book`, `position`, `prices`, `yields`, `risk` (incl. `keyRate`, `scenario`), `pnl`, `limits`, `analytics` (generated padding), `meta`.

Flatten uses **dot paths** (`risk.dv01` → column `risk.dv01`). Shell `columnDefs` mirror the same tree as nested `ColGroupDef`s (many groups start collapsed).

Realtime patches are **partial** nested objects keyed by `positionId`.

## Provider config

```ts
type FIPositionFeedConfig = {
  rowCount?: number;        // default 50_000
  minFields?: number;       // default 300 (leaf count)
  chunkSize?: number;       // default 5_000
  updatesPerSec?: number;   // default 1_000
  batchSize?: number;       // default 100
  seed?: number;            // default 42
};
```

## File layout

- `packages/fi-position-feed/` — reusable feed package  
  - `src/schema.js` — field catalog + nested columnDefs  
  - `src/flatten.js` — nested JSON → flat records  
  - `src/provider.js` — main-thread API + Worker host  
  - `src/worker.js` — snapshot + realtime loop  
  - `src/index.js` — exports  
- `apps/shell-spike` — wires feed → Perspective `table` → `createGrid`

## Non-goals (this iteration)

- SharedArrayBuffer / Arrow IPC  
- Worker-side Perspective  
- Full viewport `dataListener` hot-path (still `to_columns` refresh on update; optimize later)

## Self-review

- No placeholders; nested JSON + flatten + worker + configurable rates locked.  
- Memory: worker does **not** retain 50k full nested rows after snapshot; patches are synthetic by index.  
- Scope: feed package + spike wiring + grid refresh on table update.
