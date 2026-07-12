// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — header stack DOM (groups → leaves → floating filters)             ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import { computeHeaderLayout } from "./header_layout.js";
import { applyHeaderStyle } from "./header_style.js";

const DEFAULT_COL_WIDTH = 120;

/**
 * @typedef {import('./column_tree.js').ColDef} ColDef
 */

/**
 * @param {object} options
 * @param {ReturnType<import('./column_tree.js').createColumnTree>} options.columnTree
 * @param {(leaf: ColDef) => void} [options.onFilterInput]
 * @param {() => void} [options.onLayoutChange]
 */
export function createHeaderStack({
    columnTree,
    onFilterInput,
    onLayoutChange,
}) {
    const root = document.createElement("div");
    root.className = "fg-shell__header";
    root.setAttribute("part", "shell-header");

    const groupsEl = document.createElement("div");
    groupsEl.className = "fg-shell__group-rows";

    const leafRow = document.createElement("div");
    leafRow.className = "fg-shell__leaf-row";

    const filterRow = document.createElement("div");
    filterRow.className = "fg-shell__filter-row";

    const leafTrack = document.createElement("div");
    leafTrack.className = "fg-shell__track";
    leafRow.appendChild(leafTrack);

    const filterTrack = document.createElement("div");
    filterTrack.className = "fg-shell__track";
    filterRow.appendChild(filterTrack);

    root.append(groupsEl, leafRow, filterRow);

    /** @type {Map<string, HTMLElement>} */
    const leafCells = new Map();
    /** @type {Map<string, HTMLElement>} */
    const filterCells = new Map();
    /** @type {Map<string, number>} */
    const widths = new Map();

    function leafWidth(field) {
        return widths.get(field) ?? DEFAULT_COL_WIDTH;
    }

    function setScrollLeft(scrollLeft) {
        const x = -Math.max(0, scrollLeft || 0);
        for (const track of root.querySelectorAll(".fg-shell__track")) {
            track.style.transform = `translateX(${x}px)`;
        }
    }

    /**
     * @param {Record<string, number>|Map<string, number>} next
     */
    function setColumnWidths(next) {
        const entries =
            next instanceof Map ? next.entries() : Object.entries(next || {});
        for (const [field, w] of entries) {
            if (typeof w === "number" && w > 0) {
                widths.set(field, w);
            }
        }
        for (const [field, cell] of leafCells) {
            const w = leafWidth(field);
            cell.style.flex = `0 0 ${w}px`;
            cell.style.width = `${w}px`;
        }
        for (const [field, cell] of filterCells) {
            const w = leafWidth(field);
            cell.style.flex = `0 0 ${w}px`;
            cell.style.width = `${w}px`;
        }
        // Re-apply group segment widths from current layout
        rebuildGroupWidths();
    }

    function rebuildGroupWidths() {
        const { groupRows, leaves } = computeHeaderLayout(
            columnTree.getDefs(),
            columnTree.getOpenState(),
        );
        const rowEls = [...groupsEl.querySelectorAll(".fg-shell__group-row")];
        groupRows.forEach((segs, rowIndex) => {
            const row = rowEls[rowIndex];
            if (!row) return;
            const track = row.querySelector(".fg-shell__track");
            if (!track) return;
            let leafIndex = 0;
            const cells = [...track.children];
            segs.forEach((seg, i) => {
                const cell = cells[i];
                if (!cell) return;
                let w = 0;
                for (let k = 0; k < seg.span; k++) {
                    const leaf = leaves[leafIndex + k];
                    w += leafWidth(leaf?.field);
                }
                leafIndex += seg.span;
                cell.style.flex = `0 0 ${w}px`;
                cell.style.width = `${w}px`;
            });
        });
    }

    function render() {
        const { leaves, groupRows } = computeHeaderLayout(
            columnTree.getDefs(),
            columnTree.getOpenState(),
        );

        groupsEl.replaceChildren();
        for (const segs of groupRows) {
            const row = document.createElement("div");
            row.className = "fg-shell__group-row";
            const track = document.createElement("div");
            track.className = "fg-shell__track";
            let leafIndex = 0;
            for (const seg of segs) {
                const cell = document.createElement("div");
                let w = 0;
                for (let k = 0; k < seg.span; k++) {
                    w += leafWidth(leaves[leafIndex + k]?.field);
                }
                leafIndex += seg.span;
                cell.style.flex = `0 0 ${w}px`;
                cell.style.width = `${w}px`;

                if (seg.kind === "group") {
                    cell.className = "fg-shell__group-cell";
                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = "fg-shell__group-toggle";
                    const open = columnTree.isOpen(seg.group.groupId);
                    btn.textContent = open ? "▼" : "▶";
                    btn.title = open ? "Collapse" : "Expand";
                    btn.setAttribute(
                        "aria-expanded",
                        open ? "true" : "false",
                    );
                    btn.addEventListener("click", (e) => {
                        e.stopPropagation();
                        columnTree.toggleOpen(seg.group.groupId);
                        render();
                        onLayoutChange?.();
                    });
                    const label = document.createElement("span");
                    label.className = "fg-shell__group-label";
                    label.textContent = seg.group.headerName || "";
                    cell.append(btn, label);
                    applyHeaderStyle(cell, seg.group.headerStyle);
                } else {
                    cell.className = "fg-shell__group-pad";
                }
                track.appendChild(cell);
            }
            row.appendChild(track);
            groupsEl.appendChild(row);
        }

        leafTrack.replaceChildren();
        filterTrack.replaceChildren();
        leafCells.clear();
        filterCells.clear();

        for (const leaf of leaves) {
            const w = leafWidth(leaf.field);
            const h = document.createElement("div");
            h.className = "fg-shell__leaf-cell";
            h.dataset.field = leaf.field;
            h.textContent = leaf.headerName || leaf.field;
            h.style.flex = `0 0 ${w}px`;
            h.style.width = `${w}px`;
            applyHeaderStyle(h, leaf.headerStyle);
            leafTrack.appendChild(h);
            leafCells.set(leaf.field, h);

            const f = document.createElement("div");
            f.className = "fg-shell__filter-cell";
            f.dataset.field = leaf.field;
            f.style.flex = `0 0 ${w}px`;
            f.style.width = `${w}px`;
            const input = document.createElement("input");
            input.className = "fg-shell__filter-input";
            input.type = "text";
            input.placeholder = "Filter…";
            input.setAttribute(
                "aria-label",
                `Filter ${leaf.headerName || leaf.field}`,
            );
            input.addEventListener("input", () => {
                onFilterInput?.(leaf, input.value);
            });
            f.appendChild(input);
            filterTrack.appendChild(f);
            filterCells.set(leaf.field, f);
        }
    }

    render();

    return {
        el: root,
        render,
        setScrollLeft,
        setColumnWidths,
        getLeafFields: () =>
            computeHeaderLayout(
                columnTree.getDefs(),
                columnTree.getOpenState(),
            ).leaves.map((l) => l.field),
    };
}
