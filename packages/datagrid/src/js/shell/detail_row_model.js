// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — hybrid row model: Perspective group_by + filtered leaf detail     ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

/**
 * AG-like expand-to-detail:
 * - Upper levels: Perspective `group_by` tree (`expand` / `collapse`)
 * - Finest group keys: shell toggles detail; leaf rows come from a separate
 *   Perspective `table.view({ filter: pathEquals, columns })` (no group_by)
 *
 * @typedef {{ kind: 'group', groupY: number, path: any[] }} GroupVirtualRow
 * @typedef {{ kind: 'detail', path: any[], pathKey: string, detailY: number }} DetailVirtualRow
 * @typedef {GroupVirtualRow|DetailVirtualRow} VirtualRow
 */

/**
 * @param {any[]|null|undefined} path
 */
export function pathKey(path) {
    return JSON.stringify(path || []);
}

/**
 * @param {string} key
 * @returns {any[]}
 */
export function pathFromKey(key) {
    try {
        const p = JSON.parse(key);
        return Array.isArray(p) ? p : [];
    } catch {
        return [];
    }
}

/**
 * Perspective tree expand (not yet at finest group key).
 * @param {any[]|null|undefined} path
 * @param {number} groupByLen
 */
export function isTreeExpandable(path, groupByLen) {
    const len = path?.length ?? 0;
    return groupByLen > 0 && len < groupByLen;
}

/**
 * Finest group key — can expand to Perspective-filtered detail leaves.
 * @param {any[]|null|undefined} path
 * @param {number} groupByLen
 */
export function isDetailExpandable(path, groupByLen) {
    const len = path?.length ?? 0;
    return groupByLen > 0 && len === groupByLen;
}

/**
 * AG sticky group rows: which group rows should pin above the viewport while
 * scrolling leaf/detail (or nested) content.
 *
 * A group sticks when its virtual index is strictly above `firstVisibleY` and
 * it is an ancestor of (or the group owning) the row at `firstVisibleY`.
 *
 * @param {VirtualRow[]} rowMap
 * @param {number} firstVisibleY
 * @returns {{ virtualY: number, groupY: number, path: any[] }[]}
 */
export function computeStickyGroupEntries(rowMap, firstVisibleY) {
    if (
        !rowMap?.length ||
        firstVisibleY == null ||
        firstVisibleY <= 0 ||
        firstVisibleY >= rowMap.length
    ) {
        return [];
    }
    const vrow = rowMap[firstVisibleY];
    if (!vrow) return [];

    const targetPath = vrow.path || [];
    /** @type {any[][]} */
    const want = [[]];
    for (let i = 1; i <= targetPath.length; i++) {
        want.push(targetPath.slice(0, i));
    }

    /** @type {Map<string, { virtualY: number, groupY: number, path: any[] }>} */
    const byKey = new Map();
    for (let y = 0; y < rowMap.length; y++) {
        const r = rowMap[y];
        if (r.kind !== "group") continue;
        byKey.set(pathKey(r.path), {
            virtualY: y,
            groupY: r.groupY,
            path: r.path,
        });
    }

    /** @type {{ virtualY: number, groupY: number, path: any[] }[]} */
    const sticky = [];
    for (const p of want) {
        const hit = byKey.get(pathKey(p));
        if (hit && hit.virtualY < firstVisibleY) {
            sticky.push(hit);
        }
    }
    return sticky;
}

/**
 * Split sticky entries the way AG Grid does with `groupTotalRow` /
 * `grandTotalRow` placement (`'top'` | `'bottom'`).
 *
 * - Group *headers* always pin to the sticky top stack.
 * - Group *totals* pin to top or bottom per `groupTotalRow`.
 * - Grand total (`path []`) pins per `grandTotalRow`.
 *
 * @param {{ virtualY: number, groupY: number, path: any[] }[]} entries
 * @param {{ groupTotalRow?: 'top'|'bottom'|null, grandTotalRow?: 'top'|'bottom'|null }} [opts]
 * @returns {{ top: { virtualY: number, groupY: number, path: any[], stickyKind: 'header'|'total' }[], bottom: { virtualY: number, groupY: number, path: any[], stickyKind: 'header'|'total' }[] }}
 */
