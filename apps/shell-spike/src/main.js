import perspective from "@finos/perspective";
import { createGrid } from "@widgetstools/finosgrid/shell";
import shellCssUrl from "@widgetstools/finosgrid/dist/css/finosgrid-shell.css?url";
import "regular-table/dist/css/material.css";

import SERVER_WASM from "@finos/perspective/dist/wasm/perspective-server.wasm?url";
import CLIENT_WASM from "@finos/perspective/dist/wasm/perspective-js.wasm?url";

const link = document.createElement("link");
link.rel = "stylesheet";
link.href = shellCssUrl;
document.head.appendChild(link);

await Promise.all([
    perspective.init_server(fetch(SERVER_WASM)),
    perspective.init_client(fetch(CLIENT_WASM)),
]);

const worker = await perspective.worker();

const regions = ["East", "West", "Central", "South"];
const cats = ["Furniture", "Office Supplies", "Technology"];
const rows = [];
for (let i = 0; i < 400; i++) {
    rows.push({
        Region: regions[i % regions.length],
        City: `City ${i % 40}`,
        RegionCode: `R${(i % 4) + 1}`,
        Category: cats[i % cats.length],
        CategorySummary: cats[i % cats.length].slice(0, 1),
        Sku: `SKU-${1000 + (i % 50)}`,
        Sales: Math.round((Math.random() * 500 + 10) * 100) / 100,
        Profit: Math.round((Math.random() * 200 - 50) * 100) / 100,
        Quantity: (i % 12) + 1,
    });
}

const table = await worker.table(rows);
/** @type {any} */
let view = null;

/**
 * AG Grid–shaped columnDefs (ColDef | ColGroupDef).
 * headerStyle is AG flat CSS; columnGroupShow is 'open' | 'closed' only;
 * openByDefault defaults to false in AG — set true where groups start open.
 */
const columnDefs = [
    {
        groupId: "geography",
        headerName: "Geography",
        openByDefault: true,
        headerStyle: {
            backgroundColor: "#e3eef8",
            borderBottom: "2px solid #2196f3",
        },
        children: [
            {
                field: "Region",
                headerName: "Region",
                headerStyle: { fontWeight: 700 },
            },
            {
                field: "City",
                headerName: "City",
                columnGroupShow: "open",
            },
            {
                field: "RegionCode",
                headerName: "Code",
                columnGroupShow: "closed",
                headerStyle: {
                    color: "#8b1e1e",
                    borderLeft: "2px solid #c62828",
                },
            },
        ],
    },
    {
        groupId: "product",
        headerName: "Product",
        openByDefault: true,
        children: [
            {
                groupId: "product-detail",
                headerName: "Detail",
                columnGroupShow: "open",
                openByDefault: true,
                headerStyle: {
                    fontStyle: "italic",
                    backgroundColor: "#f3f0e8",
                },
                children: [
                    { field: "Category", headerName: "Category" },
                    {
                        field: "Sku",
                        headerName: "SKU",
                        columnGroupShow: "open",
                    },
                ],
            },
            {
                field: "CategorySummary",
                headerName: "Cat*",
                columnGroupShow: "closed",
            },
        ],
    },
    {
        groupId: "metrics",
        headerName: "Metrics",
        openByDefault: true,
        headerStyle: {
            backgroundColor: "#e8f5e9",
            borderTop: "1px dashed #2e7d32",
        },
        children: [
            { field: "Sales", headerName: "Sales" },
            {
                field: "Profit",
                headerName: "Profit",
                columnGroupShow: "open",
            },
            {
                field: "Quantity",
                headerName: "Qty",
                columnGroupShow: "open",
            },
        ],
    },
];

/** @type {import('@widgetstools/finosgrid/shell').GridApi} */
const gridApi = createGrid(document.getElementById("grid"), {
    columnDefs,
    defaultColDef: {
        floatingFilter: true,
    },
    floatingFilter: true,
    async loadColumns(fields) {
        if (view) await view.delete();
        view = await table.view({ columns: fields });
        return await view.to_columns();
    },
    onGridReady(e) {
        console.info("[shell-spike] gridReady", e.api.getColumnGroupState());
    },
});

// Expose for console debugging (AG-style)
window.gridApi = gridApi;
