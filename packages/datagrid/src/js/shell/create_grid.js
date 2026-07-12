// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — createGrid / GridApi (AG Grid–compatible entry surface)           ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import { createColumnTree, leafField } from "./column_tree.js";
import { createHeaderStack } from "./header_stack.js";
import { createBodyViewport } from "./body_viewport.js";
import {
    createColumnState,
    applyColumnStateToData,
} from "./column_state.js";
import { toPerspectiveViewConfig, toPerspectiveSort, toPerspectiveFilter } from "./engine_bridge.js";
import {
    AUTO_GROUP_COL_ID,
    extractRowGroupConfig,
    filterDisplayLeaves,
} from "./row_grouping.js";
import {
    SELECTION_COL_ID,
    normalizeRowSelection,
    normalizeCellSelection,
    wantsSelectionColumn,
} from "./selection_options.js";
import { createRowSelectionController } from "./row_selection.js";
import { createCellSelectionController } from "./cell_selection.js";
import {
    normalizeTheme,
    applyTheme,
    setThemeMode,
    getThemeMode,
} from "./theme.js";
import {
    createContextMenuController,
    resolveMenuItems,
    defaultColumnMenuItems,
    defaultAutoGroupColumnMenuItems,
    defaultGroupHeaderMenuItems,
    defaultCellContextMenuItems,
} from "./context_menu.js";
import { createStatusBar } from "./status_bar.js";

/**
 * @typedef {import('./ag_types.js').GridOptions} GridOptions
 */

const FILTER_DEBOUNCE_MS = 150;
const TABLE_UPDATE_REDRAW_MS = 32;

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
 * @param {HTMLElement} eGridDiv
 * @param {GridOptions & {
 *   loadColumns?: Function,
 *   table?: { view: Function },
 * }} gridOptions
 */
