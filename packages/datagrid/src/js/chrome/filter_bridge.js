// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Copyright (c) 2017, the Perspective Authors.                              ┃
// ┃ AG Chrome Phase 1 — merge chrome filter state into View filter           ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

/**
 * Convert chrome filter state into Perspective filter clauses.
 * @param {import('./types.js').ChromeFilterState} state
 * @returns {Array} Perspective filter array entries
 */
export function toPerspectiveFilters(state) {
    const out = [];
    for (const [column, clause] of Object.entries(state || {})) {
        if (!clause || clause.value === undefined || clause.value === null) {
            continue;
        }
        if (clause.kind === "set") {
            const values = Array.isArray(clause.value) ? clause.value : [];
            if (values.length === 0) {
                continue;
            }
            out.push([column, "in", values]);
            continue;
        }
        // floating
        if (clause.value === "" || clause.value === undefined) {
            continue;
        }
        out.push([column, clause.op || "contains", clause.value]);
    }
    return out;
}

/**
 * True if a Perspective filter clause is owned by chrome for a managed column.
 * @param {Array} clause
 * @param {import('./types.js').ChromeFilterState} chromeState
 */
export function isChromeManagedClause(clause, chromeState) {
    if (!Array.isArray(clause) || clause.length < 2) {
        return false;
    }
    const column = clause[0];
    const managed = chromeState?.[column];
    if (!managed) {
        return false;
    }
    const op = clause[1];
    if (managed.kind === "set") {
        return op === "in";
    }
    // floating: treat any clause on this column as chrome-owned when we have floating state
    return managed.kind === "floating";
}

/**
 * Rebuild View filter: keep non-chrome clauses, append chrome-derived clauses.
 * For columns present in chromeState, drop prior clauses on that column so we
 * do not duplicate when re-applying.
 *
 * @param {Array} existingFilter
 * @param {import('./types.js').ChromeFilterState} chromeState
 * @returns {Array}
 */
export function mergeFilters(existingFilter, chromeState) {
    const managedColumns = new Set(Object.keys(chromeState || {}));
    const preserved = (existingFilter || []).filter((clause) => {
        if (!Array.isArray(clause) || clause.length < 1) {
            return true;
        }
        // Drop any clause for a chrome-managed column; chrome will re-emit.
        if (managedColumns.has(clause[0])) {
            return false;
        }
        return true;
    });
    return preserved.concat(toPerspectiveFilters(chromeState));
}
