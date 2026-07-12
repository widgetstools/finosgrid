// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — header layout (group rows + visible leaves)                       ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import { isColGroupDef, visibleLeaves } from "./column_tree.js";

/**
 * @typedef {import('./column_tree.js').ColDef} ColDef
 * @typedef {import('./column_tree.js').ColGroupDef} ColGroupDef
 * @typedef {import('./column_tree.js').OpenState} OpenState
 *
 * @typedef {{ kind: 'group', group: ColGroupDef, span: number }} GroupSeg
 * @typedef {{ kind: 'pad', span: number, field?: string }} PadSeg
 * @typedef {GroupSeg|PadSeg} HeaderSeg
 */

/**
 * @param {ColGroupDef} group
 * @param {OpenState} openState
 * @returns {boolean}
 */
function groupIsOpen(group, openState) {
    const id = group.groupId;
    if (id && Object.prototype.hasOwnProperty.call(openState, id)) {
        return !!openState[id];
    }
    return group.openByDefault !== false;
}

/**
 * @param {ColDef|ColGroupDef} child
 * @param {boolean} parentOpen
 */
function childVisible(child, parentOpen) {
    const show = child.columnGroupShow ?? "always";
    if (show === "open") return parentOpen;
    if (show === "closed") return !parentOpen;
    return true;
}

/**
 * @param {Array<ColDef|ColGroupDef>} nodes
 * @param {OpenState} openState
 * @returns {number}
 */
export function maxGroupDepth(nodes) {
    let max = 0;
    for (const node of nodes || []) {
        if (!isColGroupDef(node)) continue;
        let childMax = 0;
        for (const c of node.children || []) {
            childMax = Math.max(childMax, maxGroupDepth([c]));
        }
        max = Math.max(max, 1 + childMax);
    }
    return max;
}

/**
 * @param {ColGroupDef} group
 * @param {OpenState} openState
 * @returns {number}
 */
export function countVisibleLeavesInGroup(group, openState) {
    const open = groupIsOpen(group, openState);
    let n = 0;
    for (const child of group.children || []) {
        if (!childVisible(child, open)) continue;
        if (isColGroupDef(child)) {
            n += countVisibleLeavesInGroup(child, openState);
        } else if (child?.field != null) {
            n += 1;
        }
    }
    return n;
}

/**
 * @param {Array<ColDef|ColGroupDef>} nodes
 * @param {OpenState} openState
 * @param {number} targetDepth
 * @param {number} depth
 * @returns {HeaderSeg[]}
 */
function walkRow(nodes, openState, targetDepth, depth) {
    /** @type {HeaderSeg[]} */
    const out = [];
    for (const node of nodes || []) {
        if (isColGroupDef(node)) {
            const span = countVisibleLeavesInGroup(node, openState);
            if (span === 0) continue;
            if (depth === targetDepth) {
                out.push({ kind: "group", group: node, span });
            } else {
                const open = groupIsOpen(node, openState);
                const kids = (node.children || []).filter((c) =>
                    childVisible(c, open),
                );
                out.push(...walkRow(kids, openState, targetDepth, depth + 1));
            }
        } else if (node?.field != null) {
            out.push({ kind: "pad", span: 1, field: node.field });
        }
    }
    return out;
}

/**
 * Full header layout for the current open state.
 *
 * @param {Array<ColDef|ColGroupDef>} defs
 * @param {OpenState} [openState]
 */
export function computeHeaderLayout(defs, openState = {}) {
    const leaves = visibleLeaves(defs, openState);
    const depth = maxGroupDepth(defs);
    /** @type {HeaderSeg[][]} */
    const groupRows = [];
    for (let d = 0; d < depth; d++) {
        groupRows.push(walkRow(defs, openState, d, 0));
    }
    return { leaves, groupRows, depth };
}
