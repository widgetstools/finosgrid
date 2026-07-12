// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — header layout (group rows + visible leaves)                       ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import { isColGroupDef, leafField, visibleLeaves } from "./column_tree.js";

/**
 * @typedef {import('./column_tree.js').ColDef} ColDef
 * @typedef {import('./column_tree.js').ColGroupDef} ColGroupDef
 * @typedef {import('./column_tree.js').OpenState} OpenState
 *
 * @typedef {{ kind: 'group', group: ColGroupDef, span: number, pin?: 'left'|'right'|null }} GroupSeg
 * @typedef {{ kind: 'pad', span: number, field?: string, pin?: 'left'|'right'|null }} PadSeg
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
    // AG ColGroupDef.openByDefault @default false
    return group.openByDefault === true;
}

/**
 * @param {ColDef|ColGroupDef} child
 * @param {boolean} parentOpen
 */
function childVisible(child, parentOpen) {
    // AG: omit columnGroupShow ⇒ always shown
    const show = child.columnGroupShow;
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
        } else if (leafField(child)) {
            n += 1;
        }
    }
    return n;
}

/**
 * Count visible leaves under `group` if the group's own open flag were
 * forced to `parentOpen` (nested groups still use `openState`).
 *
 * @param {ColGroupDef} group
 * @param {boolean} parentOpen
 * @param {OpenState} openState
 */
function countLeavesWithForcedOpen(group, parentOpen, openState) {
    let n = 0;
    for (const child of group.children || []) {
        if (!childVisible(child, parentOpen)) continue;
        if (isColGroupDef(child)) {
            n += countVisibleLeavesInGroup(child, openState);
        } else if (leafField(child)) {
            n += 1;
        }
    }
    return n;
}

/**
 * AG `columnGroup.isExpandable()` — expand UI only when some children use
 * `columnGroupShow` open/closed and the group stays non-empty in both states.
 *
 * @param {ColGroupDef} group
 * @param {OpenState} [openState]
 */
export function isGroupExpandable(group, openState = {}) {
    if (!isColGroupDef(group)) return false;
    const kids = group.children || [];
    const hasPolicy = kids.some(
        (c) => c?.columnGroupShow === "open" || c?.columnGroupShow === "closed",
    );
    if (!hasPolicy) return false;
    const whenOpen = countLeavesWithForcedOpen(group, true, openState);
    const whenClosed = countLeavesWithForcedOpen(group, false, openState);
    return whenOpen > 0 && whenClosed > 0;
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
        } else if (node?.field != null || node?.colId != null) {
            out.push({ kind: "pad", span: 1, field: leafField(node) });
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

/**
 * Ancestor group path (root → leaf) for a field.
 * @param {Array<ColDef|ColGroupDef>} defs
 * @param {string} field
 * @param {OpenState} [openState]
 * @returns {ColGroupDef[]}
 */
export function groupPathToField(defs, field, openState = {}) {
    /** @type {ColGroupDef[]} */
    let found = [];

    /**
     * @param {Array<ColDef|ColGroupDef>} nodes
     * @param {boolean} parentOpen
     * @param {ColGroupDef[]} trail
     */
    function walk(nodes, parentOpen, trail) {
        for (const node of nodes || []) {
            if (!childVisible(node, parentOpen)) continue;
            if (isColGroupDef(node)) {
                const open = groupIsOpen(node, openState);
                if (walk(node.children || [], open, [...trail, node])) {
                    return true;
                }
            } else if (node?.field === field || node?.colId === field) {
                found = trail;
                return true;
            }
        }
        return false;
    }

    walk(defs, true, []);
    return found;
}

/**
 * Rebuild group header segments so they match an arbitrary leaf order
 * (after pin / drag reorder). Consecutive leaves that share the same group
 * at depth `d` collapse into one spanned cell.
 *
 * AG: pinned columns break groups — a pin-region change between consecutive
 * leaves starts a new segment even when the group identity matches.
 *
 * @param {ColDef[]} orderedLeaves
 * @param {Array<ColDef|ColGroupDef>} defs
 * @param {OpenState} [openState]
 * @param {(field: string) => 'left'|'right'|null|undefined} [getPin]
 */
export function groupRowsForOrderedLeaves(
    orderedLeaves,
    defs,
    openState = {},
    getPin = () => null,
) {
    const depth = maxGroupDepth(defs);
    const paths = orderedLeaves.map((leaf) =>
        groupPathToField(defs, leaf.field ?? leaf.colId, openState),
    );
    const pins = orderedLeaves.map((leaf) => getPin(leafField(leaf)) || null);
    /** @type {HeaderSeg[][]} */
    const groupRows = [];
    for (let d = 0; d < depth; d++) {
        /** @type {HeaderSeg[]} */
        const segs = [];
        let i = 0;
        while (i < orderedLeaves.length) {
            const group = paths[i]?.[d];
            const pin = pins[i];
            if (!group) {
                segs.push({
                    kind: "pad",
                    span: 1,
                    field: orderedLeaves[i].field ?? orderedLeaves[i].colId,
                    pin,
                });
                i += 1;
                continue;
            }
            let span = 1;
            while (
                i + span < orderedLeaves.length &&
                paths[i + span]?.[d] === group &&
                pins[i + span] === pin
            ) {
                span += 1;
            }
            segs.push({ kind: "group", group, span, pin });
            i += span;
        }
        groupRows.push(segs);
    }
    return groupRows;
}
