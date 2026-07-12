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
} from "./header_layout.js";
export {
    applyHeaderStyle,
    applyHeaderClass,
    applyColDefHeaderChrome,
    headerStyleToCss,
} from "./header_style.js";
export { createHeaderStack } from "./header_stack.js";
export { createBodyViewport } from "./body_viewport.js";

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
