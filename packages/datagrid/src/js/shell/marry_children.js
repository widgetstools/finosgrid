// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — AG ColGroupDef.marryChildren move constraints                     ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import { isColGroupDef, leafField } from "./column_tree.js";

/**
 * @typedef {import('./ag_types.js').ColDef} ColDef
 * @typedef {import('./ag_types.js').ColGroupDef} ColGroupDef
 */

/**
 * All structural leaf fields under a group (ignores columnGroupShow / open).
 * @param {ColGroupDef} group
 * @returns {string[]}
 */
export function structuralLeavesOfGroup(group) {
    /** @type {string[]} */
    const out = [];
    function walk(nodes) {
        for (const n of nodes || []) {
            if (isColGroupDef(n)) walk(n.children);
            else {
                const f = leafField(n);
                if (f) out.push(f);
            }
        }
    }
    walk(group.children);
    return out;
}

/**
 * @param {Array<ColDef|ColGroupDef>} defs
 * @returns {ColGroupDef[]}
 */
export function collectMarriedGroups(defs) {
    /** @type {ColGroupDef[]} */
    const out = [];
    function walk(nodes) {
        for (const n of nodes || []) {
            if (!isColGroupDef(n)) continue;
            if (n.marryChildren === true) out.push(n);
            walk(n.children);
        }
    }
    walk(defs);
    return out;
}

/**
 * @param {string[]} order
 * @param {string[]} marriedFields
 */
function fieldsAreContiguous(order, marriedFields) {
    if (marriedFields.length <= 1) return true;
    const set = new Set(marriedFields);
    const indices = order
        .map((f, i) => (set.has(f) ? i : -1))
        .filter((i) => i >= 0);
    if (indices.length <= 1) return true;
    for (let k = 1; k < indices.length; k++) {
        if (indices[k] !== indices[k - 1] + 1) return false;
    }
    return true;
}

/**
 * Simulate moving `field` before `beforeField` in `order`.
 * @param {string[]} order
 * @param {string} field
 * @param {string|null|undefined} beforeField
 */
export function simulateMoveOrder(order, field, beforeField) {
    const next = order.filter((f) => f !== field);
    if (!beforeField) {
        next.push(field);
    } else {
        const i = next.indexOf(beforeField);
        if (i < 0) next.push(field);
        else next.splice(i, 0, field);
    }
    return next;
}

/**
 * AG marryChildren: reject moves that would split a married group or insert
 * an outsider into the middle of one.
 *
 * @param {object} opts
 * @param {Array<ColDef|ColGroupDef>} opts.defs
 * @param {string[]} opts.order - current full column order (all known fields)
 * @param {string} opts.field - column being moved
 * @param {string|null|undefined} opts.beforeField - drop target (insert before)
 */
export function canMoveColumnWithMarryChildren({
    defs,
    order,
    field,
    beforeField,
}) {
    const married = collectMarriedGroups(defs);
    if (!married.length) return true;
    const next = simulateMoveOrder(order, field, beforeField);
    for (const group of married) {
        const leaves = structuralLeavesOfGroup(group);
        if (!fieldsAreContiguous(next, leaves)) return false;
    }
    return true;
}