export function createGrid(eGridDiv, gridOptions = {}) {
    /** @type {GridOptions & { loadColumns?: Function, table?: any }} */
    const options = {
        floatingFilter: true,
        ...gridOptions,
        defaultColDef: {
            sortable: true,
            resizable: true,
            filter: true,
            floatingFilter: true,
            ...(gridOptions.defaultColDef || {}),
        },
    };

    let columnTree = createColumnTree({
        columnDefs: options.columnDefs || [],
        defaultColDef: options.defaultColDef,
        defaultColGroupDef: options.defaultColGroupDef,
    });

    const columnState = createColumnState(options.columnDefs || []);

    const root = document.createElement("div");
    root.className = "fg-shell";
    root.setAttribute("role", "grid");

    /** @type {ReturnType<typeof normalizeTheme>} */
    let theme = normalizeTheme(options.theme);
    /** @type {string} */
    let themeMode =
        options.themeMode === "dark" || options.themeMode === "light"
            ? options.themeMode
            : "light";
    applyTheme(root, theme, themeMode);

    let syncing = false;
    /** @type {any} */
    let engineView = null;
    /** @type {string} */
    let engineViewKey = "";
    /** @type {number|null} */
    let viewUpdateCallbackId = null;
    let viewGen = 0;
    /** Serialize all Perspective view create/delete/draw work */
    let tableQueue = Promise.resolve();
    /** @type {ReturnType<typeof setTimeout>|null} */
    let filterDebounce = null;
    /** @type {ReturnType<typeof setTimeout>|null} */
    let updateDebounce = null;
    /** @type {any} */
    const api = {};

    const usesEngine =
        typeof options.loadColumns === "function" || !!options.table;

    /** @type {ReturnType<typeof normalizeRowSelection>} */
    let rowSelectionOpts = normalizeRowSelection(options.rowSelection);
    /** @type {ReturnType<typeof normalizeCellSelection>} */
    let cellSelectionOpts = normalizeCellSelection(
        options.cellSelection,
        options.enableRangeSelection,
    );

    /** @type {any[]} */
    let displayedRowNodes = [];

    const rowSelection = createRowSelectionController({
        getOptions: () => rowSelectionOpts,
        getRowNodes: () => displayedRowNodes,
        onRowSelected(e) {
            options.onRowSelected?.({ api, node: e.node, type: "rowSelected" });
            body.refreshSelectionPaint?.();
        },
        onSelectionChanged(e) {
            options.onSelectionChanged?.({
                api,
                selectedNodes: e.selectedNodes,
                source: e.source,
                type: "selectionChanged",
            });
            body.refreshSelectionPaint?.();
            scheduleStatusBarRefresh();
        },
    });

    const cellSelection = createCellSelectionController({
        getOptions: () => cellSelectionOpts,
        onCellSelectionChanged(e) {
            options.onCellSelectionChanged?.({
                api,
                cellRanges: e.cellRanges,
                type: "cellSelectionChanged",
            });
            body.refreshSelectionPaint?.();
            scheduleStatusBarRefresh({ aggregation: true });
        },
        onCellSelectionDeleteStart(e) {
            options.onCellSelectionDeleteStart?.({
                api,
                ...e,
                type: "cellSelectionDeleteStart",
            });
        },
        onCellSelectionDeleteEnd(e) {
            options.onCellSelectionDeleteEnd?.({
                api,
                ...e,
                type: "cellSelectionDeleteEnd",
            });
        },
    });

    function syncSelectionColumnState() {
        if (!wantsSelectionColumn(rowSelectionOpts)) return;
        columnState.seedFromDefs([
            {
                field: SELECTION_COL_ID,
                colId: SELECTION_COL_ID,
                width: 48,
                pinned: "left",
                resizable: false,
                sortable: false,
                filter: false,
                floatingFilter: false,
                headerName: "",
            },
        ]);
        columnState.setWidth(SELECTION_COL_ID, 48);
        columnState.setPin(SELECTION_COL_ID, "left");
    }

    /**
     * Rebuild lightweight RowNode stubs for the current displayed row count.
     * @param {number} count
     * @param {any[]} [rowDataSnapshot]
     */
    function syncDisplayedRowNodes(count, rowDataSnapshot) {
        const rows = rowDataSnapshot || options.rowData || [];
        displayedRowNodes = [];
        for (let i = 0; i < count; i++) {
            displayedRowNodes.push({
                id: String(i),
                rowIndex: i,
                data: rows[i] ?? null,
                group: false,
                level: 0,
            });
        }
        rowSelection.attachNodes(displayedRowNodes);
    }

    /**
     * @template T
     * @param {() => Promise<T>|T} fn
     * @returns {Promise<T>}
     */
    function enqueueTableOp(fn) {
        const run = tableQueue.then(fn, fn);
        tableQueue = run.then(
            () => undefined,
            () => undefined,
        );
        return run;
    }

    const body = createBodyViewport({
        onScroll(scrollLeft) {
            header.setScrollLeft(scrollLeft);
        },
        onDraw() {
            if (syncing) return;
            const measured = body.measureColumnWidths();
            const seed = {};
            for (const [f, w] of Object.entries(measured)) {
                if (!columnState.getWidths()[f]) seed[f] = w;
            }
            if (Object.keys(seed).length) {
                header.setColumnWidths(seed);
            }
            body.applyPinnedLayout?.(header.getLeafFields(), columnState);
        },
        onRowGroupOpened(info) {
            options.onRowGroupOpened?.({ api, ...info });
        },
        onDisplayedRowCount(count) {
            syncDisplayedRowNodes(count, options.rowData);
            scheduleStatusBarRefresh();
        },
        getTable: () => options.table,
        getSort: () => toPerspectiveSort(columnState),
        getFilter: () => toPerspectiveFilter(columnState),
        enableDetailLeaves: options.enableDetailLeaves !== false,
        suppressGroupRowsSticky: options.suppressGroupRowsSticky === true,
        groupTotalRow: options.groupTotalRow ?? "bottom",
        grandTotalRow: options.grandTotalRow ?? "bottom",
        getRowSelection: () => rowSelectionOpts,
        getCellSelection: () => cellSelectionOpts,
        rowSelection,
        cellSelection,
    });

    syncSelectionColumnState();

    function getRowGroupConfig() {
        return extractRowGroupConfig({
            columnDefs: options.columnDefs || [],
            groupDefaultExpanded: options.groupDefaultExpanded ?? 0,
            autoGroupColumnDef: options.autoGroupColumnDef,
            groupDisplayType: options.groupDisplayType || "singleColumn",
        });
    }

    function syncAutoGroupColumnState(cfg) {
        if (!cfg.enabled) return;
        const def = cfg.autoGroupColumnDef;
        columnState.seedFromDefs([def]);
        if (def.width) columnState.setWidth(AUTO_GROUP_COL_ID, def.width);
        if (def.pinned) {
            columnState.setPin(
                AUTO_GROUP_COL_ID,
                def.pinned === true ? "left" : def.pinned,
            );
        } else {
            columnState.setPin(AUTO_GROUP_COL_ID, "left");
        }
    }

    function getVisibleLeafDefs() {
        const cfg = getRowGroupConfig();
        const leaves = filterDisplayLeaves(columnTree.visibleLeaves(), {
            hiddenGroupFields: cfg.hiddenGroupFields,
            hideGroupedColumns: options.groupHideColumns === true,
            groupBy: cfg.groupBy,
        });
        /** @type {any[]} */
        let defs =
            !cfg.enabled || cfg.groupDisplayType === "custom"
                ? leaves.slice()
                : [cfg.autoGroupColumnDef, ...leaves];
        if (wantsSelectionColumn(rowSelectionOpts)) {
            defs = [
                {
                    field: SELECTION_COL_ID,
                    colId: SELECTION_COL_ID,
                    headerName: "",
                    width: 48,
                    minWidth: 48,
                    maxWidth: 52,
                    pinned: "left",
                    resizable: false,
                    sortable: false,
                    filter: false,
                    floatingFilter: false,
                    suppressMovable: true,
                },
                ...defs,
            ];
        }
        return defs;
    }

    function viewFieldsFromDisplay(displayFields) {
        return displayFields.filter(
            (f) => f !== AUTO_GROUP_COL_ID && f !== SELECTION_COL_ID,
        );
    }

    function groupingForView() {
        const cfg = getRowGroupConfig();
        return {
            groupBy: cfg.groupBy,
            aggregates: cfg.aggregates,
            groupByDepth: cfg.groupByDepth,
        };
    }

    function scheduleRefreshFromColumnState(kind) {
        if (kind === "filter" && usesEngine) {
            clearTimeout(filterDebounce);
            filterDebounce = setTimeout(() => {
                filterDebounce = null;
                void refresh().then(() => scheduleStatusBarRefresh());
                options.onFilterChanged?.({ api });
            }, FILTER_DEBOUNCE_MS);
            return;
        }
        // Resize: sync body cell widths only — do not recreate the View
        if (kind === "resize-live" || kind === "resize") {
            body.applyPinnedLayout?.(header.getLeafFields(), columnState);
            if (kind === "resize") options.onColumnResized?.({ api });
            return;
        }
        // Pin: rebuild split panes + Perspective column order
        if (kind === "pin") {
            void refresh().then(() => scheduleStatusBarRefresh());
            options.onColumnPinned?.({ api });
            return;
        }
        void refresh().then(() => scheduleStatusBarRefresh());
        if (kind === "sort") options.onSortChanged?.({ api });
        if (kind === "filter") options.onFilterChanged?.({ api });
        if (kind === "move") options.onColumnMoved?.({ api });
    }

    const header = createHeaderStack({
        getColumnTree: () => columnTree,
        columnState,
        defaultColDef: options.defaultColDef,
        getVisibleLeaves: getVisibleLeafDefs,
        onLayoutChange: (detail) => {
            options.onColumnGroupOpened?.({
                api,
                groupId: detail?.groupId,
                opened: detail?.opened,
                columnGroupState: columnTree.getColumnGroupState(),
            });
            void refresh();
        },
        onColumnStateChange: (kind) => {
            scheduleRefreshFromColumnState(kind || "all");
        },
    });

    // Seed auto-group chrome once defs are known
    syncAutoGroupColumnState(getRowGroupConfig());
    body.setGroupBy(getRowGroupConfig().groupBy);

    if (options.floatingFilter === false) {
        header.el.querySelector(".fg-shell__filter-row").style.display = "none";
    }

    /** @type {number[]} */
    let aggregationValueCache = [];
    let totalRowCountCache = 0;
    /** @type {ReturnType<typeof setTimeout>|null} */
    let statusBarTimer = null;
    /** @type {ReturnType<typeof setTimeout>|null} */
    let statusBarAggTimer = null;

    async function refreshTotalRowCount() {
        try {
            if (typeof options.table?.size === "function") {
                const n = await options.table.size();
                totalRowCountCache = Number(n) || 0;
                return;
            }
            if (typeof options.table?.num_rows === "function") {
                const n = await options.table.num_rows();
                totalRowCountCache = Number(n) || 0;
                return;
            }
        } catch {
            /* ignore */
        }
        if (Array.isArray(options.rowData)) {
            totalRowCountCache = options.rowData.length;
            return;
        }
        // No dataset size available — leave cache unchanged rather than
        // collapsing total to the virtual/grouped displayed count.
    }

    function getStatusCounts() {
        const displayed =
            body.getDisplayedRowCount?.() ?? displayedRowNodes.length;
        const hasFilter =
            Object.keys(columnState.getFilterModel?.() || {}).length > 0;
        return {
            // Prefer dataset size; fall back to displayed only when unknown.
            total: totalRowCountCache > 0 ? totalRowCountCache : displayed,
            displayed,
            selected: rowSelection.getSelectedNodes?.()?.length || 0,
            hasFilter,
        };
    }

    function scheduleStatusBarRefresh({
        aggregation = false,
        refreshTotal = false,
    } = {}) {
        if (statusBarTimer) clearTimeout(statusBarTimer);
        statusBarTimer = setTimeout(() => {
            statusBarTimer = null;
            if (refreshTotal) {
                void refreshTotalRowCount().then(() => statusBar.refresh());
            } else {
                statusBar.refresh();
            }
        }, 0);
        if (aggregation) {
            if (statusBarAggTimer) clearTimeout(statusBarAggTimer);
            statusBarAggTimer = setTimeout(() => {
                statusBarAggTimer = null;
                void (async () => {
                    try {
                        aggregationValueCache =
                            (await body.collectNumericRangeValues?.(
                                cellSelection.getCellRanges(),
                            )) || [];
                    } catch {
                        aggregationValueCache = [];
                    }
                    statusBar.refresh();
                })();
            }, 16);
        }
    }

    const statusBar = createStatusBar({
        getApi: () => api,
        context: options.context,
        getCounts: getStatusCounts,
        getAggregationValues: () => aggregationValueCache,
    });
    statusBar.setConfig(options.statusBar || null);
    void refreshTotalRowCount().then(() => statusBar.refresh());

    root.append(header.el, body.el, statusBar.el);
    eGridDiv.appendChild(root);

    const popupMenus = createContextMenuController({
        // Menus mount on document.body (avoids .fg-shell overflow clipping);
        // theme host supplies --fg-* tokens + data-ag-theme-mode.
        getThemeHost: () => root,
    });

    function findLeafDef(field) {
        return (
            getVisibleLeafDefs().find(
                (l) => leafField(l) === field || l.colId === field,
            ) || null
        );
    }

    function columnMenuActions(field) {
        return {
            sortAscending() {
                columnState.setSort(field, "asc");
                header.render();
                scheduleRefreshFromColumnState("sort");
            },
            sortDescending() {
                columnState.setSort(field, "desc");
                header.render();
                scheduleRefreshFromColumnState("sort");
            },
            sortUnSort() {
                columnState.setSort(field, null);
                header.render();
                scheduleRefreshFromColumnState("sort");
            },
            pinLeft() {
                columnState.setPin(field, "left");
                header.render();
                scheduleRefreshFromColumnState("pin");
            },
            pinRight() {
                columnState.setPin(field, "right");
                header.render();
                scheduleRefreshFromColumnState("pin");
            },
            pinNone() {
                columnState.setPin(field, null);
                header.render();
                scheduleRefreshFromColumnState("pin");
            },
            autoSizeThis() {
                const measured = body.measureColumnWidths?.() || {};
                const w = measured[field];
                if (w) {
                    columnState.setWidth(field, Math.ceil(w + 8));
                    header.render();
                    scheduleRefreshFromColumnState("resize");
                }
            },
            autoSizeAll() {
                const measured = body.measureColumnWidths?.() || {};
                for (const [f, w] of Object.entries(measured)) {
                    if (f === SELECTION_COL_ID) continue;
                    columnState.setWidth(f, Math.ceil(w + 8));
                }
                header.render();
                scheduleRefreshFromColumnState("resize");
            },
            async copy(ctx) {
                const text = ctx?.value != null ? String(ctx.value) : "";
                try {
                    await navigator.clipboard?.writeText?.(text);
                } catch {
                    /* ignore */
                }
            },
            async copyWithHeaders(ctx) {
                const headerName =
                    findLeafDef(field)?.headerName || field || "";
                const text = `${headerName}\t${ctx?.value ?? ""}`;
                try {
                    await navigator.clipboard?.writeText?.(text);
                } catch {
                    /* ignore */
                }
            },
        };
    }

    function openColumnHeaderMenu(field, clientX, clientY) {
        if (
            !field ||
            field === SELECTION_COL_ID ||
            options.suppressHeaderContextMenu
        ) {
            return;
        }
        const leaf = findLeafDef(field);
        const sortState = columnState.getSort();
        const rowGrouped = getRowGroupConfig().groupBy.length > 0;
        const isAutoGroup = field === AUTO_GROUP_COL_ID;
        const context = {
            field,
            column: leaf,
            pin: columnState.getPin(field) ?? null,
            sort: sortState.colId === field ? sortState.sort : null,
            sortable:
                !isAutoGroup &&
                leaf?.sortable !== false &&
                options.defaultColDef?.sortable !== false,
            pinnable: leaf?.lockPinned !== true,
            hasRowGroups: rowGrouped,
            hasColumnGroups: Object.keys(columnTree.getOpenState()).length > 0,
        };
        const defaultItems =
            isAutoGroup && rowGrouped
                ? defaultAutoGroupColumnMenuItems()
                : defaultColumnMenuItems();
        const raw =
            typeof leaf?.mainMenuItems !== "undefined"
                ? leaf.mainMenuItems
                : options.getMainMenuItems || defaultItems;
        const actions = {
            ...columnMenuActions(field),
            expandAll() {
                return body.expandAllGroups?.();
            },
            contractAll() {
                return body.collapseAllGroups?.();
            },
        };
        const items = resolveMenuItems(raw, {
            defaultItems,
            actions,
            context,
        });
        popupMenus.showPopup({ x: clientX, y: clientY, items });
    }

    function notifyColumnGroupOpened(groupId, opened) {
        options.onColumnGroupOpened?.({
            api,
            groupId,
            opened,
            columnGroupState: columnTree.getColumnGroupState(),
        });
    }

    function openGroupHeaderMenu(groupId, expandable, clientX, clientY) {
        if (!groupId || options.suppressHeaderContextMenu) return;
        const groupIds = Object.keys(columnTree.getOpenState());
        const actions = {
            expandGroup() {
                columnTree.setOpen(groupId, true);
                header.render();
                notifyColumnGroupOpened(groupId, true);
                void refresh();
            },
            collapseGroup() {
                columnTree.setOpen(groupId, false);
                header.render();
                notifyColumnGroupOpened(groupId, false);
                void refresh();
            },
            expandAll() {
                columnTree.setAllOpen(true);
                header.render();
                notifyColumnGroupOpened(null, true);
                void refresh();
            },
            contractAll() {
                columnTree.setAllOpen(false);
                header.render();
                notifyColumnGroupOpened(null, false);
                void refresh();
            },
            autoSizeThis() {
                const leaves = header.getLeafFields();
                const measured = body.measureColumnWidths?.() || {};
                for (const f of leaves) {
                    if (measured[f]) {
                        columnState.setWidth(f, Math.ceil(measured[f] + 8));
                    }
                }
                header.render();
                scheduleRefreshFromColumnState("resize");
            },
        };
        const items = resolveMenuItems(
            options.getMainMenuItems || defaultGroupHeaderMenuItems(),
            {
                defaultItems: defaultGroupHeaderMenuItems(),
                actions,
                context: {
                    groupId,
                    columnGroup: { groupId },
                    expandable: expandable !== false,
                    groupOpen: columnTree.isOpen(groupId),
                    hasColumnGroups: groupIds.length > 0,
                },
            },
        );
        popupMenus.showPopup({ x: clientX, y: clientY, items });
    }

    function openCellContextMenu(field, value, clientX, clientY) {
        if (options.suppressContextMenu) return;
        if (!field || field === SELECTION_COL_ID) return;
        const leaf = findLeafDef(field);
        const sortState = columnState.getSort();
        const context = {
            field,
            value,
            column: leaf,
            pin: columnState.getPin(field) ?? null,
            sort: sortState.colId === field ? sortState.sort : null,
            sortable: leaf?.sortable !== false,
            pinnable: leaf?.lockPinned !== true,
        };
        const raw =
            typeof leaf?.contextMenuItems !== "undefined"
                ? leaf.contextMenuItems
                : options.getContextMenuItems || defaultCellContextMenuItems();
        const items = resolveMenuItems(raw, {
            defaultItems: defaultCellContextMenuItems(),
            actions: columnMenuActions(field),
            context,
        });
        popupMenus.showPopup({ x: clientX, y: clientY, items });
        options.onCellContextMenu?.({
            api,
            field,
            value,
            type: "cellContextMenu",
        });
    }

    root.addEventListener("contextmenu", (e) => {
        if (e.ctrlKey && options.allowContextMenuWithControlKey !== true) {
            return;
        }
        const leafCell = e.target?.closest?.(".fg-shell__leaf-cell");
        if (leafCell?.dataset?.field) {
            e.preventDefault();
            openColumnHeaderMenu(leafCell.dataset.field, e.clientX, e.clientY);
            return;
        }
        const groupCell = e.target?.closest?.(".fg-shell__group-cell");
        if (groupCell?.dataset?.groupId) {
            e.preventDefault();
            openGroupHeaderMenu(
                groupCell.dataset.groupId,
                groupCell.dataset.expandable === "1",
                e.clientX,
                e.clientY,
            );
            return;
        }
        const td = e.target?.closest?.(".fg-shell__body-rt tbody td");
        if (td?.dataset?.field) {
            e.preventDefault();
            openCellContextMenu(
                td.dataset.field,
                td.textContent,
                e.clientX,
                e.clientY,
            );
        }
    });

    // Column selection via header leaf click (AG enableColumnSelection)
    header.el.addEventListener("click", (e) => {
        const opts = cellSelectionOpts;
        if (!opts?.enabled || !opts.enableColumnSelection) return;
        if (e.target?.closest?.("button,input,a,.fg-shell__resize")) return;
        const leaf = e.target?.closest?.(".fg-shell__leaf-cell");
        if (!leaf?.dataset?.field) return;
        const colId = leaf.dataset.field;
        if (colId === SELECTION_COL_ID || colId === AUTO_GROUP_COL_ID) return;
        cellSelection.selectColumn(colId, {
            rowCount: displayedRowNodes.length || 1,
            additive: !!(e.ctrlKey || e.metaKey),
        });
        body.refreshSelectionPaint?.();
    });

    function layoutOpts(fields) {
        return {
            widths: Object.fromEntries(
                fields.map((f) => [f, columnState.getWidth(f)]),
            ),
            pins: Object.fromEntries(
                fields.map((f) => [f, columnState.getPin(f)]),
            ),
        };
    }

    async function teardownEngineView() {
        const view = engineView;
        const cbId = viewUpdateCallbackId;
        engineView = null;
        viewUpdateCallbackId = null;
        engineViewKey = "";
        if (!view) return;
        try {
            if (cbId != null) await view.remove_update(cbId);
        } catch {
            /* ignore */
        }
        try {
            await view.delete();
        } catch {
            /* ignore */
        }
    }

    /**
     * Ensure Perspective View matches current sort/filter/columns, bind body.
     * @param {string[]} fields
     */
    async function ensureEngineView(fields) {
        const grouping = groupingForView();
        body.setGroupBy(grouping.groupBy);
        const viewConfig = toPerspectiveViewConfig(
            fields,
            columnState,
            grouping,
        );
        const key = JSON.stringify(viewConfig);

        if (engineView && key === engineViewKey) {
            await body.setEngineView(engineView, header.getLeafFields(), layoutOpts(header.getLeafFields()));
            return engineView;
        }

        viewGen += 1;
        const gen = viewGen;
        await teardownEngineView();

        const view = await options.table.view(viewConfig);
        if (gen !== viewGen) {
            try {
                await view.delete();
            } catch {
                /* superseded */
            }
            return engineView;
        }

        engineView = view;
        engineViewKey = key;

        // Apply AG groupDefaultExpanded when group_by_depth wasn't enough
        if (
            grouping.groupBy.length &&
            typeof grouping.groupByDepth === "number"
        ) {
            try {
                await view.set_depth(grouping.groupByDepth);
            } catch {
                /* older perspective */
            }
        }

        // Same contract as perspective-viewer → plugin.update(view):
        // on table data change, refresh num_rows + regular_table.draw().
        const maybeId = view.on_update(async () => {
            if (gen !== viewGen) return;
            clearTimeout(updateDebounce);
            updateDebounce = setTimeout(() => {
                if (gen !== viewGen) return;
                void enqueueTableOp(async () => {
                    if (gen !== viewGen || !engineView) return;
                    await body.onEngineUpdate();
                    await refreshTotalRowCount();
                    scheduleStatusBarRefresh();
                });
            }, TABLE_UPDATE_REDRAW_MS);
        });
        viewUpdateCallbackId =
            maybeId && typeof maybeId.then === "function"
                ? await maybeId
                : maybeId;

        const displayFields = header.getLeafFields();
        await body.setEngineView(
            engineView,
            displayFields,
            layoutOpts(displayFields),
        );
        return engineView;
    }

    async function refresh() {
        return enqueueTableOp(async () => {
            syncing = true;
            try {
                const cfg = getRowGroupConfig();
                syncAutoGroupColumnState(cfg);
                header.render();
                const displayFields = header.getLeafFields();
                const fields = viewFieldsFromDisplay(displayFields);

                if (typeof options.loadColumns === "function") {
                    const viewConfig = toPerspectiveViewConfig(
                        fields,
                        columnState,
                        groupingForView(),
                    );
                    const cols = await options.loadColumns(fields, viewConfig);
                    await body.setData(
                        displayFields,
                        cols,
                        layoutOpts(displayFields),
                    );
                } else if (options.table) {
                    await ensureEngineView(fields);
                } else {
                    const cols = applyColumnStateToData(
                        fields,
                        rowsToColumns(options.rowData || [], fields),
                        columnState,
                    );
                    await body.setData(
                        displayFields,
                        cols,
                        layoutOpts(displayFields),
                    );
                }

                header.setColumnWidths(
                    Object.fromEntries(
                        displayFields.map((f) => [
                            f,
                            columnState.getWidth(f),
                        ]),
                    ),
                );
                header.setScrollLeft(body.scrollLeft);
            } finally {
                syncing = false;
            }
        });
    }

    function rebuildTreeFromOptions() {
        columnTree = createColumnTree({
            columnDefs: options.columnDefs || [],
            defaultColDef: options.defaultColDef,
            defaultColGroupDef: options.defaultColGroupDef,
        });
        columnState.seedFromDefs(options.columnDefs || []);
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
                syncAutoGroupColumnState(getRowGroupConfig());
                body.setGroupBy(getRowGroupConfig().groupBy);
                void refresh();
                return;
            }
            if (
                key === "groupDefaultExpanded" ||
                key === "autoGroupColumnDef" ||
                key === "groupDisplayType" ||
                key === "groupHideColumns"
            ) {
                syncAutoGroupColumnState(getRowGroupConfig());
                body.setGroupBy(getRowGroupConfig().groupBy);
                void refresh();
                return;
            }
            if (key === "suppressGroupRowsSticky") {
                body.setSuppressGroupRowsSticky?.(!!value);
                return;
            }
            if (key === "groupTotalRow") {
                body.setGroupTotalRow?.(value);
                return;
            }
            if (key === "grandTotalRow") {
                body.setGrandTotalRow?.(value);
                return;
            }
            if (key === "rowSelection") {
                rowSelectionOpts = normalizeRowSelection(value);
                syncSelectionColumnState();
                void refresh();
                return;
            }
            if (key === "cellSelection" || key === "enableRangeSelection") {
                if (key === "enableRangeSelection") {
                    options.enableRangeSelection = value;
                    cellSelectionOpts = normalizeCellSelection(
                        options.cellSelection,
                        value,
                    );
                } else {
                    cellSelectionOpts = normalizeCellSelection(
                        value,
                        options.enableRangeSelection,
                    );
                }
                body.refreshSelectionPaint?.();
                return;
            }
            if (key === "theme") {
                theme = normalizeTheme(value);
                options.theme = theme;
                applyTheme(root, theme, themeMode);
                return;
            }
            if (key === "themeMode") {
                themeMode = value === "dark" ? "dark" : "light";
                options.themeMode = themeMode;
                setThemeMode(root, themeMode, theme);
                return;
            }
            if (key === "floatingFilter") {
                const el = root.querySelector(".fg-shell__filter-row");
                if (el) el.style.display = value === false ? "none" : "";
            }
            if (key === "statusBar") {
                statusBar.setConfig(value || null);
                scheduleStatusBarRefresh({ aggregation: true });
                return;
            }
            if (key === "rowData" || key === "loadColumns" || key === "table") {
                void refreshTotalRowCount().then(() => {
                    void refresh().then(() => scheduleStatusBarRefresh());
                });
                return;
            }
        },

        getGridOption(key) {
            return options[key];
        },

        getDisplayedRowCount() {
            return body.getDisplayedRowCount?.() ?? displayedRowNodes.length;
        },

        getStatusPanel(key) {
            return statusBar.getStatusPanel(key);
        },

        getColumnDefs() {
            return options.columnDefs;
        },

        getViewConfig() {
            return toPerspectiveViewConfig(
                viewFieldsFromDisplay(header.getLeafFields()),
                columnState,
                groupingForView(),
            );
        },

        getRowGroupColumns() {
            return getRowGroupConfig().groupBy.slice();
        },

        expandAll() {
            return body.expandAllGroups?.() ?? Promise.resolve();
        },

        collapseAll() {
            return body.collapseAllGroups?.() ?? Promise.resolve();
        },

        setColumnAggFunc(key, aggFunc) {
            const field = typeof key === "string" ? key : key?.field;
            if (!field) return;
            const patch = (nodes) =>
                (nodes || []).map((n) => {
                    if (Array.isArray(n?.children)) {
                        return { ...n, children: patch(n.children) };
                    }
                    if (leafField(n) === field) {
                        return { ...n, aggFunc };
                    }
                    return n;
                });
            options.columnDefs = patch(options.columnDefs || []);
            void refresh();
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
                groupId,
                opened: !!newValue,
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

        setColumnPinned(key, pinned) {
            const field = typeof key === "string" ? key : key?.field;
            if (!field) return;
            columnState.setPin(field, pinned || null);
            header.render();
            void refresh();
        },

        applyColumnState(stateItems = []) {
            let needsRefresh = false;
            let widthOnly = true;
            for (const item of stateItems) {
                const id = item.colId;
                if (!id) continue;
                if (item.width != null) columnState.setWidth(id, item.width);
                if ("pinned" in item) {
                    columnState.setPin(id, item.pinned || null);
                    widthOnly = false;
                    needsRefresh = true;
                }
                if ("sort" in item) {
                    columnState.setSort(id, item.sort || null);
                    widthOnly = false;
                    needsRefresh = true;
                }
            }
            header.render();
            if (widthOnly && !needsRefresh) {
                body.applyPinnedLayout?.(header.getLeafFields(), columnState);
                return;
            }
            void refresh();
        },

        getColumnState() {
            const fields = header.getLeafFields();
            const sort = columnState.getSort();
            return fields.map((colId) => ({
                colId,
                width: columnState.getWidth(colId),
                pinned: columnState.getPin(colId),
                sort: sort.colId === colId ? sort.sort : null,
            }));
        },

        getColumnTree() {
            return columnTree;
        },

        refreshCells() {
            return refresh();
        },

        getSelectedRows() {
            return rowSelection.getSelectedRows();
        },

        getSelectedNodes() {
            return rowSelection.getSelectedNodes();
        },

        setNodesSelected(params) {
            rowSelection.setNodesSelected(params || { nodes: [], newValue: false });
        },

        selectAll(mode) {
            rowSelection.selectAll(mode);
        },

        deselectAll(mode) {
            rowSelection.deselectAll(mode);
        },

        getCellRanges() {
            return cellSelection.getCellRanges();
        },

        addCellRange(range) {
            if (!range) return;
            // Internal shape already has startRow/endRow
            if (range.startRow) {
                cellSelection.addCellRange(range);
                return;
            }
            /** @type {string[]} */
            let cols = Array.isArray(range.columns) ? range.columns.slice() : [];
            if (
                !cols.length &&
                (range.columnStart != null || range.columnEnd != null)
            ) {
                const display = header.getLeafFields();
                const i0 = display.indexOf(
                    range.columnStart ?? range.columnEnd,
                );
                const i1 = display.indexOf(
                    range.columnEnd ?? range.columnStart,
                );
                if (i0 >= 0 && i1 >= 0) {
                    const lo = Math.min(i0, i1);
                    const hi = Math.max(i0, i1);
                    cols = display.slice(lo, hi + 1);
                }
            }
            cellSelection.addCellRange({
                startRow: { rowIndex: range.rowStartIndex ?? 0 },
                endRow: {
                    rowIndex: range.rowEndIndex ?? range.rowStartIndex ?? 0,
                },
                columns: cols,
            });
        },

        clearCellSelection() {
            cellSelection.clearCellSelection();
        },

        /** AG-style theme mode: `'light' | 'dark'`. */
        setThemeMode(mode) {
            themeMode = mode === "dark" ? "dark" : "light";
            options.themeMode = themeMode;
            setThemeMode(root, themeMode, theme);
        },

        getThemeMode() {
            return getThemeMode(root);
        },

        hidePopupMenu() {
            popupMenus.hidePopupMenu();
        },

        showColumnMenu(colKey) {
            const field =
                typeof colKey === "string" ? colKey : colKey?.field || colKey?.colId;
            if (!field) return;
            const leafEl = root.querySelector(
                `.fg-shell__leaf-cell[data-field="${CSS.escape(field)}"]`,
            );
            const rect = leafEl?.getBoundingClientRect?.();
            openColumnHeaderMenu(
                field,
                rect ? rect.left : 8,
                rect ? rect.bottom + 2 : 8,
            );
        },

        showContextMenu(params = {}) {
            const field = params.column?.field || params.field;
            const value = params.value;
            openCellContextMenu(
                field,
                value,
                params.x ?? 8,
                params.y ?? 8,
            );
        },

        async destroy() {
            popupMenus.hidePopupMenu();
            statusBar.destroy?.();
            clearTimeout(filterDebounce);
            clearTimeout(updateDebounce);
            clearTimeout(statusBarTimer);
            clearTimeout(statusBarAggTimer);
            viewGen += 1;
            header.destroy?.();
            await enqueueTableOp(async () => {
                await teardownEngineView();
            });
            root.remove();
        },
    });

    void refresh().then(() => {
        void refreshTotalRowCount().then(() => scheduleStatusBarRefresh());
        options.onGridReady?.({ api, type: "gridReady" });
    });

    return api;
}
