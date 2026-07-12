// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — column group tree (AG Grid ColDef / ColGroupDef semantics)        ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

/**
 * @typedef {import('./ag_types.js').ColDef} ColDef
 * @typedef {import('./ag_types.js').ColGroupDef} ColGroupDef
 * @typedef {import('./ag_types.js').ColumnGroupShowType} ColumnGroupShowType
 * @typedef {import('./ag_types.js').ColumnGroupStateItem} ColumnGroupStateItem
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
 * Merge AG `defaultColDef` / `defaultColGroupDef` into a def tree (shallow).
 * Group nodes do not inherit leaf-only defaults; leaf nodes do not inherit
 * group-only defaults (`children`, `openByDefault`, …).
 *
 * @param {Array<ColDef|ColGroupDef>} defs
 * @param {ColDef} [defaultColDef]
 * @param {Partial<ColGroupDef>} [defaultColGroupDef]
 * @returns {Array<ColDef|ColGroupDef>}
 */
export function applyColumnDefaults(
    defs,
    defaultColDef = {},
    defaultColGroupDef = {},
) {
    return (defs || []).map((node) => {
        if (isColGroupDef(node)) {
            const { children: _ignore, ...groupDefaults } = defaultColGroupDef;
            return {
                ...groupDefaults,
                ...node,
                children: applyColumnDefaults(
                    node.children,
                    defaultColDef,
                    defaultColGroupDef,
                ),
            };
        }
        return { ...defaultColDef, ...node };
    });
}

/**
 * @param {ColDef|ColGroupDef} child
 * @param {boolean} parentOpen
 */
function childVisibleInParent(child, parentOpen) {
    // AG: omit columnGroupShow ⇒ always shown
    const show = child.columnGroupShow;
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
 * @param {ColGroupDef} group
 * @param {OpenState} openState
 * @param {ColDef[]} out
 */
function collectGroupLeaves(group, openState, out) {
    const open = groupIsOpen(group, openState);
    for (const child of group.children || []) {
        if (!childVisibleInParent(child, open)) {
            continue;
        }
        if (isColGroupDef(child)) {
            collectGroupLeaves(child, openState, out);
        } else if (child?.field != null || child?.colId != null) {
            out.push(child);
        }
    }
}

/**
 * DFS-ordered visible leaf columns (AG `columnGroupShow` vs immediate parent).
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
        } else if (node?.field != null || node?.colId != null) {
            out.push(node);
        }
    }
    return out;
}

/**
 * @param {ColDef} leaf
 * @returns {string}
 */
export function leafField(leaf) {
    return leaf.field ?? leaf.colId ?? "";
}

/**
 * @param {Array<ColDef|ColGroupDef>} defs
 * @param {Map<string, number>} [counters]
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
            openState[id] = node.openByDefault === true;
        }
        seedOpenState(node.children, openState);
    }
}

/**
 * @param {object} [options]
 * @param {Array<ColDef|ColGroupDef>} options.columnDefs
 * @param {ColDef} [options.defaultColDef]
 * @param {Partial<ColGroupDef>} [options.defaultColGroupDef]
 */
export function createColumnTree({
    columnDefs,
    defaultColDef,
    defaultColGroupDef,
} = {}) {
    const withDefaults = applyColumnDefaults(
        columnDefs || [],
        defaultColDef || {},
        defaultColGroupDef || {},
    );
    const root = assignMissingGroupIds(withDefaults);
    /** @type {OpenState} */
    const openState = {};
    seedOpenState(root, openState);

    /** @type {OpenState} */
    const initialOpenState = { ...openState };

    return {
        getDefs() {
            return root;
        },

        /**
         * @param {string} groupId
         */
        isOpen(groupId) {
            return !!openState[groupId];
        },

        /**
         * AG GridApi.setColumnGroupOpened
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
         * AG GridApi.getColumnGroupState
         * @returns {ColumnGroupStateItem[]}
         */
        getColumnGroupState() {
            return Object.keys(openState).map((groupId) => ({
                groupId,
                open: !!openState[groupId],
            }));
        },

        /**
         * AG GridApi.setColumnGroupState
         * @param {ColumnGroupStateItem[]} stateItems
         */
        setColumnGroupState(stateItems) {
            for (const item of stateItems || []) {
                if (
                    item?.groupId &&
                    Object.prototype.hasOwnProperty.call(
                        openState,
                        item.groupId,
                    )
                ) {
                    openState[item.groupId] = !!item.open;
                }
            }
        },

        /** AG GridApi.resetColumnGroupState */
        resetColumnGroupState() {
            for (const id of Object.keys(openState)) {
                openState[id] = !!initialOpenState[id];
            }
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