export function splitStickyTopAndBottom(entries, opts = {}) {
    const groupTotalRow =
        opts.groupTotalRow === undefined ? "bottom" : opts.groupTotalRow;
    const grandTotalRow =
        opts.grandTotalRow === undefined ? "bottom" : opts.grandTotalRow;

    const groups = (entries || []).filter((e) => (e.path?.length ?? 0) > 0);
    const grand = (entries || []).filter((e) => (e.path?.length ?? 0) === 0);

    /** @type {{ virtualY: number, groupY: number, path: any[], stickyKind: 'header'|'total' }[]} */
    const top = [];
    /** @type {{ virtualY: number, groupY: number, path: any[], stickyKind: 'header'|'total' }[]} */
    const bottom = [];

    // Headers: parent above child
    const headers = groups
        .slice()
        .sort((a, b) => (a.path?.length ?? 0) - (b.path?.length ?? 0))
        .map((e) => ({ ...e, stickyKind: /** @type {const} */ ("header") }));
    top.push(...headers);

    if (groupTotalRow === "top") {
        // Totals under headers on the top stack; parent above child
        const totals = groups
            .slice()
            .sort((a, b) => (a.path?.length ?? 0) - (b.path?.length ?? 0))
            .map((e) => ({ ...e, stickyKind: /** @type {const} */ ("total") }));
        top.push(...totals);
    } else if (groupTotalRow === "bottom") {
        // Deepest subgroup total first, then parents
        const totals = groups
            .slice()
            .sort((a, b) => (b.path?.length ?? 0) - (a.path?.length ?? 0))
            .map((e) => ({ ...e, stickyKind: /** @type {const} */ ("total") }));
        bottom.push(...totals);
    }

    if (grandTotalRow === "top") {
        top.unshift(
            ...grand.map((e) => ({
                ...e,
                stickyKind: /** @type {const} */ ("total"),
            })),
        );
    } else if (grandTotalRow === "bottom") {
        bottom.push(
            ...grand.map((e) => ({
                ...e,
                stickyKind: /** @type {const} */ ("total"),
            })),
        );
    }

    return { top, bottom };
}

/**
 * AG-style total label for sticky bottom footers.
 * @param {any[]} path
 */
export function stickyTotalLabel(path) {
    if (!path || !path.length) return "Total";
    return `Total ${String(path[path.length - 1] ?? "")}`;
}

/**
 * @param {any[][]} groupPaths - `__ROW_PATH__` for every group-view row
 * @param {Map<string, number>} detailCounts - pathKey → detail row count
 * @param {number} groupByLen
 * @returns {VirtualRow[]}
 */
export function buildVirtualRowMap(groupPaths, detailCounts, groupByLen) {
    /** @type {VirtualRow[]} */
    const rows = [];
    for (let groupY = 0; groupY < (groupPaths || []).length; groupY++) {
        const path = groupPaths[groupY] || [];
        rows.push({ kind: "group", groupY, path });
        if (!isDetailExpandable(path, groupByLen)) continue;
        const key = pathKey(path);
        const n = detailCounts.get(key) || 0;
        if (n <= 0) continue;
        for (let detailY = 0; detailY < n; detailY++) {
            rows.push({ kind: "detail", path, pathKey: key, detailY });
        }
    }
    return rows;
}

/**
 * Build Perspective filter equating each group_by column to the path value.
 * @param {string[]} groupBy
 * @param {any[]} path
 * @param {Array<[string, string, any]>} [baseFilter]
 */
export function detailFilterForPath(groupBy, path, baseFilter = []) {
    /** @type {Array<[string, string, any]>} */
    const out = [...(baseFilter || [])];
    for (let i = 0; i < groupBy.length; i++) {
        out.push([groupBy[i], "==", path[i]]);
    }
    return out;
}

