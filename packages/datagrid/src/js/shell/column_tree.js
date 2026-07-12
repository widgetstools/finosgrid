// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — column group tree + always/open/closed leaf visibility            ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

/**
 * @typedef {'always' | 'open' | 'closed'} ColumnGroupShow
 *
 * @typedef {object} HeaderBorderSide
 * @property {number|string} [width]
 * @property {string} [color]
 * @property {'none'|'solid'|'dashed'|'dotted'|'double'} [style]
 * @property {boolean} [visible]
 *
 * @typedef {object} HeaderStyle
 * @property {string} [fontFamily]
 * @property {string|number} [fontSize]
 * @property {string|number} [fontWeight]
 * @property {'normal'|'italic'|'oblique'} [fontStyle]
 * @property {string} [color]
 * @property {string} [backgroundColor]
 * @property {{ top?: HeaderBorderSide, right?: HeaderBorderSide, bottom?: HeaderBorderSide, left?: HeaderBorderSide }} [border]
 *
 * @typedef {object} ColDef
 * @property {string} field
 * @property {string} [headerName]
 * @property {ColumnGroupShow} [columnGroupShow]
 * @property {HeaderStyle} [headerStyle]
 *
 * @typedef {object} ColGroupDef
 * @property {string} [groupId]
 * @property {string} headerName
 * @property {boolean} [openByDefault]
 * @property {ColumnGroupShow} [columnGroupShow]
 * @property {HeaderStyle} [headerStyle]
 * @property {Array<ColDef|ColGroupDef>} children
 *
 * @typedef {Record<string, boolean>} OpenState
 */

/**
 * @param {ColDef|ColGroupDef|null|undefined} node
 * @returns {node is ColGroupDef}
 */
export function isColGroupDef(node) {
    return Array.isArray(node?.children);
}

/**
 * @param {ColDef|ColGroupDef} child
 * @param {boolean} parentOpen
 */
function childVisibleInParent(child, parentOpen) {
    const show = child.columnGroupShow ?? "always";
    if (show === "always") {
        return true;
    }
    if (show === "open") {
        return parentOpen;
    }
    if (show === "closed") {
        return !parentOpen;
    }
    return true;
}

/**
 * @param {ColGroupDef} group
 * @param {OpenState} openState
 * @param {ColDef[]} out
 */
function collectGroupLeaves(group, openState, out) {
    const id = group.groupId;
    const open =
        id && Object.prototype.hasOwnProperty.call(openState, id)
            ? !!openState[id]
            : group.openByDefault !== false;

    for (const child of group.children || []) {
        if (!childVisibleInParent(child, open)) {
            continue;
        }
        if (isColGroupDef(child)) {
            collectGroupLeaves(child, openState, out);
        } else if (child?.field != null) {
            out.push(child);
        }
    }
}

/**
 * DFS-ordered visible leaf columns for the current open/closed group state.
 * `columnGroupShow` is evaluated against each node's **immediate** parent group
 * (AG Grid semantics).
 *
 * @param {Array<ColDef|ColGroupDef>} defs
 * @param {OpenState} [openState]
 * @returns {ColDef[]}
 */
export function visibleLeaves(defs, openState = {}) {
    /** @type {ColDef[]} */
    const out = [];
    for (const node of defs || []) {
        if (isColGroupDef(node)) {
            collectGroupLeaves(node, openState, out);
        } else if (node?.field != null) {
            out.push(node);
        }
    }
    return out;
}

/**
 * @param {Array<ColDef|ColGroupDef>} defs
 * @param {Map<string, number>} [counters]
 * @returns {Array<ColDef|ColGroupDef>}
 */
function assignMissingGroupIds(defs, counters = new Map()) {
    return (defs || []).map((node) => {
        if (!isColGroupDef(node)) {
            return node;
        }
        let groupId = node.groupId;
        if (!groupId) {
            const base =
                String(node.headerName || "group")
                    .trim()
                    .toLowerCase()
                    .replace(/\s+/g, "-")
                    .replace(/[^a-z0-9_-]/g, "") || "group";
            const n = counters.get(base) || 0;
            counters.set(base, n + 1);
            groupId = n === 0 ? base : `${base}-${n}`;
        }
        return {
            ...node,
            groupId,
            children: assignMissingGroupIds(node.children, counters),
        };
    });
}

/**
 * @param {Array<ColDef|ColGroupDef>} defs
 * @param {OpenState} openState
 */
function seedOpenState(defs, openState) {
    for (const node of defs || []) {
        if (!isColGroupDef(node)) {
            continue;
        }
        const id = node.groupId;
        if (id && !Object.prototype.hasOwnProperty.call(openState, id)) {
            openState[id] = node.openByDefault !== false;
        }
        seedOpenState(node.children, openState);
    }
}

/**
 * Mutable column tree with expand/collapse state.
 *
 * @param {Array<ColDef|ColGroupDef>} defs
 */
export function createColumnTree(defs) {
    const root = assignMissingGroupIds(defs);
    /** @type {OpenState} */
    const openState = {};
    seedOpenState(root, openState);

    return {
        /** @returns {Array<ColDef|ColGroupDef>} */
        getDefs() {
            return root;
        },

        /**
         * @param {string} groupId
         * @returns {boolean}
         */
        isOpen(groupId) {
            return !!openState[groupId];
        },

        /**
         * @param {string} groupId
         * @param {boolean} open
         */
        setOpen(groupId, open) {
            if (!Object.prototype.hasOwnProperty.call(openState, groupId)) {
                return;
            }
            openState[groupId] = !!open;
        },

        /**
         * @param {string} groupId
         * @returns {boolean} new open state
         */
        toggleOpen(groupId) {
            if (!Object.prototype.hasOwnProperty.call(openState, groupId)) {
                return false;
            }
            openState[groupId] = !openState[groupId];
            return openState[groupId];
        },

        /** @returns {OpenState} */
        getOpenState() {
            return { ...openState };
        },

        /**
         * @param {OpenState} next
         */
        setOpenState(next) {
            for (const id of Object.keys(openState)) {
                if (Object.prototype.hasOwnProperty.call(next || {}, id)) {
                    openState[id] = !!next[id];
                }
            }
        },

        /** @returns {ColDef[]} */
        visibleLeaves() {
            return visibleLeaves(root, openState);
        },
    };
}
