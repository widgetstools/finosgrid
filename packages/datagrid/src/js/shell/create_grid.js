// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — createGrid / GridApi (AG Grid–compatible entry surface)           ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import { createColumnTree } from "./column_tree.js";
import { createHeaderStack } from "./header_stack.js";
import { createBodyViewport } from "./body_viewport.js";

/**
 * @typedef {import('./ag_types.js').GridOptions} GridOptions
 */

/**
 * @param {any[]} rowData
 * @param {string[]} fields
 */
function rowsToColumns(rowData, fields) {
    /** @type {Record<string, any[]>} */
    const cols = {};
    for (const f of fields) cols[f] = [];
    for (const row of rowData || []) {
        for (const f of fields) cols[f].push(row?.[f]);
    }
    return cols;
}

/**
 * Create a finosgrid with AG Grid–shaped `gridOptions` and return a `GridApi`.
 *
 * @param {HTMLElement} eGridDiv
 * @param {GridOptions & { loadColumns?: Function }} gridOptions
 * @returns {object} GridApi-compatible object
 */
export function createGrid(eGridDiv, gridOptions = {}) {
    /** @type {GridOptions & { loadColumns?: Function }} */
    const options = { floatingFilter: true, ...gridOptions };

    let columnTree = createColumnTree({
        columnDefs: options.columnDefs || [],
        defaultColDef: options.defaultColDef,
        defaultColGroupDef: options.defaultColGroupDef,
    });

    const root = document.createElement("div");
    root.className = "fg-shell";
    root.setAttribute("role", "grid");

    let syncing = false;

    const body = createBodyViewport({
        onScroll(scrollLeft) {
            header.setScrollLeft(scrollLeft);
        },
        onDraw() {
            if (syncing) return;
            const widths = body.measureColumnWidths();
            if (Object.keys(widths).length) {
                header.setColumnWidths(widths);
            }
        },
    });

    /** @type {any} */
    const api = {};

    const header = createHeaderStack({
        getColumnTree: () => columnTree,
        onLayoutChange: () => {
            options.onColumnGroupOpened?.({
                api,
                columnGroupState: columnTree.getColumnGroupState(),
            });
            void refresh();
        },
    });

    if (options.floatingFilter === false) {
        header.el.querySelector(".fg-shell__filter-row").style.display = "none";
    }

    root.append(header.el, body.el);
    eGridDiv.appendChild(root);

    async function loadColumns(fields) {
        if (typeof options.loadColumns === "function") {
            return await options.loadColumns(fields);
        }
        return rowsToColumns(options.rowData || [], fields);
    }

    async function refresh() {
        syncing = true;
        try {
            const fields = header.getLeafFields();
            const cols = await loadColumns(fields);
            const widths = await body.setData(fields, cols);
            header.setColumnWidths(widths);
            header.setScrollLeft(body.scrollLeft);
        } finally {
            syncing = false;
        }
    }

    function rebuildTreeFromOptions() {
        columnTree = createColumnTree({
            columnDefs: options.columnDefs || [],
            defaultColDef: options.defaultColDef,
            defaultColGroupDef: options.defaultColGroupDef,
        });
        header.render();
    }

    Object.assign(api, {
        setGridOption(key, value) {
            options[key] = value;
            if (
                key === "columnDefs" ||
                key === "defaultColDef" ||
                key === "defaultColGroupDef"
            ) {
                rebuildTreeFromOptions();
                void refresh();
                return;
            }
            if (key === "rowData" || key === "loadColumns") {
                void refresh();
                return;
            }
            if (key === "floatingFilter") {
                const el = root.querySelector(".fg-shell__filter-row");
                if (el) el.style.display = value === false ? "none" : "";
            }
        },

        getGridOption(key) {
            return options[key];
        },

        getColumnDefs() {
            return options.columnDefs;
        },

        setColumnGroupOpened(group, newValue) {
            const groupId =
                typeof group === "string"
                    ? group
                    : group?.getGroupId?.() || group?.groupId;
            if (!groupId) return;
            columnTree.setOpen(groupId, !!newValue);
            header.render();
            options.onColumnGroupOpened?.({
                api,
                columnGroupState: columnTree.getColumnGroupState(),
            });
            void refresh();
        },

        getColumnGroupState() {
            return columnTree.getColumnGroupState();
        },

        setColumnGroupState(stateItems) {
            columnTree.setColumnGroupState(stateItems);
            header.render();
            void refresh();
        },

        resetColumnGroupState() {
            columnTree.resetColumnGroupState();
            header.render();
            void refresh();
        },

        /** @internal */
        getColumnTree() {
            return columnTree;
        },

        refreshCells() {
            return refresh();
        },

        destroy() {
            root.remove();
        },
    });

    void refresh().then(() => {
        options.onGridReady?.({ api, type: "gridReady" });
    });

    return api;
}
