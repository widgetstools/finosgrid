// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Flatten nested JSON positions → flat records (dot-path columns)           ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

/**
 * @param {Record<string, any>} obj
 * @param {string} [prefix]
 * @param {Record<string, any>} [out]
 * @returns {Record<string, any>}
 */
export function flattenObject(obj, prefix = "", out = {}) {
    if (obj == null || typeof obj !== "object" || Array.isArray(obj)) {
        if (prefix) out[prefix] = obj;
        return out;
    }
    for (const [key, value] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (
            value != null &&
            typeof value === "object" &&
            !Array.isArray(value) &&
            !(value instanceof Date)
        ) {
            flattenObject(value, path, out);
        } else {
            out[path] = value;
        }
    }
    return out;
}

/**
 * @param {Record<string, any>} position
 * @returns {Record<string, any>}
 */
export function flattenPosition(position) {
    return flattenObject(position);
}

/**
 * @param {Record<string, any>[]} positions
 * @returns {Record<string, any>[]}
 */
export function flattenPositions(positions) {
    return (positions || []).map(flattenPosition);
}

/**
 * Column-oriented form for Perspective `table.update` when preferred.
 * @param {Record<string, any>[]} flatRows
 * @param {string[]} [columns]
 * @returns {Record<string, any[]>}
 */
export function flatRowsToColumns(flatRows, columns) {
    const cols = columns || [
        ...new Set(flatRows.flatMap((r) => Object.keys(r))),
    ];
    /** @type {Record<string, any[]>} */
    const out = {};
    for (const c of cols) out[c] = [];
    for (const row of flatRows) {
        for (const c of cols) out[c].push(row[c] ?? null);
    }
    return out;
}
