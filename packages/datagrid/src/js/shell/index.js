// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — public API                                                        ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

export {
    createColumnTree,
    isColGroupDef,
    visibleLeaves,
} from "./column_tree.js";
export {
    computeHeaderLayout,
    maxGroupDepth,
    countVisibleLeavesInGroup,
} from "./header_layout.js";
export { applyHeaderStyle, headerStyleToCss } from "./header_style.js";
export { createHeaderStack } from "./header_stack.js";
export { createBodyViewport } from "./body_viewport.js";

import { createColumnTree } from "./column_tree.js";
import { createHeaderStack } from "./header_stack.js";
import { createBodyViewport } from "./body_viewport.js";

/**
 * Mount an owned header shell + regular-table body.
 *
 * @param {object} options
 * @param {HTMLElement} options.container
 * @param {Array} options.columnDefs
 * @param {(fields: string[]) => Promise<Record<string, any[]>>|Record<string, any[]>} options.loadColumns
 *        Called with visible leaf field names; returns column-oriented data.
 */
export function createShell({ container, columnDefs, loadColumns }) {
    const columnTree = createColumnTree(columnDefs);
    const root = document.createElement("div");
    root.className = "fg-shell";

    let syncing = false;

    const body = createBodyViewport({
        onScroll(scrollLeft) {
            header.setScrollLeft(scrollLeft);
        },
        onDraw() {
            if (syncing) return;
            const widths = body.measureColumnWidths();
            if (Object.keys(widths).length) {
                header.setColumnWidths(widths);
            }
        },
    });

    const header = createHeaderStack({
        columnTree,
        onLayoutChange: () => {
            void refresh();
        },
    });

    root.append(header.el, body.el);
    container.appendChild(root);

    async function refresh() {
        syncing = true;
        try {
            const fields = header.getLeafFields();
            const cols = await loadColumns(fields);
            const widths = await body.setData(fields, cols);
            header.setColumnWidths(widths);
            header.setScrollLeft(body.scrollLeft);
        } finally {
            syncing = false;
        }
    }

    return {
        el: root,
        columnTree,
        header,
        body,
        refresh,
        destroy() {
            root.remove();
        },
    };
}
