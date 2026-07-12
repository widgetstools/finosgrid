import perspective from "@finos/perspective";
import { createShell } from "@widgetstools/finosgrid/shell";
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

const columnDefs = [
    {
        groupId: "geography",
        headerName: "Geography",
        headerStyle: {
            backgroundColor: "#e3eef8",
            border: {
                bottom: { width: 2, color: "#2196f3", style: "solid" },
            },
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
                    border: {
                        left: { width: 2, color: "#c62828", style: "solid" },
                    },
                },
            },
        ],
    },
    {
        groupId: "product",
        headerName: "Product",
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
        headerStyle: {
            backgroundColor: "#e8f5e9",
            border: {
                top: { width: 1, color: "#2e7d32", style: "dashed" },
            },
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

async function loadColumns(fields) {
    if (view) {
        await view.delete();
    }
    view = await table.view({ columns: fields });
    return await view.to_columns();
}

const shell = createShell({
    container: document.getElementById("grid"),
    columnDefs,
    loadColumns,
});

await shell.refresh();
