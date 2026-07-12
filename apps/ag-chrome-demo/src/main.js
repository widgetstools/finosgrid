import perspective from "@finos/perspective";
import perspective_viewer from "@finos/perspective-viewer";
import "@finos/perspective-viewer/dist/css/pro.css";
import "@widgetstools/finosgrid";
import "./styles.css";

import SERVER_WASM from "@finos/perspective/dist/wasm/perspective-server.wasm?url";
import CLIENT_WASM from "@finos/perspective-viewer/dist/wasm/perspective-viewer.wasm?url";

await Promise.all([
    perspective.init_server(fetch(SERVER_WASM)),
    perspective_viewer.init_client(fetch(CLIENT_WASM)),
]);

const worker = await perspective.worker();

const regions = ["East", "West", "Central", "South"];
const cats = ["Furniture", "Office Supplies", "Technology"];
const rows = [];
for (let i = 0; i < 800; i++) {
    rows.push({
        Region: regions[i % regions.length],
        Category: cats[i % cats.length],
        City: `City ${i % 40}`,
        Sales: Math.round((Math.random() * 500 + 10) * 100) / 100,
        Profit: Math.round((Math.random() * 200 - 50) * 100) / 100,
        Quantity: (i % 12) + 1,
    });
}
const table = worker.table(rows);

const viewer = document.createElement("perspective-viewer");
viewer.setAttribute("theme", "Pro Light");
document.getElementById("grid").append(viewer);
await viewer.load(table);

await viewer.restore({
    plugin: "Datagrid",
    columns: ["Region", "Category", "City", "Sales", "Profit", "Quantity"],
});

function datagridPlugin() {
    return viewer.querySelector("perspective-viewer-datagrid");
}

let groupsOn = false;
document.getElementById("btn-groups").onclick = () => {
    const plugin = datagridPlugin();
    if (!plugin) return;
    groupsOn = !groupsOn;
    plugin.setColumnGroups(
        groupsOn
            ? [
                  {
                      headerName: "Geography",
                      children: ["Region", "City"],
                  },
                  {
                      headerName: "Metrics",
                      children: ["Sales", "Profit", "Quantity"],
                  },
              ]
            : [],
    );
};

document.getElementById("btn-rules").onclick = () => {
    const plugin = datagridPlugin();
    if (!plugin) return;
    plugin.setConditionalFormatting("Sales", [
        { op: ">", value: 200, fg: "#0b6e4f", bg: "#d8f3e7" },
        { op: "<", value: 50, fg: "#8b1e1e", bg: "#fde2e1" },
    ]);
};

let pivoted = false;
document.getElementById("btn-pivot").onclick = async () => {
    pivoted = !pivoted;
    await viewer.restore({
        group_by: pivoted ? ["Region"] : [],
        columns: pivoted
            ? ["Category", "Sales", "Profit"]
            : ["Region", "Category", "City", "Sales", "Profit", "Quantity"],
    });
};
