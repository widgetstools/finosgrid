import perspective from "@finos/perspective";
import { createGrid } from "@widgetstools/finosgrid/shell";
import { createFIPositionFeed } from "@widgetstools/fi-position-feed";
import shellCssUrl from "@widgetstools/finosgrid/dist/css/finosgrid-shell.css?url";
import "regular-table/dist/css/material.css";

import SERVER_WASM from "@finos/perspective/dist/wasm/perspective-server.wasm?url";
import CLIENT_WASM from "@finos/perspective/dist/wasm/perspective-js.wasm?url";

const link = document.createElement("link");
link.rel = "stylesheet";
link.href = shellCssUrl;
document.head.appendChild(link);

const statusEl = document.getElementById("status");
function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
}

await Promise.all([
    perspective.init_server(fetch(SERVER_WASM)),
    perspective.init_client(fetch(CLIENT_WASM)),
]);

const pspWorker = await perspective.worker();

/** @type {any} */
let table = null;
/** @type {import('@widgetstools/finosgrid/shell').GridApi|null} */
let gridApi = null;

const feed = createFIPositionFeed({
    async onSchema({ schema, columnDefs, leafCount, rowCount }) {
        setStatus(
            `Schema ready · ${leafCount} fields · loading ${rowCount.toLocaleString()} rows…`,
        );
        if (table) {
            await table.delete();
            table = null;
        }
        table = await pspWorker.table(schema, { index: "positionId" });

        if (gridApi) {
            gridApi.destroy();
            gridApi = null;
            document.getElementById("grid").replaceChildren();
        }

        /**
 * Annotate FI columnDefs with AG row grouping + aggregation for the spike.
 * Groups by desk → sector; sums key risk/position measures.
 * @param {any[]} defs
 */
function withRowGrouping(defs) {
    const groupFields = new Set(["book.desk", "instrument.sector"]);
    const sumFields = new Set([
        "position.notional",
        "position.marketValue",
        "risk.dv01",
        "risk.cs01",
    ]);

    function walk(nodes) {
        return (nodes || []).map((n) => {
            if (Array.isArray(n.children)) {
                return { ...n, children: walk(n.children) };
            }
            const next = { ...n };
            if (groupFields.has(n.field)) {
                next.rowGroup = true;
                next.hide = true;
                next.rowGroupIndex = n.field === "book.desk" ? 0 : 1;
            }
            if (sumFields.has(n.field)) {
                next.aggFunc = "sum";
                next.enableValue = true;
            }
            return next;
        });
    }
    return walk(defs);
}

        gridApi = createGrid(document.getElementById("grid"), {
            columnDefs: withRowGrouping(columnDefs),
            table,
            groupDefaultExpanded: 1,
            groupTotalRow: "bottom",
            grandTotalRow: "bottom",
            rowSelection: {
                mode: "multiRow",
                checkboxes: true,
                headerCheckbox: true,
                enableClickSelection: true,
            },
            cellSelection: {
                handle: { mode: "fill" },
            },
            autoGroupColumnDef: {
                headerName: "Desk / Sector",
                width: 240,
                pinned: "left",
            },
            defaultColDef: {
                sortable: true,
                resizable: true,
                filter: true,
                floatingFilter: true,
                width: 110,
            },
            floatingFilter: true,
            onSelectionChanged({ selectedNodes }) {
                setStatus(
                    `Selected ${selectedNodes.length} row(s) · grouped desk→sector · ${leafCount} fields`,
                );
            },
            onGridReady() {
                setStatus(
                    `Grid ready · multi-row + cell selection · grouped desk→sector · ${leafCount} fields · waiting for snapshot…`,
                );
            },
        });
        window.gridApi = gridApi;
        window.fiFeed = feed;
    },

    async onSnapshotChunk({ flatRows, end, done }) {
        if (!table) return;
        await table.update(flatRows);
        setStatus(
            done
                ? `Snapshot complete · ${end.toLocaleString()} rows · starting realtime…`
                : `Loading snapshot… ${end.toLocaleString()} rows`,
        );
    },

    async onSnapshotComplete({ rowCount }) {
        setStatus(
            `Live · ${rowCount.toLocaleString()} positions · ${feed.getConfig().updatesPerSec}/s updates`,
        );
        await gridApi?.refreshCells?.();
    },

    async onUpdate({ flatRows, updateSeq }) {
        if (!table) return;
        await table.update(flatRows);
        if (updateSeq % 20 === 0) {
            setStatus(
                `Live · seq ${updateSeq} · ${feed.getConfig().updatesPerSec}/s · batch ${flatRows.length}`,
            );
        }
    },

    onError(err) {
        console.error(err);
        setStatus(`Error: ${err.message}`);
    },
});

// Configurable feed: 50k rows, ≥300 fields, then realtime patches
feed.start({
    rowCount: 50_000,
    minFields: 300,
    chunkSize: 5_000,
    updatesPerSec: 1_000,
    batchSize: 100,
    seed: 42,
});

// Console helpers:
//   fiFeed.configure({ updatesPerSec: 5000, batchSize: 250 })
//   fiFeed.stop() / fiFeed.start()
