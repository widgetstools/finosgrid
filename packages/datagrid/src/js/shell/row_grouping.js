// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — AG row grouping / aggregation → Perspective group_by/aggregates ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import { isColGroupDef, leafField } from "./column_tree.js";

/** AG auto-group column id (singleColumn display). */
export const AUTO_GROUP_COL_ID = "ag-Grid-AutoColumn";

/**
 * Map AG `aggFunc` names → Perspective aggregate strings.
 * @see https://perspective.finos.org/ (ViewConfig aggregates)
 */
const AG_TO_PSP_AGG = {
    sum: "sum",
    min: "min",
    max: "max",
    count: "count",
    avg: "avg",
    average: "avg",
    mean: "avg",
    first: "first",
    last: "last",
    // Perspective extras often used in chrome
    high: "high",
    low: "low",
    "distinct count": "distinct count",
    unique: "unique",
};

/**
 * @param {string|function|null|undefined} aggFunc
 * @returns {string|null}
 */
export function mapAggFuncToPerspective(aggFunc) {
    if (aggFunc == null || aggFunc === false) return null;
    if (typeof aggFunc === "function") {
        // Custom JS aggs are not executable inside Perspective WASM — skip
        return null;
    }
    const key = String(aggFunc).trim().toLowerCase();
    return AG_TO_PSP_AGG[key] || AG_TO_PSP_AGG[String(aggFunc)] || String(aggFunc);
}

/**
 * @param {Array<import('./ag_types.js').ColDef|import('./ag_types.js').ColGroupDef>} defs
 * @param {(node: any) => void} visitLeaf
 */
function walkLeaves(defs, visitLeaf) {
    for (const node of defs || []) {
        if (isColGroupDef(node)) walkLeaves(node.children, visitLeaf);
        else visitLeaf(node);
    }
}

/**
 * Extract AG row-group dimensions + value aggregations from columnDefs.
 *
 * @param {object} [options]
 * @param {Array<*>} [options.columnDefs]
 * @param {number} [options.groupDefaultExpanded] AG: 0 none, 1 first level, -1 all
 * @param {import('./ag_types.js').ColDef} [options.autoGroupColumnDef]
 * @param {'singleColumn'|'multipleColumns'|'groupRows'|'custom'} [options.groupDisplayType]
 * @returns {{
 *   groupBy: string[],
 *   aggregates: Record<string, string>,
 *   hiddenGroupFields: Set<string>,
 *   groupByDepth: number|undefined,
 *   autoGroupColumnDef: object,
 *   groupDisplayType: string,
 *   enabled: boolean,
 * }}
 */
export function extractRowGroupConfig({
    columnDefs = [],
    groupDefaultExpanded = 0,
    autoGroupColumnDef = {},
    groupDisplayType = "singleColumn",
} = {}) {
    /** @type {{ field: string, index: number|null, hide: boolean }[]} */
    const groupDims = [];
    /** @type {Record<string, string>} */
    const aggregates = {};

    walkLeaves(columnDefs, (leaf) => {
        const field = leafField(leaf);
        if (!field) return;

        if (leaf.rowGroup === true || leaf.rowGroupIndex != null) {
            groupDims.push({
                field,
                index:
                    typeof leaf.rowGroupIndex === "number"
                        ? leaf.rowGroupIndex
                        : null,
                hide: leaf.hide === true,
            });
        }

        const pspAgg = mapAggFuncToPerspective(leaf.aggFunc);
        if (pspAgg) {
            aggregates[field] = pspAgg;
        }
    });

    groupDims.sort((a, b) => {
        if (a.index != null && b.index != null) return a.index - b.index;
        if (a.index != null) return -1;
        if (b.index != null) return 1;
        return 0;
    });

    // Stable unique by field (first wins after sort)
    const seen = new Set();
    /** @type {string[]} */
    const groupBy = [];
    /** @type {Set<string>} */
    const hiddenGroupFields = new Set();
    for (const g of groupDims) {
        if (seen.has(g.field)) continue;
        seen.add(g.field);
        groupBy.push(g.field);
        if (g.hide) hiddenGroupFields.add(g.field);
    }

    let groupByDepth;
    if (groupBy.length) {
        if (groupDefaultExpanded < 0) {
            groupByDepth = groupBy.length;
        } else {
            groupByDepth = groupDefaultExpanded;
        }
    }

    return {
        groupBy,
        aggregates,
        hiddenGroupFields,
        groupByDepth,
        autoGroupColumnDef: {
            headerName: "Group",
            width: 220,
            pinned: "left",
            suppressMovable: true,
            sortable: false,
            filter: false,
            floatingFilter: false,
            resizable: true,
            ...autoGroupColumnDef,
            field: AUTO_GROUP_COL_ID,
            colId: AUTO_GROUP_COL_ID,
        },
        groupDisplayType,
        enabled: groupBy.length > 0,
    };
}

/**
 * Visible leaf fields for the body/header, applying `hide` and optional
 * suppression of row-group dimension columns.
 *
 * @param {import('./ag_types.js').ColDef[]} leaves
 * @param {{ hiddenGroupFields?: Set<string>, hideGroupedColumns?: boolean, groupBy?: string[] }} [opts]
 */
export function filterDisplayLeaves(
    leaves,
    { hiddenGroupFields = new Set(), hideGroupedColumns = false, groupBy = [] } = {},
) {
    const groupSet = new Set(groupBy);
    return (leaves || []).filter((leaf) => {
        if (leaf?.hide === true) return false;
        const f = leafField(leaf);
        if (!f) return false;
        if (hiddenGroupFields.has(f)) return false;
        if (hideGroupedColumns && groupSet.has(f)) return false;
        return true;
    });
}

/**
 * Format Perspective `__ROW_PATH__` cell for AG-like auto-group column.
 * @param {any[]|null|undefined} path
 */
export function formatRowPathLabel(path) {
    if (!path || !path.length) return "Total";
    return String(path[path.length - 1] ?? "");
}

/**
 * Tree level expandable (Perspective expand/collapse).
 * @param {any[]|null|undefined} path
 * @param {number} groupByLen
 * @param {{ allowDetailLeaves?: boolean }} [opts]
 */
export function isRowPathExpandable(path, groupByLen, opts = {}) {
    const len = path?.length ?? 0;
    if (groupByLen <= 0) return false;
    if (len < groupByLen) return true;
    // Finest group key can expand to Perspective-filtered detail leaves
    if (opts.allowDetailLeaves && len === groupByLen) return true;
    return false;
}
