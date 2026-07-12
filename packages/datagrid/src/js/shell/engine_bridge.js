// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — map AG column chrome state → Perspective View config              ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

/**
 * @typedef {import('./column_state.js').createColumnState} CreateColumnState
 * @typedef {ReturnType<CreateColumnState>} ColumnState
 */

/**
 * Perspective `sort` terms from shell column state.
 * @param {ColumnState} state
 * @returns {Array<[string, string]>}
 */
export function toPerspectiveSort(state) {
    const { colId, sort } = state.getSort();
    if (!colId || !sort) return [];
    // Perspective: "asc" | "desc" | "asc abs" | "desc abs" | col variants
    return [[colId, sort]];
}

/**
 * Perspective `filter` clauses from floating-filter text state.
 * Uses `contains` (string) — same default as AG chrome floating filters.
 * @param {ColumnState} state
 * @returns {Array<[string, string, string]>}
 */
export function toPerspectiveFilter(state) {
    /** @type {Array<[string, string, string]>} */
    const out = [];
    for (const [column, value] of Object.entries(state.getFilterModel())) {
        if (value == null || value === "") continue;
        out.push([column, "contains", String(value)]);
    }
    return out;
}

/**
 * Full ViewConfig fragment for columns + sort + filter (+ optional group/agg).
 *
 * Policy: Perspective applies `filter` then aggregates under `group_by`
 * (filter-then-aggregate). Custom AG filter-agg interaction modes are not
 * mirrored.
 *
 * @param {string[]} fields - view value columns (exclude synthetic auto-group id)
 * @param {ColumnState} state
 * @param {object} [grouping]
 * @param {string[]} [grouping.groupBy]
 * @param {Record<string, string>} [grouping.aggregates]
 * @param {number} [grouping.groupByDepth]
 * @returns {{
 *   columns: string[],
 *   sort: Array<[string, string]>,
 *   filter: Array<[string, string, string]>,
 *   group_by?: string[],
 *   aggregates?: Record<string, string>,
 *   group_by_depth?: number,
 * }}
 */
export function toPerspectiveViewConfig(fields, state, grouping = {}) {
    const groupBy = grouping.groupBy || [];
    const aggregates = grouping.aggregates || {};
    /** @type {Record<string, any>} */
    const config = {
        columns: fields.slice(),
        sort: toPerspectiveSort(state),
        filter: toPerspectiveFilter(state),
    };

    if (groupBy.length) {
        config.group_by = groupBy.slice();
        if (Object.keys(aggregates).length) {
            config.aggregates = { ...aggregates };
        }
        if (
            typeof grouping.groupByDepth === "number" &&
            grouping.groupByDepth >= 0
        ) {
            config.group_by_depth = grouping.groupByDepth;
        }
    }

    return config;
}