/**
 * @param {object} options
 * @param {() => any} options.getTable - Perspective table
 * @param {() => string[]} options.getGroupBy
 * @param {() => string[]} options.getViewFields - value columns (no auto-group)
 * @param {() => Array<[string, string]>} [options.getSort]
 * @param {() => Array<[string, string, any]>} [options.getFilter]
 */
export function createDetailRowModel({
    getTable,
    getGroupBy,
    getViewFields,
    getSort = () => [],
    getFilter = () => [],
} = {}) {
    /** @type {Set<string>} */
    const detailExpanded = new Set();
    /** @type {Map<string, { view: any, numRows: number, path: any[] }>} */
    const detailCache = new Map();
    /** @type {any[]} */
    let groupPaths = [];
    /** @type {VirtualRow[]} */
    let rowMap = [];
    let mapGen = 0;

    async function deleteDetail(key) {
        const entry = detailCache.get(key);
        detailCache.delete(key);
        if (!entry?.view) return;
        try {
            await entry.view.delete();
        } catch {
            /* already deleted */
        }
    }

    async function ensureDetail(path) {
        const key = pathKey(path);
        const existing = detailCache.get(key);
        if (existing) return existing;
        const table = getTable?.();
        if (!table?.view) {
            return { view: null, numRows: 0, path };
        }
        const groupBy = getGroupBy() || [];
        const view = await table.view({
            columns: getViewFields() || [],
            sort: getSort() || [],
            filter: detailFilterForPath(groupBy, path, getFilter() || []),
        });
        let numRows = 0;
        try {
            numRows = await view.num_rows();
        } catch {
            numRows = 0;
        }
        const entry = { view, numRows, path };
        detailCache.set(key, entry);
        return entry;
    }

    /**
     * Reload group paths from the grouped Perspective view and rebuild the
     * virtual row map (group rows + inserted detail leaves).
     * @param {any} groupView
     */
    async function rebuild(groupView) {
        const gen = ++mapGen;
        const groupBy = getGroupBy() || [];
        if (!groupView || !groupBy.length) {
            groupPaths = [];
            rowMap = [];
            for (const key of [...detailCache.keys()]) await deleteDetail(key);
            detailExpanded.clear();
            return rowMap;
        }

        let n = 0;
        try {
            n = await groupView.num_rows();
        } catch {
            n = 0;
        }
        /** @type {any[]} */
        let paths = [];
        if (n > 0) {
            try {
                const cols = await groupView.to_columns({
                    start_row: 0,
                    end_row: n,
                    start_col: 0,
                    end_col: 1,
                });
                paths = cols.__ROW_PATH__ || [];
            } catch {
                paths = [];
            }
        }
        if (gen !== mapGen) return rowMap;
        groupPaths = paths;

        // Drop detail caches that are collapsed or no longer visible
        const visibleLeafKeys = new Set();
        for (const path of groupPaths) {
            if (isDetailExpandable(path, groupBy.length)) {
                visibleLeafKeys.add(pathKey(path));
            }
        }
        for (const key of [...detailCache.keys()]) {
            if (!detailExpanded.has(key) || !visibleLeafKeys.has(key)) {
                await deleteDetail(key);
            }
        }

        /** @type {Map<string, number>} */
        const counts = new Map();
        for (const key of detailExpanded) {
            if (!visibleLeafKeys.has(key)) continue;
            const path = pathFromKey(key);
            const entry = await ensureDetail(path);
            if (gen !== mapGen) return rowMap;
            counts.set(key, entry.numRows || 0);
        }

        rowMap = buildVirtualRowMap(groupPaths, counts, groupBy.length);
        return rowMap;
    }

    /**
     * Toggle detail leaves under a finest-level group path.
     * @param {any[]} path
     * @returns {Promise<boolean>} new expanded state
     */
    async function toggleDetail(path) {
        const key = pathKey(path);
        if (detailExpanded.has(key)) {
            detailExpanded.delete(key);
            await deleteDetail(key);
            return false;
        }
        detailExpanded.add(key);
        await ensureDetail(path);
        return true;
    }

    function isDetailOpen(path) {
        return detailExpanded.has(pathKey(path));
    }

    /**
     * Fetch column data for a virtual row window.
     * @param {any} groupView
     * @param {number} y0
     * @param {number} y1
     * @param {string[]} fields - display fields including auto-group id if present
     * @param {string} autoGroupColId
     */
    async function fetchWindow(
        groupView,
        y0,
        y1,
        fields,
        autoGroupColId = "ag-Grid-AutoColumn",
    ) {
        const slice = rowMap.slice(y0, Math.min(y1, rowMap.length));
        const height = slice.length;
        /** @type {Record<string, any[]>} */
        const out = {};
        for (const f of fields) out[f] = Array(height).fill(null);

        if (!height) {
            return { columns: out, paths: [], num_rows: rowMap.length };
        }

        const viewFields = (fields || []).filter((f) => f !== autoGroupColId);
        /** @type {any[]} */
        const pathsOut = Array(height).fill(null);

        // --- batch group rows ---
        const groupIndices = [];
        for (let i = 0; i < slice.length; i++) {
            if (slice[i].kind === "group") groupIndices.push(i);
        }
        if (groupIndices.length && groupView) {
            const groupYs = groupIndices.map((i) => slice[i].groupY);
            const g0 = Math.min(...groupYs);
            const g1 = Math.max(...groupYs) + 1;
            let start_col = 0;
            let end_col = Math.max(1, viewFields.length);
            if (viewFields.length) {
                // fetch all view fields from col 0 — simpler than sparse
                end_col = viewFields.length;
            }
            try {
                const cols = await groupView.to_columns({
                    start_row: g0,
                    end_row: g1,
                    start_col,
                    end_col,
                });
                for (const i of groupIndices) {
                    const local = slice[i].groupY - g0;
                    pathsOut[i] = cols.__ROW_PATH__?.[local] ?? slice[i].path;
                    if (autoGroupColId in out) {
                        out[autoGroupColId][i] = pathsOut[i];
                    }
                    for (const f of viewFields) {
                        out[f][i] = cols[f]?.[local] ?? null;
                    }
                }
            } catch {
                for (const i of groupIndices) {
                    pathsOut[i] = slice[i].path;
                }
            }
        }

        // --- batch detail rows by pathKey ---
        /** @type {Map<string, number[]>} */
        const byKey = new Map();
        for (let i = 0; i < slice.length; i++) {
            if (slice[i].kind !== "detail") continue;
            const key = slice[i].pathKey;
            if (!byKey.has(key)) byKey.set(key, []);
            byKey.get(key).push(i);
        }
        for (const [key, indices] of byKey) {
            let entry = detailCache.get(key);
            if (!entry) {
                entry = await ensureDetail(pathFromKey(key));
            }
            if (!entry?.view) continue;
            const detailYs = indices.map((i) => slice[i].detailY);
            const d0 = Math.min(...detailYs);
            const d1 = Math.max(...detailYs) + 1;
            try {
                const cols = await entry.view.to_columns({
                    start_row: d0,
                    end_row: d1,
                    start_col: 0,
                    end_col: Math.max(1, viewFields.length),
                });
                for (const i of indices) {
                    const local = slice[i].detailY - d0;
                    pathsOut[i] = slice[i].path; // parent path for indent
                    if (autoGroupColId in out) {
                        out[autoGroupColId][i] = null; // leaf: blank group cell
                    }
                    for (const f of viewFields) {
                        out[f][i] = cols[f]?.[local] ?? null;
                    }
                }
            } catch {
                /* mid-replace */
            }
        }

        return {
            columns: out,
            paths: pathsOut,
            num_rows: rowMap.length,
            slice,
        };
    }

    async function clear() {
        mapGen += 1;
        groupPaths = [];
        rowMap = [];
        detailExpanded.clear();
        for (const key of [...detailCache.keys()]) await deleteDetail(key);
    }

    return {
        rebuild,
        toggleDetail,
        isDetailOpen,
        fetchWindow,
        clear,
        get rowMap() {
            return rowMap;
        },
        get numRows() {
            return rowMap.length;
        },
        getVirtualRow(y) {
            return rowMap[y] || null;
        },
    };
}
