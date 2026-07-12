// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — public API (AG Grid–compatible object model)                      ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

export { createGrid } from "./create_grid.js";
export {
    createColumnTree,
    isColGroupDef,
    visibleLeaves,
    leafField,
    applyColumnDefaults,
} from "./column_tree.js";
export {
    computeHeaderLayout,
    maxGroupDepth,
    countVisibleLeavesInGroup,
    groupPathToField,
    groupRowsForOrderedLeaves,
    isGroupExpandable,
} from "./header_layout.js";
export {
    canMoveColumnWithMarryChildren,
    collectMarriedGroups,
    structuralLeavesOfGroup,
} from "./marry_children.js";
export {
    applyHeaderStyle,
    applyHeaderClass,
    applyColDefHeaderChrome,
    headerStyleToCss,
} from "./header_style.js";
export { createHeaderStack } from "./header_stack.js";
export { createBodyViewport } from "./body_viewport.js";
export {
    createColumnState,
    applyColumnStateToData,
} from "./column_state.js";
export {
    toPerspectiveSort,
    toPerspectiveFilter,
    toPerspectiveViewConfig,
} from "./engine_bridge.js";
export {
    AUTO_GROUP_COL_ID,
    extractRowGroupConfig,
    filterDisplayLeaves,
    mapAggFuncToPerspective,
    formatRowPathLabel,
    isRowPathExpandable,
} from "./row_grouping.js";
export {
    createDetailRowModel,
    buildVirtualRowMap,
    detailFilterForPath,
    pathKey,
    isTreeExpandable,
    isDetailExpandable,
    computeStickyGroupEntries,
    splitStickyTopAndBottom,
    stickyTotalLabel,
} from "./detail_row_model.js";
export {
    SELECTION_COL_ID,
    normalizeRowSelection,
    normalizeCellSelection,
    wantsSelectionColumn,
} from "./selection_options.js";
export { createRowSelectionController } from "./row_selection.js";
export { createCellSelectionController } from "./cell_selection.js";
export {
    lucideIcon,
    iconChevronRight,
    iconChevronDown,
    iconArrowUp,
    iconArrowDown,
    iconArrowUpDown,
    iconPin,
    iconPinOff,
    iconGrip,
} from "./icons.js";

import { createGrid } from "./create_grid.js";

/**
 * @deprecated Use `createGrid(container, { columnDefs, loadColumns | rowData })`.
 */
export function createShell({ container, columnDefs, loadColumns, ...rest }) {
    const api = createGrid(container, {
        columnDefs,
        loadColumns,
        ...rest,
    });
    return {
        api,
        el: container.querySelector(".fg-shell"),
        refresh: () => api.refreshCells(),
        destroy: () => api.destroy(),
        get columnTree() {
            return api.getColumnTree();
        },
    };
}
